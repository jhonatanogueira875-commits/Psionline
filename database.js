/*
  database.js
  Simple database helpers that use supabaseClient from auth.js
  These functions are intentionally simple and make extra requests
  so they work with common Supabase schemas (profiles + content tables).

  IMPORTANT: This file now contains the main rendering logic for the Admin Panel content.
  It relies on global state (adminTab, authReady, supabaseClient) defined in auth.js.
*/

// ============================================================
// FUNÇÕES DE BUSCA DE DADOS (ABAS)
// ============================================================

async function fetchAllProfiles() {
    if (!supabaseClient) throw new Error("Sistema não inicializado (supabaseClient ausente).");
    const { data, error } = await supabaseClient.from('profiles').select('*');
    if (error) throw error;
    return data || [];
}

async function getDashboardOverviewHTML() {
    // Busca os dados necessários para o dashboard (Count é mais eficiente)
    const [profilesResult, appointmentsResult] = await Promise.all([
        // Busca todos os perfis
        supabaseClient.from('profiles').select('*'),
        // Tenta buscar o count de appointments. Se a tabela não existe, pode falhar.
        // Usamos catch para não quebrar o app se a tabela 'appointments' não existir
        supabaseClient.from('appointments').select('*', { count: 'exact', head: true })
            .catch(() => ({ count: 0 }))
    ]);

    if (profilesResult.error) throw profilesResult.error;
    
    const profiles = profilesResult.data || [];

    const psychs = profiles.filter(p => p.role === 'psychologist').length;
    const patients = profiles.filter(p => p.role === 'patient').length;
    const pending = profiles.filter(p => p.role === 'psychologist' && p.status === 'pending').length;
    const totalAppointments = appointmentsResult.count || 0; 

    return `
        <h2 class="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Visão Geral do Sistema</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <!-- Card Psicólogos -->
            <div class="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center shadow-sm">
                <div class="text-blue-500 font-semibold mb-1">Total de Psicólogos</div>
                <div class="text-3xl font-bold text-blue-700">${psychs}</div>
            </div>

            <!-- Card Pendentes -->
            <div class="bg-orange-50 p-6 rounded-xl border border-orange-100 text-center shadow-sm">
                <div class="text-orange-500 font-semibold mb-1">Aguardando Aprovação</div>
                <div class="text-3xl font-bold text-orange-700">${pending}</div>
            </div>

            <!-- Card Pacientes -->
            <div class="bg-green-50 p-6 rounded-xl border border-green-100 text-center shadow-sm">
                <div class="text-green-500 font-semibold mb-1">Total de Pacientes</div>
                <div class="text-3xl font-bold text-green-700">${patients}</div>
            </div>

            <!-- Card Consultas -->
            <div class="bg-purple-50 p-6 rounded-xl border border-purple-100 text-center shadow-sm">
                <div class="text-purple-500 font-semibold mb-1">Total de Sessões</div>
                <div class="text-3xl font-bold text-purple-700">${totalAppointments}</div>
            </div>
        </div>
    `;
}

