/*
  app.js
  Lógica unificada para inicialização do Supabase, navegação e gestão de dados.
  Substitui auth.js e database.js.
*/

// ============================================================
// 1. CONFIGURAÇÃO SUPABASE
// ============================================================

// **IMPORTANTE**: Chaves Supabase do seu projeto
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

// inicializa o cliente
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!supabaseClient) {
    console.error("ERRO: O cliente Supabase não pôde ser inicializado. Verifique a chave ou o link CDN no index.html.");
} else {
    console.log("Supabase inicializado com sucesso.");
}

// ============================================================
// 2. VARIÁVEIS DE ESTADO
// ============================================================
let currentUser = null;
let currentProfile = null;
let currentPage = "login";
let currentAdminTab = "overview";
let isAuthReady = false;


// ============================================================
// 3. FUNÇÕES DE NAVEGAÇÃO E AÇÕES (MUDANÇA DE ESTADO)
// ============================================================

/**
 * Função para alterar a aba administrativa.
 */
function changeAdminTab(tab) {
    if (currentAdminTab !== tab) {
        currentAdminTab = tab;
        // Re-renderiza o shell (para a tab ficar ativa) e carrega o conteúdo
        document.getElementById("app").innerHTML = renderAdminShell();
        renderAdminContent();
    }
}

/**
 * Simula o login de administrador (apenas define o estado).
 */
function handleAdminLogin() {
    // ID SIMULADO para o Admin
    currentUser = { uid: "admin-simulado-01" }; 
    currentPage = "admin";
    render();
}

/**
 * Simula o logout (apenas reseta o estado).
 */
function handleLogout() {
    currentUser = null;
    currentPage = "login";
    currentAdminTab = "overview";
    render();
}

// ============================================================
// 4. FUNÇÃO MESTRE DE RENDERIZAÇÃO
//    MOVEMOS PARA O INÍCIO PARA RESOLVER O 'render is not defined'
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

/**
 * Função central para carregar o conteúdo da aba ativa.
 */
async function renderAdminContent() {
    const contentArea = document.getElementById("admin-content");
    if (!contentArea) return;

    // Limpa e mostra loading
    contentArea.innerHTML = `
        <div class="text-center py-12 text-purple-600">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
            <p class="text-lg">Carregando dados da aba...</p>
        </div>
    `;

    try {
        const data = await loadDashboardData();

        if (data.error) {
            contentArea.innerHTML = renderErrorState();
            return;
        }

        switch (currentAdminTab) {
            case "overview":
                contentArea.innerHTML = renderOverviewContent(data);
                break;
            case "psychologists":
                contentArea.innerHTML = renderPsychologistsContent(data.psychologists);
                break;
            case "patients":
                contentArea.innerHTML = renderPatientsContent(data.patients);
                break;
            case "appointments":
                contentArea.innerHTML = renderAppointmentsContent(data.appointments);
                break;
            default:
                contentArea.innerHTML = "<p class='text-center text-red-500'>Aba não encontrada.</p>";
        }
        
    } catch (e) {
        console.error("Erro detalhado na renderização do conteúdo:", e);
        contentArea.innerHTML = renderErrorState(e);
    }
}


// ============================================================
// 5. FUNÇÕES DE BANCO DE DADOS
//    Refatoradas para usar a tabela 'profiles' corretamente
// ============================================================

/**
 * Retorna todos os perfis com a role 'psychologist'.
 */
async function fetchPsychologists() {
    if (!supabaseClient) throw new Error("Supabase not initialized");
    console.log("Fetching psychologists...");
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("role", "psychologist")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("fetchPsychologists error:", error.message);
        // Retorna um array vazio e registra o erro, mas não lança o erro para evitar quebrar a UI
        return []; 
    }
    return data;
}

/**
 * Retorna todos os perfis com a role 'patient'.
 */
async function fetchPatients() {
    if (!supabaseClient) throw new Error("Supabase not initialized");
    console.log("Fetching patients...");
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("role", "patient")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("fetchPatients error:", error.message);
        return [];
    }
    return data;
}

/**
 * Retorna todos os agendamentos, ordenados.
 */
