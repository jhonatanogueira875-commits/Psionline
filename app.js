/* app.js - Versão com Dashboard Admin completo
   Cards, gráfico de barras (atendimentos por mês),
   gráfico de linhas (novos usuários por mês) e
   lista de próximos agendamentos.
   Requer:
   - supabase-js v2 carregado antes
   - Chart.js CDN carregado antes deste arquivo
*/

// Variáveis de Configuração Supabase
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

// Inicialização do Cliente Supabase
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.error("ERRO CRÍTICO: Supabase não inicializado ou CDN faltando.");

let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "dashboard";

/* ---------------------------------
   Utilitários de Mensagens e Estado
   --------------------------------- */

function showMessage(type, message) {
    const container = document.getElementById('message-container');
    if (!container) return;

    let colorClass, icon;
    switch (type) {
        case 'success':
            colorClass = 'bg-green-100 border-green-400 text-green-700';
            icon = '✅';
            break;
        case 'error':
            colorClass = 'bg-red-100 border-red-400 text-red-700';
            icon = '❌';
            break;
        case 'info':
        default:
            colorClass = 'bg-blue-100 border-blue-400 text-blue-700';
            icon = 'ℹ️';
            break;
    }

    container.innerHTML = `
        <div class="border px-4 py-3 rounded relative shadow-md mb-4 ${colorClass}" role="alert">
            <strong class="font-bold">${icon}</strong>
            <span class="block sm:inline">${message}</span>
        </div>
    `;
    setTimeout(() => { container.innerHTML = ''; }, 5000);
}


/* ------------------------
   Autenticação principal
   ------------------------- */
async function handleLogin(email, password) {
    showMessage('info', 'Tentando login...');
    console.log(`TENTATIVA DE LOGIN: ${email}`);

    // Limpa a tela
    document.getElementById('app').innerHTML = renderLoading();

    try {
        const { data: { user, session }, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (authError) {
            console.error("ERRO DE AUTENTICAÇÃO:", authError.message);
            showMessage('error', `Falha no Login: ${authError.message}`);
            currentPage = "login";
            render();
            return;
        }

        currentAuthSession = session;
        console.log("SUCESSO NO LOGIN. Buscando perfil...");

        // 1. Buscar o perfil do usuário
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("ERRO AO BUSCAR PERFIL:", profileError.message);
            showMessage('error', "Erro ao carregar perfil. Verifique a tabela 'profiles'.");
            currentPage = "login";
            render();
            return;
        }

        const userRole = profileData.role;
        console.log("PERFIL ENCONTRADO. Papel do usuário:", userRole);

        // 2. Verificação de permissão
        if (userRole === 'admin') {
            currentPage = 'admin';
            showMessage('success', `Bem-vindo, Administrador!`);
        } else {
            console.error(`ACESSO NEGADO: Usuário logado tem o papel: ${userRole}. Apenas 'admin' é permitido.`);
            showMessage('error', `Acesso Negado. Seu papel (${userRole}) não é 'admin'.`);
            // Se o papel não for admin, desloga o usuário por segurança
            await supabaseClient.auth.signOut();
            currentPage = "login";
        }
        
        render(); // Renderiza a página apropriada (admin ou login)

    } catch (e) {
        console.error("ERRO CRÍTICO NO FLUXO DE LOGIN:", e);
        showMessage('error', "Um erro inesperado ocorreu. Tente novamente.");
        currentPage = "login";
        render();
    }
}

// Expõe a função para ser usada no escopo global (necessário para o HTML)
window.handleLogin = handleLogin;

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        currentAuthSession = null;
        currentPage = 'login';
        showMessage('info', 'Sessão encerrada com sucesso.');
        render();
    } catch (e) {
        console.error("ERRO AO FAZER LOGOUT:", e);
        showMessage('error', 'Falha ao encerrar a sessão.');
        render();
    }
}

/* ------------------------
   Template: Loading
   ------------------------- */
function renderLoading() {
    return `
        <div class="flex justify-center items-center h-screen bg-gray-50">
            <div class="flex items-center p-8 rounded-xl bg-white shadow-xl">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p class="ml-4 text-gray-700">Carregando...</p>
            </div>
        </div>
    `;
}

/* ------------------------
   Template: Login
   ------------------------- */