async function getPsychologistsListHTML() {
    const { data: psis, error } = await supabaseClient
        .from('profiles').select('*').eq('role', 'psychologist').order('created_at', { ascending: false });
    if (error) throw error;

    if (!psis.length) return '<div class="p-8 text-center text-gray-500">Nenhum psicólogo encontrado.</div>';

    const rows = psis.map(psi => {
        const st = psi.status || 'pending'; 
        const badges = { 'approved': 'bg-green-100 text-green-800', 'pending': 'bg-orange-100 text-orange-800', 'blocked': 'bg-red-100 text-red-800' };
        const labels = { 'approved': 'Aprovado', 'pending': 'Pendente', 'blocked': 'Bloqueado' };
        
        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-4"><div class="font-semibold">${psi.full_name || 'Sem Nome'}</div><div class="text-xs text-gray-500">${psi.email}</div></td>
                <td class="p-4 text-sm">${psi.crp || 'N/A'}</td>
                <td class="p-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${badges[st]}">${labels[st]}</span></td>
                <td class="p-4 flex gap-2">
                    <button onclick="updateUserStatus('${psi.id}', 'approved')" class="p-2 text-green-600 hover:bg-green-50 rounded" title="Aprovar">✅</button>
                    <button onclick="updateUserStatus('${psi.id}', 'blocked')" class="p-2 text-orange-600 hover:bg-orange-50 rounded" title="Bloquear">🚫</button>
                    <button onclick="deleteUser('${psi.id}')" class="p-2 text-red-600 hover:bg-red-50 rounded" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <h2 class="text-xl font-bold text-gray-800 mb-4">Gestão de Psicólogos (${psis.length})</h2>
        <div class="overflow-x-auto border rounded-lg">
            <table class="w-full text-left">
                <thead class="bg-gray-50 text-xs uppercase text-gray-600 border-b">
                    <tr><th class="p-4 font-semibold">Profissional</th><th class="p-4 font-semibold">CRP</th><th class="p-4 font-semibold">Status</th><th class="p-4 font-semibold">Ações</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

async function getPatientsListHTML() {
    const { data: patients, error } = await supabaseClient
        .from('profiles').select('*').eq('role', 'patient').order('created_at', { ascending: false });
    if (error) throw error;

    if (!patients.length) return '<div class="p-8 text-center text-gray-500">Nenhum paciente encontrado.</div>';

    const rows = patients.map(p => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-4"><div class="font-semibold">${p.full_name || 'Sem Nome'}</div><div class="text-xs text-gray-500">${p.email}</div></td>
            <td class="p-4 text-gray-600">${p.phone || '-'}</td>
            <td class="p-4">
                <button onclick="deleteUser('${p.id}')" class="text-red-500 text-sm font-semibold hover:underline">Remover Cadastro</button>
            </td>
        </tr>
    `).join('');

    return `
        <h2 class="text-xl font-bold text-gray-800 mb-4">Lista de Pacientes (${patients.length})</h2>
        <div class="overflow-x-auto border rounded-lg">
            <table class="w-full text-left">
                <thead class="bg-gray-50 text-xs uppercase text-gray-600 border-b">
                    <tr><th class="p-4 font-semibold">Paciente</th><th class="p-4 font-semibold">Telefone</th><th class="p-4 font-semibold">Ações</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

// ============================================================
// 5. CARREGAMENTO DE CONTEÚDO (Assíncrono)
// A função mestre para carregar o conteúdo da aba
// ============================================================
async function renderAdminContent() {
    const container = document.getElementById('admin-main-content')?.querySelector('div');
    if (!container) return;

    // Exibe o loader antes de carregar o novo conteúdo
    container.innerHTML = `
        <div class="flex justify-center items-center h-64" id="admin-content-loader">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
    `;
    
    try {
        let contentHTML = '';

        if (!authReady || !supabaseClient) {
            throw new Error("Sistema não inicializado. Tente recarregar.");
        }

        // O switch-case é mais limpo que múltiplos if/else
        switch (adminTab) {
            case 'dashboard':
                contentHTML = await getDashboardOverviewHTML();
                break;
            case 'psychologists':
                contentHTML = await getPsychologistsListHTML();
                break;
            case 'patients':
                contentHTML = await getPatientsListHTML();
                break;
            default:
                contentHTML = "<p>Aba desconhecida.</p>";
        }

        container.innerHTML = contentHTML;

    } catch (error) {
        console.error("Erro detalhado:", error);
        
        let errorMessage = error.message;
        // Mapeamento de códigos de erro do PostgreSQL/Supabase
        if (error.code === '42P01') errorMessage = "Tabela 'profiles' não existe. Execute o script SQL no Supabase.";
        else if (error.code === '42703') errorMessage = "Coluna do banco não existe. Execute o script SQL no Supabase.";
        else if (error.code === 'PGRST301' || error.message.includes('permission denied')) errorMessage = "Erro de permissão (RLS). Verifique as políticas de segurança do Supabase.";


        container.innerHTML = `
            <div class="text-center p-8 border-2 border-red-100 rounded-lg bg-red-50">
                <h3 class="font-bold text-red-700 text-lg mb-2">Erro ao carregar dados</h3>
                <p class="text-gray-700 mb-4">${errorMessage}</p>
                <button onclick="renderAdminContent()" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Tentar Novamente</button>
            </div>
        `;
    }
}


// ============================================================
// 7. AÇÕES DO SISTEMA (Aprovar, Bloquear, Deletar)
// ============================================================
// Estes agora devem chamar renderAdminContent() para atualizar a UI

async function updateUserStatus(userId, newStatus) {
    if (!supabaseClient) { console.error("Supabase não inicializado."); return; }
    
    console.log(`Ação: Tentando mudar o status do usuário ${userId} para ${newStatus}`);

    try {
        const { error } = await supabaseClient.from('profiles').update({ status: newStatus }).eq('id', userId);

        if (error) {
            if (error.code === '42703') { 
                console.error("ERRO: A coluna 'status' não existe. Execute o script SQL no Supabase.");
                // Em ambiente real, usaria um modal. Aqui, apenas logamos.
                return;
            }
            throw error;
        }

        console.log('Status atualizado com sucesso!');
        await renderAdminContent(); // Força a atualização da lista
    } catch (err) {
        console.error('Erro ao atualizar:', err.message);
        // Em ambiente real, usaria um modal. Aqui, apenas logamos.
    }
}

async function deleteUser(userId) {
    if (!supabaseClient) { console.error("Supabase não inicializado."); return; }

    console.log(`Ação: Tentando deletar o usuário ${userId}`);

    try {
        const { error } = await supabaseClient.from('profiles').delete().eq('id', userId);

        if (error) throw error;

        console.log('Usuário removido!');
        await renderAdminContent(); // Força a atualização da lista
    } catch (err) {
        console.error('Erro ao remover:', err.message);
        // Em ambiente real, usaria um modal. Aqui, apenas logamos.
    }
}

// Funções utilitárias (podem ser necessárias no app, mas não usadas no admin)
async function createAppointment(patientId, psychologistId, date, time) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  // Implementação de agendamento (mantida para referência)
  return true;
}

async function updateAppointmentStatus(appointmentId, status) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  // Implementação de atualização de status (mantida para referência)
  return true;
}

async function approvePsychologist(id) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  // Implementação de aprovação (mantida para referência)
  return true;
}

async function loadDashboardData() {
    // Esta função não é mais usada diretamente. getDashboardOverviewHTML faz a busca.
    return {};
}