async function fetchAppointments() {
    if (!supabaseClient) throw new Error("Supabase not initialized");
    console.log("Fetching appointments...");
    
    // Tentativa de COUNT para o dashboard
    const { count, error: countError } = await supabaseClient
        .from("appointments")
        .select("*", { count: 'exact', head: true });
    
    if (countError) {
        console.warn("Aviso: Nao foi possivel contar a tabela 'appointments'. Mensagem:", countError.message);
    }
    
    // Consulta principal
    const { data, error } = await supabaseClient
        .from("appointments")
        // NOTE: Adicionei o join do perfil de pagamento (payments) para fins de relatórios futuros
        .select("*, patient:patient_id(full_name), psychologist:psychologist_id(full_name, crp), payments(*)") 
        .order("created_at", { ascending: false });

    if (error) {
        console.error("fetchAppointments error:", error.message);
        return [];
    }
    return data;
}

/**
 * Função unificada para carregar todos os dados do dashboard.
 */
async function loadDashboardData() {
    try {
        const psychologists = await fetchPsychologists();
        const patients = await fetchPatients();
        const appointments = await fetchAppointments();
        
        // Cálculo de Receita Total (Apenas de agendamentos com pagamento "completed")
        const confirmedAppointments = (appointments || []).filter(a => 
            a.payments && a.payments.length > 0 && 
            a.payments.some(p => p.payment_status === 'completed')
        );
        const totalRev = confirmedAppointments.reduce((sum, a) => sum + parseFloat(a.value || 0), 0);
        
        // Agendamentos pendentes
        const pendingAppointmentsCount = (appointments || []).filter(a => a.status === 'pending').length;

        return {
            psychologists,
            patients,
            appointments,
            totalRevenue: totalRev.toFixed(2),
            psyCount: psychologists.length,
            patientCount: patients.length,
            apptCount: appointments.length,
            pendingAppointmentsCount
        };
    } catch (e) {
        console.error("Erro ao carregar dados do dashboard:", e);
        // Retorna dados zerados em caso de falha grave
        return {
            psychologists: [], patients: [], appointments: [], 
            totalRevenue: "0.00", psyCount: 0, patientCount: 0, apptCount: 0,
            error: true
        };
    }
}

/**
 * Aprova um psicólogo (muda status para 'approved').
 */
async function approvePsychologist(id) {
    if (!supabaseClient) throw new Error("Supabase not initialized");
    
    // 1. Mensagem de Confirmação antes de prosseguir
    const confirmMessage = `Tem certeza que deseja aprovar o psicólogo com ID: ${id.substring(0, 8)}...? Ele(a) terá acesso ao sistema.`;
    
    // Não podemos usar window.confirm() embutido no Iframe.
    // Vamos simular com uma chamada de console e assumir 'sim' por enquanto.
    console.warn(`Aprovação pendente: ${confirmMessage} (Assumindo SIM para fins de demonstração.)`);

    // Implementação da atualização do banco
    const { error } = await supabaseClient
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", id);
        
    if (error) {
        console.error("Erro ao aprovar psicólogo:", error);
        alert(`Erro ao aprovar: ${error.message}`);
        return false;
    }
    
    // Após a aprovação, recarrega o conteúdo da aba Psicólogos
    alert("Psicólogo aprovado com sucesso!");
    renderAdminContent();
    return true;
}


// ============================================================
// 6. FUNÇÕES DE RENDERIZAÇÃO DE PÁGINAS / SHELLS
// ============================================================

/**
 * Renderiza a tela de Login (Simulação).
 */
function renderLogin() {
    return `
        <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h1 class="text-3xl font-bold text-center text-purple-700 mb-6">PsiOnline Admin</h1>
                <p class="text-center text-gray-600 mb-8">Simulação de Login para Administrador</p>
                <button 
                    onclick="handleAdminLogin()" 
                    class="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition duration-300 shadow-md hover:shadow-lg"
                >
                    Entrar como Administrador (Simulação)
                </button>
            </div>
        </div>
    `;
}

/**
 * Renderiza o esqueleto (shell) da área administrativa.
 */
