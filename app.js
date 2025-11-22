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
// 2. ESTADO E NAVEGAÇÃO
// ============================================================

let currentPage = "login"; // 'login' ou 'admin'
let currentAdminTab = "dashboard"; // 'dashboard' ou 'appointments'
let userSession = null;

/**
 * Altera a página atual e renderiza.
 * @param {string} page - A nova página ('login' ou 'admin').
 */
function navigateTo(page) {
    currentPage = page;
    render();
}

/**
 * Atualiza o estado da sessão do usuário.
 * @param {object | null} session - Objeto de sessão do Supabase ou null.
 */
function setUserSession(session) {
    userSession = session;
    if (userSession) {
        // Verifica se o usuário é admin
        // No mundo real, esta verificação viria de um perfil do banco de dados (RLS)
        // Por enquanto, assumimos que quem faz login é o admin.
        navigateTo("admin");
    } else {
        navigateTo("login");
    }
}


// ============================================================
// 3. AUTENTICAÇÃO
// ============================================================

/**
 * Tenta fazer login com e-mail e senha.
 */
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginStatus = document.getElementById('login-status');
    loginStatus.textContent = 'A processar...';

    // Importante: Em um ambiente real, você deve proteger este endpoint com RLS para admins.
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error("Erro de Login:", error.message);
        loginStatus.textContent = `Erro de Login: ${error.message}`;
        loginStatus.classList.remove('text-green-500');
        loginStatus.classList.add('text-red-500');
    } else {
        loginStatus.textContent = 'Login bem-sucedido! Redirecionando...';
        loginStatus.classList.remove('text-red-500');
        loginStatus.classList.add('text-green-500');
        setUserSession(data.session);
    }
}

/**
 * Desconecta o usuário.
 */
async function handleLogout() {
    await supabaseClient.auth.signOut();
    setUserSession(null);
}

// ============================================================
// 4. RENDERIZAÇÃO DE PÁGINAS BÁSICAS
// ============================================================

/**
 * Renderiza o formulário de login.
 * @returns {string} HTML para a página de login.
 */
function renderLogin() {
    return `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div class="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <h2 class="text-3xl font-extrabold text-gray-900 text-center mb-6">
                    Painel de Administração
                </h2>
                <p class="text-center text-sm text-gray-600 mb-6">
                    Acesso restrito para gerentes.
                </p>
                <form id="login-form" onsubmit="event.preventDefault(); handleLogin();">
                    <div class="space-y-4">
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700">E-mail</label>
                            <input id="email" name="email" type="email" autocomplete="email" required
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm">
                        </div>
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700">Senha</label>
                            <input id="password" name="password" type="password" autocomplete="current-password" required
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm">
                        </div>
                    </div>
                    <div class="mt-6">
                        <button type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-150">
                            Entrar
                        </button>
                    </div>
                    <p id="login-status" class="mt-4 text-center text-sm text-gray-600"></p>
                </form>
            </div>
        </div>
    `;
}

/**
 * Renderiza o esqueleto da página de administração (Navbar, Tabs).
 * @returns {string} HTML para o shell do admin.
 */
function renderAdminShell() {
    const adminEmail = userSession?.user?.email || "Admin";

    const getTabClass = (tabName) => {
        return currentAdminTab === tabName
            ? "px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg"
            : "px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition duration-150";
    };

    return `
        <div class="min-h-screen bg-gray-100">
            <!-- Navbar -->
            <nav class="bg-white shadow-md">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center">
                            <span class="text-xl font-bold text-purple-600">Scheduler Admin</span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-sm text-gray-700">Bem-vindo, ${adminEmail}</span>
                            <button onclick="handleLogout()"
                                class="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition duration-150">
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Conteúdo Principal -->
            <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <!-- Tabs -->
                <div class="mb-6 border-b border-gray-200">
                    <nav class="flex space-x-2" aria-label="Tabs">
                        <a href="#" onclick="currentAdminTab='dashboard'; renderAdminContent();" class="${getTabClass('dashboard')}">
                            Painel
                        </a>
                        <a href="#" onclick="currentAdminTab='appointments'; renderAdminContent();" class="${getTabClass('appointments')}">
                            Agendamentos
                        </a>
                        <a href="#" onclick="currentAdminTab='profiles'; renderAdminContent();" class="${getTabClass('profiles')}">
                            Clientes
                        </a>
                    </nav>
                </div>

                <!-- Área de Conteúdo -->
                <div id="admin-content" class="bg-white shadow-xl rounded-lg p-6">
                    <!-- O conteúdo da aba será carregado aqui -->
                </div>
            </div>
        </div>
    `;
}