function renderLogin() {
    return `
        <div class="min-h-screen flex items-center justify-center p-4 bg-gray-100">
            <div class="w-full max-w-md">
                <div id="message-container"></div>
                <div class="bg-white p-8 rounded-xl shadow-2xl">
                    <h2 class="text-3xl font-bold text-center text-gray-800 mb-6">Psionline Admin</h2>
                    <form id="login-form" class="space-y-6">
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="email" name="email" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out">
                        </div>
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                            <input type="password" id="password" name="password" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out">
                        </div>
                        <button type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                            Entrar
                        </button>
                    </form>
                    <p class="mt-6 text-center text-sm text-gray-500">
                        Painel exclusivo para administradores.
                    </p>
                </div>
            </div>
        </div>
    `;
}

/* ------------------------
   Template: Dashboard Admin
   ------------------------- */

function renderAdminShell() {
    return `
        <div class="min-h-screen bg-gray-100 flex flex-col">
            <!-- Header/Navbar -->
            <header class="bg-indigo-600 shadow-md">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 class="text-xl font-bold text-white">Psionline Admin Dashboard</h1>
                    <nav class="flex space-x-4">
                        <button id="tab-dashboard" onclick="changeAdminTab('dashboard')" class="px-3 py-1 rounded-lg text-sm font-medium transition duration-150 ${currentAdminTab === 'dashboard' ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-500'}">Dashboard</button>
                        <button id="tab-users" onclick="changeAdminTab('users')" class="px-3 py-1 rounded-lg text-sm font-medium transition duration-150 ${currentAdminTab === 'users' ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-500'}">Usuários</button>
                        <button id="logout-button" onclick="handleLogout()" class="px-3 py-1 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition duration-150">Sair</button>
                    </nav>
                </div>
            </header>
            
            <!-- Main Content -->
            <main class="flex-grow p-4 sm:p-6 lg:p-8">
                <div id="message-container"></div>
                <div id="admin-content" class="max-w-7xl mx-auto">
                    <!-- Conteúdo de cada aba será injetado aqui -->
                    ${renderLoading()}
                </div>
            </main>
        </div>
    `;
}

function changeAdminTab(tab) {
    currentAdminTab = tab;
    // Re-renderiza o shell para atualizar o estado dos botões da navbar
    document.getElementById('app').innerHTML = renderAdminShell();
    // Renderiza o conteúdo da nova aba
    renderAdminContent();
}

// Placeholder para o conteúdo do Admin
async function renderAdminContent() {
    const main = document.getElementById('admin-content');
    if (!main) return;

    main.innerHTML = renderLoading(); // Mostra loader enquanto carrega

    if (currentAdminTab === 'dashboard') {
        // Lógica de Dashboards
        try {
            // Exemplo de busca de dados (Total de Usuários e Agendamentos)
            const users = await supabaseClient.from('profiles').select('id', { count: 'exact' });
            const appointments = await supabaseClient.from('appointments').select('id', { count: 'exact' });

            const totalUsers = users.count || 0;
            const totalAppointments = appointments.count || 0;
            
            main.innerHTML = `
                <h2 class="text-3xl font-semibold text-gray-800 mb-6">Dashboard Administrativo</h2>
                
                <!-- Cards de Métricas -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <!-- Card 1: Usuários Totais -->
                    <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
                        <p class="text-sm font-medium text-gray-500">Usuários Registrados</p>
                        <p class="text-4xl font-bold text-gray-900 mt-1">${totalUsers}</p>
                    </div>

                    <!-- Card 2: Agendamentos Totais -->
                    <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-teal-500">
                        <p class="text-sm font-medium text-gray-500">Agendamentos</p>
                        <p class="text-4xl font-bold text-gray-900 mt-1">${totalAppointments}</p>
                    </div>
                    
                    <!-- Card 3: Próximos Agendamentos (Fictício) -->
                    <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
                        <p class="text-sm font-medium text-gray-500">Próxima Sessão</p>
                        <p class="text-xl font-bold text-gray-900 mt-1">14:00 (Amanhã)</p>
                        <p class="text-sm text-gray-600">Com paciente X</p>
                    </div>
                </div>

                <!-- Seção de Agendamentos Recentes -->
                <div class="mt-8">
                    <h3 class="text-2xl font-semibold mb-4 text-gray-800">Próximos Agendamentos</h3>
                    <div id="appointments-list-container">
                        ${renderLoading()}
                    </div>
                </div>
            `;
            
            // Renderiza a lista de agendamentos dentro da div
            await renderRecentAppointments();

        } catch (e) {
            main.innerHTML = `<div class="p-6 bg-red-100 text-red-700 rounded-xl shadow-md border border-red-400">Erro ao carregar dashboard: ${e.message}</div>`;
        }
        return;
    }

    if (currentAdminTab === 'users') {
        // Lógica de Usuários (Psicólogos e Pacientes)
        main.innerHTML = `
            <h2 class="text-3xl font-semibold text-gray-800 mb-6">Gestão de Usuários</h2>
            <div id="users-list-container">
                ${renderLoading()}
            </div>
        `;
        await renderUserList();
        return;
    }
}