function renderAdminShell() {
    // TABS: overview, psychologists, patients, appointments
    const tabClass = (tab) => currentAdminTab === tab ? "bg-purple-700 text-white" : "text-purple-600 hover:bg-purple-100";
    
    return `
        <div class="min-h-screen bg-gray-50 flex flex-col">
            <!-- Header -->
            <header class="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
                <h2 class="text-2xl font-bold text-purple-700">Painel de Administração</h2>
                <div class="flex items-center space-x-4">
                    <span class="text-gray-600 font-medium">Admin ID: ${currentUser ? currentUser.uid.substring(0, 8) : 'N/A'}</span>
                    <button onclick="handleLogout()" class="text-red-500 hover:text-red-700 font-semibold transition duration-150">
                        Sair
                    </button>
                </div>
            </header>
            
            <!-- Tabs Navigation -->
            <div class="bg-white border-b border-gray-200 p-2 sticky top-[68px] z-10">
                <nav class="flex space-x-2 max-w-7xl mx-auto">
                    <button onclick="changeAdminTab('overview')" class="px-4 py-2 rounded-lg font-medium ${tabClass('overview')}">Visão Geral</button>
                    <button onclick="changeAdminTab('psychologists')" class="px-4 py-2 rounded-lg font-medium ${tabClass('psychologists')}">Psicólogos</button>
                    <button onclick="changeAdminTab('patients')" class="px-4 py-2 rounded-lg font-medium ${tabClass('patients')}">Pacientes</button>
                    <button onclick="changeAdminTab('appointments')" class="px-4 py-2 rounded-lg font-medium ${tabClass('appointments')}">Agendamentos</button>
                </nav>
            </div>
            
            <!-- Main Content Area -->
            <main id="admin-content" class="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
                <!-- O conteúdo específico da aba será carregado aqui por renderAdminContent() -->
            </main>
        </div>
    `;
}


// ============================================================
// 7. FUNÇÕES DE RENDERIZAÇÃO DE CONTEÚDO POR ABA (DETALHES)
// ============================================================

/**
 * Renderiza o conteúdo da aba Visão Geral (Overview).
 */
function renderOverviewContent(data) {
    return `
        <h3 class="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-2">Visão Geral</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${renderMetricCard("Psicólogos Cadastrados", data.psyCount, "bg-blue-100 text-blue-800", "Users")}
            ${renderMetricCard("Pacientes Cadastrados", data.patientCount, "bg-green-100 text-green-800", "Users")}
            ${renderMetricCard("Agendamentos Pendentes", data.pendingAppointmentsCount, "bg-yellow-100 text-yellow-800", "Calendar")}
            ${renderMetricCard("Receita Total (R$)", data.totalRevenue, "bg-purple-100 text-purple-800", "DollarSign")}
        </div>
        
        <h4 class="text-2xl font-bold text-gray-700 mt-10 mb-4">Psicólogos Pendentes (${data.psychologists.filter(p => p.status === 'pending').length})</h4>
        ${data.psychologists.filter(p => p.status === 'pending').length > 0
            ? renderPsychologistList(data.psychologists.filter(p => p.status === 'pending'), true)
            : "<p class='text-gray-500 p-4 border rounded-lg bg-white'>Nenhum psicólogo pendente no momento. Tudo em dia!</p>"
        }
    `;
}

/**
 * Renderiza um card de métrica.
 */