// ============================================================
// 5. RENDERIZAÇÃO DE CONTEÚDO ADMIN (ASSÍNCRONO)
// ============================================================

/**
 * Formata uma string de data ISO para um formato de hora e data legível.
 * @param {string} isoDateString - A string de data/hora ISO (e.g., "2024-01-01T10:00:00").
 * @returns {string} Data formatada.
 */
function formatDate(isoDateString) {
    if (!isoDateString) return 'N/A';
    try {
        const date = new Date(isoDateString);
        return date.toLocaleString('pt-PT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch (e) {
        console.error("Erro ao formatar data:", e);
        return isoDateString;
    }
}

/**
 * Mapeia e junta agendamentos com as informações de perfil do cliente.
 * @param {Array} profiles - Lista de perfis.
 * @param {Array} appointments - Lista de agendamentos.
 * @returns {Array} Lista de agendamentos com detalhes do cliente (nome, email).
 */
function joinData(profiles, appointments) {
    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.id, p));

    return appointments.map(a => ({
        ...a,
        client: profileMap.get(a.profile_id) || { name: 'Desconhecido', email: 'N/A' }
    }));
}

/**
 * Renderiza o conteúdo em caso de sucesso no carregamento de dados.
 * @param {Array} profiles - Lista de todos os perfis.
 * @param {Array} appointments - Lista de todos os agendamentos.
 */
function renderAdminContentSuccess(profiles, appointments) {
    const contentArea = document.getElementById("admin-content");
    const combinedAppointments = joinData(profiles, appointments);

    // Ordena os agendamentos pelo mais recente primeiro
    combinedAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // =========================================================================
    // RENDERIZAÇÃO
    // =========================================================================

    let html = '';

    if (currentAdminTab === 'dashboard') {
        html = `
            <h3 class="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">Resumo do Painel</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <!-- Card 1: Total de Clientes -->
                <div class="bg-blue-500 text-white p-6 rounded-xl shadow-lg">
                    <p class="text-3xl font-bold">${profiles.length}</p>
                    <p class="text-lg font-medium">Clientes Registrados</p>
                </div>
                <!-- Card 2: Total de Agendamentos -->
                <div class="bg-green-500 text-white p-6 rounded-xl shadow-lg">
                    <p class="text-3xl font-bold">${appointments.length}</p>
                    <p class="text-lg font-medium">Agendamentos Totais</p>
                </div>
                <!-- Card 3: Pendentes -->
                <div class="bg-yellow-500 text-white p-6 rounded-xl shadow-lg">
                    <p class="text-3xl font-bold">${appointments.filter(a => a.status === 'pending').length}</p>
                    <p class="text-lg font-medium">Agendamentos Pendentes</p>
                </div>
            </div>

            <h4 class="text-xl font-semibold text-gray-800 mb-4">Últimos 5 Agendamentos</h4>
            ${renderAppointmentTable(combinedAppointments.slice(0, 5))}
        `;
    } else if (currentAdminTab === 'appointments') {
        html = `
            <h3 class="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">Todos os Agendamentos</h3>
            ${renderAppointmentTable(combinedAppointments)}
        `;
    } else if (currentAdminTab === 'profiles') {
        html = `
            <h3 class="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">Lista de Clientes</h3>
            ${renderProfileTable(profiles)}
        `;
    }

    contentArea.innerHTML = html;
}

/**
 * Gera o HTML para a tabela de agendamentos.
 */
