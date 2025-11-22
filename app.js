/*
  app.js
  Lógica unificada para inicialização do Supabase, navegação e gestão de dados.
  Substitui auth.js e database.js.
*/

// ============================================================
// 1. CONFIGURAÇÃO SUPABASE
// ============================================================

// **IMPORTANTE**: Chaves Supabase do seu projeto
// MANTENHA A CHAVE ANÔNIMA AQUI - ELA PRECISA ESTAR CORRETA
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

// inicializa o cliente (window.supabase vem do CDN no index.html)
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!supabaseClient) {
    console.error("ERRO: O cliente Supabase não pôde ser inicializado.");
} else {
    console.log("Supabase inicializado com sucesso.");
}

// ============================================================
// 2. LÓGICA DE ESTADO E NAVEGAÇÃO
// ============================================================

let currentPage = "login"; // Página atual: 'login' ou 'admin'
let adminTab = "dashboard"; // Aba atual do admin
const authReady = !!supabaseClient; 

/**
 * Altera a página atual e chama a renderização.
 * Torna a função global para uso em onclick.
 * @param {string} page - A página para onde navegar ('login' ou 'admin').
 */
function navigate(page) {
    currentPage = page;
    render();
}

/**
 * Altera a aba ativa do Painel Admin e chama a renderização.
 * Torna a função global para uso em onclick.
 * @param {string} tab - A aba para onde navegar ('dashboard', 'psychologists', 'patients').
 */
function changeAdminTab(tab) {
    adminTab = tab;
    render(); 
}

// Função de login simulada/temporária
function simulateAdminLogin() {
    // Aqui estaria a lógica de verificação de login real.
    // Por enquanto, apenas navega.
    navigate('admin');
}

// ============================================================
// 3. FUNÇÕES DE BUSCA DE DADOS E AÇÕES
// ============================================================

/**
 * Funcao auxiliar para contar linhas, tratando falhas de forma segura.
 */
async function safeCount(tableName) {
    if (!supabaseClient) return 0;
    
    try {
        const { count, error } = await supabaseClient
            .from(tableName)
            .select('*', { count: 'exact', head: true });
            
        // Se houver erro, retorna 0 e loga um aviso (pode ser RLS)
        if (error) {
            console.warn(`Aviso: Nao foi possivel contar a tabela '${tableName}'. Mensagem:`, error.message, error.code);
            return 0;
        }
        return count || 0;
    } catch (e) {
        console.error(`Erro inesperado ao contar a tabela '${tableName}':`, e);
        return 0;
    }
}

async function updateUserStatus(userId, newStatus) {
    if (!supabaseClient) { console.error("Supabase não inicializado."); return; }
    
    // Alerta que a ação de escrita/alteração só funcionará com a chave de administrador/serviço
    console.warn("AVISO: UPDATE/DELETE (admin actions) só funcionará após implementar a Autenticação de Administrador. Ação não executada com ANON_KEY.");

    // Como estamos usando ANON_KEY, simulamos o erro de RLS para UPDATE
    try {
        // Assume que a tabela 'profiles' tem um campo 'status'
        const { error } = await supabaseClient.from('profiles').update({ status: newStatus }).eq('id', userId);
        if (error) throw error;
        await renderAdminContent(); 
    } catch (err) {
        // Se a operação falhar devido a RLS (que é esperado com ANON_KEY), apenas loga e re-renderiza
        if (err.code === '42501' || (err.message && err.message.includes('permission denied'))) {
            console.error('ERRO RLS/Permissão: Tente novamente após implementar o Login Admin. Detalhes:', err.message);
        } else {
             console.error('Erro ao atualizar status:', err.message);
        }
        await renderAdminContent(); 
    }
}

async function deleteUser(userId) {
    if (!supabaseClient) { console.error("Supabase não inicializado."); return; }
    
    // Alerta que a ação de escrita/alteração só funcionará com a chave de administrador/serviço
    console.warn("AVISO: UPDATE/DELETE (admin actions) só funcionará após implementar a Autenticação de Administrador. Ação não executada com ANON_KEY.");

    // Como estamos usando ANON_KEY, simulamos o erro de RLS para DELETE
    try {
        // Assume que a tabela 'profiles' contem todos os usuarios
        const { error } = await supabaseClient.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        await renderAdminContent(); 
    } catch (err) {
        // Se a operação falhar devido a RLS (que é esperado com ANON_KEY), apenas loga e re-renderiza
         if (err.code === '42501' || (err.message && err.message.includes('permission denied'))) {
            console.error('ERRO RLS/Permissão: Tente novamente após implementar o Login Admin. Detalhes:', err.message);
        } else {
             console.error('Erro ao remover usuário:', err.message);
        }
        await renderAdminContent(); 
    }
}


// ============================================================
// 4. LÓGICA DE RENDERIZAÇÃO DE CONTEÚDO (HTML)
// ============================================================