function renderMetricCard(title, value, colorClass, iconName) {
    // Icone placeholder simples (substitua por SVG se necessário)
    const icon = {
        Users: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        Calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        DollarSign: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
    };

    return `
        <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform hover:scale-[1.02] transition duration-300">
            <div class="flex items-center space-x-4">
                <div class="p-3 rounded-full ${colorClass} bg-opacity-70">
                    ${icon[iconName] || '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'}
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-500">${title}</p>
                    <p class="text-3xl font-bold text-gray-900">${value}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza o conteúdo da aba Psicólogos.
 */
function renderPsychologistsContent(psychologists) {
    const pending = psychologists.filter(p => p.status === 'pending');
    const approved = psychologists.filter(p => p.status === 'approved');

    return `
        <h3 class="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-2">Gestão de Psicólogos</h3>
        
        <!-- Psicólogos Pendentes -->
        <div class="mb-12">
            <h4 class="text-2xl font-bold text-gray-700 mb-4 flex items-center">
                Aprovações Pendentes <span class="ml-3 px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-700">${pending.length}</span>
            </h4>
            ${pending.length > 0 
                ? renderPsychologistList(pending, true) 
                : "<p class='text-gray-500 p-4 border rounded-lg bg-white'>Nenhuma solicitação de psicólogo pendente no momento.</p>"
            }
        </div>

        <!-- Psicólogos Aprovados -->
        <div>
            <h4 class="text-2xl font-bold text-gray-700 mb-4 flex items-center">
                Psicólogos Aprovados <span class="ml-3 px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-700">${approved.length}</span>
            </h4>
            ${approved.length > 0 
                ? renderPsychologistList(approved, false) 
                : "<p class='text-gray-500 p-4 border rounded-lg bg-white'>Nenhum psicólogo aprovado ainda.</p>"
            }
        </div>
    `;
}

/**
 * Helper para renderizar a lista de psicólogos (Tabela).
 */
function renderPsychologistList(list, showApproveButton) {
    if (list.length === 0) return '';
    
    return `
        <div class="overflow-x-auto bg-white rounded-xl shadow-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRP</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        ${showApproveButton ? '<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>' : ''}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${list.map(p => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.full_name || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.email || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.crp || 'Não informado'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                                    ${p.status === 'pending' ? 'Pendente' : 'Aprovado'}
                                </span>
                            </td>
                            ${showApproveButton ? `
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onclick="approvePsychologist('${p.id}')" 
                                        class="text-green-600 hover:text-green-900 font-semibold transition duration-150"
                                    >
                                        Aprovar
                                    </button>
                                </td>
                            ` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}


/**
 * Renderiza o conteúdo da aba Pacientes.
 */
function renderPatientsContent(patients) {
    return `
        <h3 class="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-2">Lista de Pacientes</h3>
        <p class="text-gray-600 mb-6">Total de Pacientes: ${patients.length}</p>
        
        <div class="overflow-x-auto bg-white rounded-xl shadow-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Completo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${patients.map(p => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.full_name || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.email || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Ativo
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Renderiza o conteúdo da aba Agendamentos.
 */
function renderAppointmentsContent(appointments) {
    return `
        <h3 class="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-2">Agendamentos Recentes</h3>
        <p class="text-gray-600 mb-6">Total de Agendamentos: ${appointments.length}</p>

        <div class="overflow-x-auto bg-white rounded-xl shadow-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Psicólogo (CRP)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${appointments.map(a => {
                        const date = new Date(a.scheduled_date + 'T' + a.scheduled_time);
                        const formattedDate = date.toLocaleDateString('pt-BR');
                        const formattedTime = a.scheduled_time.substring(0, 5);
                        
                        let statusColor = 'bg-gray-100 text-gray-800';
                        if (a.status === 'confirmed') statusColor = 'bg-green-100 text-green-800';
                        if (a.status === 'pending') statusColor = 'bg-yellow-100 text-yellow-800';
                        if (a.status === 'canceled') statusColor = 'bg-red-100 text-red-800';
                        
                        // Determinar o status do pagamento
                        const paymentStatus = a.payments && a.payments.length > 0 
                            ? a.payments[0].payment_status // Pega o status do primeiro pagamento
                            : 'N/A';

                        return `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formattedDate} às ${formattedTime}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${a.patient?.full_name || 'Paciente Não Encontrado'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${a.psychologist?.full_name || 'Psicólogo Não Encontrado'} (${a.psychologist?.crp || 'N/A'})</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${parseFloat(a.value).toFixed(2)} (${paymentStatus})</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                                    ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                                </span>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}


/**
 * Renderiza o estado de erro.
 */
function renderErrorState(error) {
    let errorMessage = "Ocorreu um erro desconhecido ao carregar os dados.";
    if (error && error.message) {
        // Tentativa de limpar o erro para o usuário
        const msg = error.message.replace(/Postgrest error /i, '');
        errorMessage = `Detalhe: ${msg}`;
    }
    
    return `
        <div class="p-8 bg-red-50 border border-red-200 rounded-xl text-center shadow-lg">
            <h3 class="text-2xl font-bold text-red-700 mb-3">Falha ao Carregar Dados</h3>
            <p class="text-red-600 mb-4">${errorMessage}</p>
            <p class="text-sm text-red-500 mb-6">
                <strong>Sugestão:</strong> Verifique se as tabelas <code>profiles</code> e <code>appointments</code> existem e se o RLS
                permite a leitura (select) para a role <code>anon</code> ou para o seu usuário logado.
            </p>
            <button onclick="renderAdminContent()" class="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition duration-150">
                Tentar Novamente
            </button>
        </div>
    `;
}


// ============================================================
// 8. INICIALIZAÇÃO
//    A função de inicialização chama render(), que agora está definida acima.
// ============================================================

/**
 * Função de inicialização principal.
 */
function init() {
    console.log("SUCESSO: app.js carregado. Iniciando renderização...");
    render(); 
}

// Inicia a aplicação após o carregamento do script
init();