async function renderRecentAppointments() {
    const container = document.getElementById('appointments-list-container');
    if (!container) return;
    
    try {
        const { data: apps, error } = await supabaseClient
            .from('appointments')
            .select('scheduled_date, patient_id, psychologist_id, patient(full_name), psychologist(full_name)')
            .order('scheduled_date', { ascending: true })
            .limit(5);

        if (error) throw error;

        const list = apps.map(a => {
            // Supabase retorna arrays se houver join, usamos o primeiro elemento
            const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
            const psy = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
            
            const date = a.scheduled_date ? new Date(a.scheduled_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data Indefinida';

            return `
                <li class="p-4 bg-white border border-gray-200 rounded-lg mb-3 flex justify-between items-center shadow-sm">
                    <div>
                        <div class="font-semibold text-gray-800">Paciente: ${patient?.full_name || 'Desconhecido'}</div>
                        <div class="text-sm text-gray-600">Psicólogo: ${psy?.full_name || 'Desconhecido'}</div>
                    </div>
                    <div class="text-indigo-600 font-medium">${date}</div>
                </li>
            `;
        }).join('');

        container.innerHTML = `<ul class="space-y-3 p-4 bg-white rounded-xl shadow-lg">${list || '<li class="p-4 text-gray-600">Nenhum agendamento futuro encontrado.</li>'}</ul>`;

    } catch (e) {
        container.innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded">Erro ao carregar agendamentos: ${e.message}</div>`;
    }
}

async function renderUserList() {
    const container = document.getElementById('users-list-container');
    if (!container) return;
    
    try {
        // Busca todos os usuários, ordenados por nome
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('*') 
            .order('full_name', { ascending: true });

        if (error) throw error;

        const list = users.map(u => {
            const statusClass = u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
            const roleClass = u.role === 'psychologist' ? 'bg-blue-100 text-blue-700' : (u.role === 'patient' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700');

            return `
                <li class="p-4 bg-white border border-gray-200 rounded-lg mb-3 flex justify-between items-center shadow-sm hover:shadow-md transition duration-150">
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-lg text-gray-800">${u.full_name || 'Nome Não Informado'}</p>
                        <p class="text-sm text-gray-600 truncate">${u.email || 'Email Não Informado'}</p>
                    </div>
                    <div class="flex items-center space-x-3 ml-4">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${roleClass}">${u.role}</span>
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${u.status}</span>
                    </div>
                </li>
            `;
        }).join('');

        container.innerHTML = `<ul class="space-y-3 p-4 bg-white rounded-xl shadow-lg">${list || '<li class="p-4 text-gray-600">Nenhum usuário encontrado na tabela de perfis.</li>'}</ul>`;

    } catch (e) {
        container.innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded">Erro ao carregar lista de usuários: ${e.message}</div>`;
    }
}


/* ------------------------
   Escutas de Eventos
   ------------------------- */

function initializeListeners() {
    // Escuta o formulário de login (só existe na página de 'login')
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            handleLogin(email, password);
        });
    }

    // Outras escutas (ex: botões de tab no admin) podem ir aqui, mas o renderAdminShell já faz via onclick
}

/* ------------------------
   Render principal
   ------------------------- */

function render() {
    const app = document.getElementById('app');
    if (!app) return console.error("#app não encontrado");

    if (currentPage === 'login') { 
        app.innerHTML = renderLogin(); 
        initializeListeners(); // Inicializa escutas após renderizar o form
        return; 
    }
    
    if (currentPage === 'admin') { 
        app.innerHTML = renderAdminShell(); 
        renderAdminContent(); 
        return; 
    }
    
    app.innerHTML = "<p>Página desconhecida</p>";
}

// Inicia o processo de renderização
// A função render() é chamada pelo index.html após carregar o Chart.js
// Se este arquivo for o último, o render deve ser chamado aqui
// Com a estrutura atual, o index.html é responsável por chamar render()
// window.render = render; // Expondo render para o index.html