function renderAppointmentTable(appointments) {
    if (appointments.length === 0) {
        return '<p class="text-gray-500">Nenhum agendamento encontrado.</p>';
    }
    
    return `
        <div class="overflow-x-auto bg-white rounded-lg shadow-md">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serviço</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${appointments.map(a => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(a.date)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${a.service || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${a.client.name} (<a href="mailto:${a.client.email}" class="text-blue-600 hover:text-blue-800">${a.client.email}</a>)
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                      a.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                                      'bg-gray-100 text-gray-800'}">
                                    ${a.status}
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
 * Gera o HTML para a tabela de perfis.
 */
function renderProfileTable(profiles) {
    if (profiles.length === 0) {
        return '<p class="text-gray-500">Nenhum perfil de cliente encontrado.</p>';
    }

    return `
        <div class="overflow-x-auto bg-white rounded-lg shadow-md">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID do Perfil</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${profiles.map(p => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">${p.id}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.email || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}


/**
 * Renderiza o conteúdo em caso de erro no carregamento de dados.
 * @param {object} error - O objeto de erro retornado pelo Supabase.
 * @param {string} title - Título amigável do erro.
 */
function renderAdminContentError(error, title) {
    const contentArea = document.getElementById("admin-content");
    contentArea.innerHTML = `
        <div class="p-10 text-center bg-red-50 rounded-lg border border-red-300">
            <svg class="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <h3 class="mt-2 text-xl font-medium text-red-800">${title}</h3>
            <p class="mt-1 text-sm text-red-600">
                Ocorreu um erro ao carregar os dados. Isto geralmente é um problema de Permissão (RLS).
            </p>
            <p class="mt-4 text-left text-xs text-red-700 p-2 bg-red-100 rounded-md break-all">
                <strong>Detalhes do Erro:</strong> ${error?.message || error}
            </p>
            <p class="mt-4 text-sm text-red-800 font-semibold">
                <strong>Solução Sugerida:</strong> Verifique se as tabelas <code>profiles</code> e <code>appointments</code> existem e se o RLS
                permite a leitura (select) para a role <code>anon</code>.
            </p>
            <button onclick="renderAdminContent()" class="mt-6 px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition duration-150">
                Tentar Novamente
            </button>
        </div>
    `;
}


/**
 * Carrega e renderiza o conteúdo principal da aba (Painel ou Agendamentos).
 */
async function renderAdminContent() {
    const contentArea = document.getElementById("admin-content");
    contentArea.innerHTML = `<div class="p-8 text-center"><span class="animate-spin h-6 w-6 border-4 border-purple-500 border-t-transparent rounded-full inline-block"></span> Carregando dados do painel...</div>`;

    try {
        // Fetch Profiles (Aplica-se RLS: anon deve poder LER o que é visível publicamente)
        const { data: profilesData, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('id, name, email'); 

        if (profilesError) {
            console.error('Erro ao carregar perfis:', profilesError);
            // Chama o render de erro com a sugestão de RLS
            return renderAdminContentError(profilesError, "Erro ao carregar Perfis");
        }

        // Fetch Appointments (Aplica-se RLS: anon deve poder LER o que é visível publicamente)
        const { data: appointmentsData, error: appointmentsError } = await supabaseClient
            .from('appointments')
            .select('id, date, service, status, profile_id'); 

        if (appointmentsError) {
            console.error('Erro ao carregar agendamentos:', appointmentsError);
            // Chama o render de erro com a sugestão de RLS
            return renderAdminContentError(appointmentsError, "Erro ao carregar Agendamentos");
        }

        // Se ambos foram bem-sucedidos
        renderAdminContentSuccess(profilesData, appointmentsData);

    } catch (e) {
        console.error("Erro inesperado durante o carregamento de dados do admin:", e);
        renderAdminContentError(e, "Erro Geral Inesperado");
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

// ============================================================
// 7. INICIALIZAÇÃO
// ============================================================
// A função de inicialização é responsável por configurar o listener de autenticação
// e renderizar o estado inicial do aplicativo.

supabaseClient?.auth.onAuthStateChange((event, session) => {
    console.log(`Evento de Autenticação: ${event}`);
    // O evento INITIAL_SESSION é o mais importante para definir o estado inicial.
    // Todos os outros eventos (SIGNED_IN, SIGNED_OUT, etc.) atualizam o estado.
    setUserSession(session);
});

// A primeira renderização ocorrerá dentro do onAuthStateChange
// para garantir que o estado de autenticação seja carregado primeiro.
if (!supabaseClient) {
    // Se o Supabase falhou ao inicializar, mostre uma mensagem de erro na tela.
    document.getElementById("app").innerHTML = `
        <div class="p-10 text-center text-red-700 bg-red-100 min-h-screen flex items-center justify-center">
            ERRO CRÍTICO: Cliente Supabase não inicializado. Verifique a configuração no console.
        </div>
    `;
}