function renderLogin() {
    return `
        <div class="flex items-center justify-center min-h-screen px-4 bg-purple-600">
            <div class="glass shadow-xl rounded-2xl p-8 max-w-md w-full bg-white bg-opacity-90 border border-gray-200">
                <h2 class="text-3xl font-extrabold text-purple-700 text-center mb-6">Psionline Admin</h2>
                <p class="text-center text-gray-500 mb-6">Acesso restrito ao painel de gestão.</p>
                <input type="text" placeholder="Usuário Admin" id="admin-email"
                    class="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition duration-150">
                <input type="password" placeholder="Senha" id="admin-password"
                    class="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition duration-150">
                <button onclick="simulateAdminLogin()"
                    class="w-full bg-purple-600 text-white p-3 rounded-lg font-semibold shadow-lg hover:bg-purple-700 transition-all transform hover:scale-[1.01]">
                    Entrar no Painel
                </button>
            </div>
        </div>
    `;
}

function renderAdminShell() {
    const tabButtons = ['dashboard', 'psychologists', 'patients']
        .map(tab => {
            const labels = { 'dashboard': 'Visão Geral', 'psychologists': 'Psicólogos', 'patients': 'Pacientes' };
            const isActive = adminTab === tab;
            
            return `
            <button onclick="changeAdminTab('${tab}')"
                class="px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm whitespace-nowrap
                ${isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'}">
                ${labels[tab]}
            </button>
            `;
        }).join('');

    return `
        <div class="min-h-screen flex flex-col">
            <!-- Cabeçalho -->
            <header class="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
                <h1 class="text-xl font-bold text-gray-800">Painel Administrativo</h1>
                <button onclick="navigate('login')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all">
                    Sair
                </button>
            </header>

            <!-- Menu de Abas -->
            <nav class="bg-gray-100 p-4 border-b border-gray-200 overflow-x-auto">
                <div class="flex gap-4 max-w-7xl mx-auto">
                    ${tabButtons}
                </div>
            </nav>

            <!-- Conteúdo Principal -->
            <main id="admin-main-content" class="flex-grow p-6 bg-gray-50">
                <div class="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6 min-h-[400px]">
                    <div id="dynamic-content">
                        <!-- Loader inicial -->
                        <div class="flex justify-center items-center h-64">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
}

// ============================================================
// 5. RENDERIZAÇÃO DE CONTEÚDO DINÂMICO POR ABA
// ============================================================

async function getDashboardOverviewHTML() {
    if (!supabaseClient) return "<div>Erro: Supabase não carregado.</div>";
    
    // Busca todos os perfis e a contagem de agendamentos
    const [profilesResult, totalAppointments] = await Promise.all([
        supabaseClient.from('profiles').select('*'),
        safeCount('appointments')
    ]);

    if (profilesResult.error) throw profilesResult.error;
    
    const profiles = profilesResult.data || [];

    const psychs = profiles.filter(p => p.role === 'psychologist').length;
    const patients = profiles.filter(p => p.role === 'patient').length;
    const pending = profiles.filter(p => p.role === 'psychologist' && p.status === 'pending').length; 

    return `
        <h2 class="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Visão Geral do Sistema</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center shadow-sm transition hover:shadow-lg">
                <div class="text-blue-500 font-semibold mb-1">Total de Psicólogos</div>
                <div class="text-4xl font-extrabold text-blue-700">${psychs}</div>
            </div>
            <div class="bg-orange-50 p-6 rounded-xl border border-orange-100 text-center shadow-sm transition hover:shadow-lg">
                <div class="text-orange-500 font-semibold mb-1">Aguardando Aprovação</div>
                <div class="text-4xl font-extrabold text-orange-700">${pending}</div>
            </div>
            <div class="bg-green-50 p-6 rounded-xl border border-green-100 text-center shadow-sm transition hover:shadow-lg">
                <div class="text-green-500 font-semibold mb-1">Total de Pacientes</div>
                <div class="text-4xl font-extrabold text-green-700">${patients}</div>
            </div>
            <div class="bg-purple-50 p-6 rounded-xl border border-purple-100 text-center shadow-sm transition hover:shadow-lg">
                <div class="text-purple-500 font-semibold mb-1">Total de Sessões</div>
                <div class="text-4xl font-extrabold text-purple-700">${totalAppointments}</div>
            </div>
        </div>
    `;
}

async function getPsychologistsListHTML() {
    if (!supabaseClient) return "<div>Erro: Supabase não carregado.</div>";
    
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
                    <button onclick="updateUserStatus('${psi.id}', 'approved')" class="p-2 text-green-600 hover:bg-green-50 rounded transition duration-150" title="Aprovar">✅</button>
                    <button onclick="updateUserStatus('${psi.id}', 'blocked')" class="p-2 text-orange-600 hover:bg-orange-50 rounded transition duration-150" title="Bloquear">🚫</button>
                    <button onclick="deleteUser('${psi.id}')" class="p-2 text-red-600 hover:bg-red-50 rounded transition duration-150" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <h2 class="text-xl font-bold text-gray-800 mb-4">Gestão de Psicólogos (${psis.length})</h2>
        <div class="overflow-x-auto border rounded-lg shadow-sm">
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
    if (!supabaseClient) return "<div>Erro: Supabase não carregado.</div>";

    const { data: patients, error } = await supabaseClient
        .from('profiles').select('*').eq('role', 'patient').order('created_at', { ascending: false });
    if (error) throw error;

    if (!patients.length) return '<div class="p-8 text-center text-gray-500">Nenhum paciente encontrado.</div>';

    const rows = patients.map(p => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-4"><div class="font-semibold">${p.full_name || 'Sem Nome'}</div><div class="text-xs text-gray-500">${p.email}</div></td>
            <td class="p-4 text-gray-600">${p.phone || '-'}</td>
            <td class="p-4">
                <button onclick="deleteUser('${p.id}')" class="p-2 text-red-600 hover:bg-red-50 rounded transition duration-150" title="Excluir">🗑️</button>
            </td>
        </tr>
    `).join('');

    return `
        <h2 class="text-xl font-bold text-gray-800 mb-4">Lista de Pacientes (${patients.length})</h2>
        <div class="overflow-x-auto border rounded-lg shadow-sm">
            <table class="w-full text-left">
                <thead class="bg-gray-50 text-xs uppercase text-gray-600 border-b">
                    <tr><th class="p-4 font-semibold">Paciente</th><th class="p-4 font-semibold">Telefone</th><th class="p-4 font-semibold">Ações</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}


/**
 * Função mestre para carregar o conteúdo da aba Admin dinamicamente.
 */
async function renderAdminContent() {
    const container = document.getElementById('admin-main-content')?.querySelector('#dynamic-content'); 
    if (!container) return;

    // Exibe o loader
    container.innerHTML = `
        <div class="flex justify-center items-center h-64" id="admin-content-loader">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
    `;
    
    try {
        let contentHTML = '';

        if (!authReady || !supabaseClient) {
            throw new Error("Sistema Supabase não inicializado. Verifique a configuração.");
        }

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
                contentHTML = "<p class='p-8 text-center text-gray-500'>Aba de gestão desconhecida.</p>";
        }

        container.innerHTML = contentHTML;

    } catch (error) {
        console.error("Erro detalhado na renderização do conteúdo:", error);
        
        let errorMessage = error.message;
        let suggestion = `
            <strong>Sugestão:</strong> Para solucionar, você precisa executar o script SQL no Supabase para criar políticas RLS que permitam a leitura para usuários anônimos e autenticados.
        `;

        // 42P01: Tabela/coluna não existe
        if (error.code === '42P01') {
            errorMessage = "Tabela 'profiles' ou 'appointments' não existe. Verifique o nome das tabelas no Supabase.";
            suggestion = `
                Verifique se as tabelas <code>profiles</code> e <code>appointments</code> existem
                exatamente com esses nomes no Supabase.
            `;
        }
        // 42501: Erro de Permissão (RLS)
        else if (error.code === '42501' || (error.message && error.message.includes('permission denied'))) {
            errorMessage = "Erro de permissão (RLS). O acesso anônimo está bloqueado.";
            suggestion = `
                Verifique se o <strong>Row Level Security (RLS)</strong> está ativado e se você criou as políticas
                de <code>SELECT</code> (leitura) para as roles <code>anon</code> e <code>authenticated</code>
                nas tabelas <code>profiles</code> e <code>appointments</code>.
            `;
        }
        // PGRST301: Erro genérico do PostgREST, muitas vezes RLS
        else if (error.code === 'PGRST301') {
             errorMessage = "Erro de servidor (500). Provavelmente erro de RLS ou configuração.";
        }


        container.innerHTML = `
            <div class="text-center p-8 border-2 border-red-300 rounded-xl bg-red-50 shadow-md">
                <h3 class="font-bold text-red-700 text-xl mb-3">❌ Erro ao Carregar Dados</h3>
                <p class="text-gray-700 mb-4 font-mono text-sm">Código/Mensagem: ${error.code || 'N/A'} - ${errorMessage}</p>
                <p class="text-sm text-gray-500 mb-4">
                    ${suggestion}
                </p>
                <button onclick="renderAdminContent()" class="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition duration-150">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}


// ============================================================
// 6. FUNÇÃO MESTRE DE RENDERIZAÇÃO
// ============================================================

/**
 * Função principal que decide qual página renderizar.
 */
function render() {
    const app = document.getElementById("app");
    
    if (currentPage === "login") {
        app.innerHTML = renderLogin();
        return;
    }

    if (currentPage === "admin") {
        // 1. Renderiza o esqueleto (shell) da página Admin
        app.innerHTML = renderAdminShell();
        
        // 2. Chama a função assíncrona para carregar o conteúdo da aba
        renderAdminContent();
        return;
    }

    app.innerHTML = "<p class='p-10 text-center'>Página desconhecida.</p>";
}

// Inicialização: Chama a função render() assim que o script é carregado
// Adicionada aqui para garantir que o painel seja exibido após o login simulado
window.onload = function() {
    render();
}esconhecida.</p>";
}

