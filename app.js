// app.js - Versão restaurada com Exports e Lógica de Autenticação

// Configurações Supabase (Usando placeholders aqui, mas deve ser o seu real)
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

// Exporta o cliente para uso global ou em outros módulos, se necessário
export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis de estado global
let currentPage = 'loading'; 
let currentAdminTab = 'dashboard';
let globalUsersData = []; // Cache de dados de usuários

/* -------------------------
    Controle de página/aba
------------------------- */
export function setCurrentPage(newPage) { 
    currentPage = newPage;
    render();
}
// export function setCurrentSession(session) { currentAuthSession = session; } 
export function changeAdminTab(tab) {
    currentAdminTab = tab;
    render();
}

/* -------------------------
    Autenticação
------------------------- */
export async function handleLogin(email, password) {
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        setCurrentPage('admin'); 
    } catch (e) {
        const msg = document.getElementById('login-message');
        if (msg) msg.innerText = `Erro: ${e.message}. Verifique suas credenciais.`;
        console.error("Erro de login:", e);
    }
}

export async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        setCurrentPage('login');
    } catch (e) {
        console.error("Erro ao fazer logout:", e.message);
    }
}

async function checkInitialSession() {
    try {
        // ESSENCIAL: Verifica a sessão para definir a página inicial
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            setCurrentPage('admin');
        } else {
            setCurrentPage('login');
        }
    } catch (e) {
        console.error("Erro ao verificar sessão inicial:", e);
        setCurrentPage('login');
    }
}


/* -------------------------
    Renderização - Estrutura
------------------------- */

function renderLoading() {
     return `
        <div class="flex justify-center items-center h-screen bg-gray-50" id="initial-loader">
            <div class="flex items-center p-8 rounded-xl bg-white shadow-xl">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mr-4"></div>
                <span class="text-lg font-medium text-gray-700">Iniciando aplicação...</span>
            </div>
        </div>
    `;
}

export function renderLogin() {
    return `
    <div class="flex flex-col items-center justify-center h-screen p-4 bg-gray-100">
        <div class="glass p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h1 class="text-3xl font-bold text-center text-indigo-700 mb-6">Psionline Admin</h1>
            <form id="login-form">
                <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input type="email" id="email" name="email" placeholder="admin@psionline.com" required
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div class="mb-6">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <input type="password" id="password" name="password" required value="123456"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <button type="submit" id="loginButton"
                    class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg shadow-md transition duration-150">
                    Entrar
                </button>
                <p id="login-message" class="text-sm text-red-600 mt-4 text-center"></p>
                <p class="text-xs text-gray-500 text-center mt-4">Credenciais de teste: admin@psionline.com / 123456</p>
            </form>
        </div>
    </div>
    `;
}

export function renderAdminShell() {
    return `
    <div class="min-h-screen flex flex-col">
        <header class="bg-white shadow-lg sticky top-0 z-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-indigo-700">Psionline Admin</h1>
                <nav class="flex space-x-2 sm:space-x-4">
                    <button class="tab-button p-2 rounded-lg transition duration-150 ${currentAdminTab==='dashboard'?'bg-indigo-600 text-white font-semibold shadow-md':'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}" data-tab="dashboard">Dashboard</button>
                    <button class="tab-button p-2 rounded-lg transition duration-150 ${currentAdminTab==='users'?'bg-indigo-600 text-white font-semibold shadow-md':'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}" data-tab="users">Usuários</button>
                    <button id="logoutBtn" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-150 shadow-md">Sair</button>
                </nav>
            </div>
        </header>
        <main id="admin-content" class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div class="text-center p-10">
                <div class="animate-pulse text-gray-500">Carregando conteúdo da aba...</div>
            </div>
        </main>
    </div>
    `;
}

/* -------------------------
    Renderização - Conteúdo de Abas (Com Data Fetching)
------------------------- */

// Renderiza o conteúdo da aba correta
export function renderAdminContent() {
    const main = document.getElementById('admin-content');
    if (!main) return;

    if (currentAdminTab === 'dashboard') {
        renderDashboardContent(main);
    } else if (currentAdminTab === 'users') {
        renderUsersContent(main);
    } else {
        main.innerHTML = `<p class="text-center text-red-500">Aba não encontrada.</p>`;
    }
}

// ------------------------------------
// Dashboard - Carregamento Assíncrono
// ------------------------------------
async function renderDashboardContent(mainElement) {
    // Placeholder de carregamento (Skeleton loader)
    mainElement.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div class="bg-white p-6 rounded-xl shadow-xl h-24"></div>
            <div class="bg-white p-6 rounded-xl shadow-xl h-24"></div>
            <div class="bg-white p-6 rounded-xl shadow-xl h-24"></div>
        </div>
        <div class="mt-8 bg-white p-6 rounded-xl shadow-xl h-96 animate-pulse"></div>
    `;

    try {
        // 1. Obter Total de Usuários
        const { count: totalUsers } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });
            
        // 2. Obter Total de Psicólogos
        const { count: activePsychologists } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'psychologist'); 

        // 3. Obter Total de Agendamentos Pendentes
        const { count: pendingAppointments } = await supabaseClient
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'scheduled');

        // Renderiza o conteúdo final com dados reais
        mainElement.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-xl border-l-4 border-indigo-500 transition hover:shadow-2xl">
                    <p class="text-sm font-medium text-gray-500">Total de Usuários</p>
                    <p class="text-4xl font-extrabold text-gray-900 mt-2">${totalUsers || 0}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-xl border-l-4 border-teal-500 transition hover:shadow-2xl">
                    <p class="text-sm font-medium text-gray-500">Agendamentos Pendentes</p>
                    <p class="text-4xl font-extrabold text-gray-900 mt-2">${pendingAppointments || 0}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-xl border-l-4 border-yellow-500 transition hover:shadow-2xl">
                    <p class="text-sm font-medium text-gray-500">Psicólogos Ativos</p>
                    <p class="text-4xl font-extrabold text-gray-900 mt-2">${activePsychologists || 0}</p>
                </div>
            </div>
            <div class="mt-8 bg-white p-6 rounded-xl shadow-xl">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Atendimentos Mensais (Mock)</h3>
                <div class="relative h-96 w-full">
                    <canvas id="dashboardChart"></canvas>
                </div>
            </div>
        `;
        setTimeout(renderDashboardChart, 100); 

    } catch (error) {
        console.error("Erro ao carregar dados do Dashboard:", error);
        mainElement.innerHTML = `
            <div class="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-xl mt-6">
                <h2 class="text-2xl font-bold mb-3">🚨 Erro ao Carregar Métricas</h2>
                <p>Verifique as regras de RLS nas tabelas 'users' e 'appointments'.</p>
                <p class="mt-2 font-mono text-sm">Detalhe: ${error.message}</p>
            </div>
        `;
    }
}

// ------------------------------------
// Usuários - Carregamento Assíncrono
// ------------------------------------
async function renderUsersContent(mainElement) {
    mainElement.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 mb-6">Lista de Usuários</h2>
        <div class="overflow-x-auto bg-white rounded-xl shadow-xl p-8 text-center text-gray-500">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3"></div>
            Carregando lista de usuários...
        </div>
    `;

    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('id, full_name, email, role, created_at, status')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        globalUsersData = users; 

        const tableRows = users.map(user => {
            let roleStyle = 'bg-gray-100 text-gray-800';
            if (user.role === 'admin') roleStyle = 'bg-red-100 text-red-800';
            if (user.role === 'psychologist') roleStyle = 'bg-yellow-100 text-yellow-800';
            if (user.role === 'client') roleStyle = 'bg-blue-100 text-blue-800';
            
            let statusStyle = 'bg-gray-100 text-gray-800';
            if (user.status === 'active') statusStyle = 'bg-green-100 text-green-800';
            if (user.status === 'pending') statusStyle = 'bg-yellow-100 text-yellow-800';

            return `
                <tr class="hover:bg-indigo-50/50 transition">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${user.full_name || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">${user.email || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleStyle}">
                            ${user.role || 'client'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyle}">
                            ${user.status || 'inactive'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900 transition duration-150">Editar</button>
                    </td>
                </tr>
            `;
        }).join('');

        mainElement.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Lista de Usuários (${users.length} encontrados)</h2>
            <div class="overflow-x-auto bg-white rounded-xl shadow-xl">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Função</th>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${tableRows.length > 0 ? tableRows : `<tr><td colspan="5" class="p-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        console.error("Erro ao carregar lista de usuários:", error);
        mainElement.innerHTML = `
            <div class="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-xl mt-6">
                <h2 class="text-2xl font-bold mb-3">🚨 Erro ao Carregar Usuários</h2>
                <p>Verifique a conexão e as regras de RLS (Row Level Security) na tabela 'users'.</p>
                <p class="mt-2 font-mono text-sm">Detalhe: ${error.message}</p>
            </div>
        `;
    }
}


/* -------------------------
    Gráficos e Listeners
------------------------- */

function renderDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (window.dashboardChartInstance) window.dashboardChartInstance.destroy();

    window.dashboardChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan','Fev','Mar','Abr','Mai','Jun'],
            datasets: [{
                label: 'Atendimentos Realizados',
                data: [12, 19, 3, 5, 20, 15], 
                backgroundColor: 'rgba(99, 102, 241, 0.7)', 
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Número de Atendimentos' } }
            },
            plugins: { legend: { display: true, position: 'top' } }
        }
    });
}

function attachAdminListeners() {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', e => {
            const tab = e.currentTarget.dataset.tab; 
            changeAdminTab(tab);
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

function attachLoginListener() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = document.getElementById('loginButton');
            const originalText = btn.textContent;
            
            btn.disabled = true;
            btn.textContent = 'Autenticando...';
            btn.classList.add('opacity-75', 'cursor-not-allowed');

            await handleLogin(e.target.email.value, e.target.password.value);
            
            // Restaura o estado (se a página não mudou)
            if (currentPage === 'login') {
                btn.disabled = false;
                btn.textContent = originalText;
                btn.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        });
    }
}


/* -------------------------
    Render principal
------------------------- */
export function render() {
    const app = document.getElementById('app');
    if (!app) return;

    // Remove o loader do index.html se ele estiver presente
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) initialLoader.remove();

    if (currentPage === 'loading') {
        app.innerHTML = renderLoading(); // Mostra o loader interno se o init não terminou
    } else if (currentPage === 'login') {
        app.innerHTML = renderLogin();
        attachLoginListener(); 
    } else if (currentPage === 'admin') {
        app.innerHTML = renderAdminShell();
        renderAdminContent();
        attachAdminListeners(); 
    } else {
        app.innerHTML = `<p class="text-center text-xl text-red-500 mt-20">Página desconhecida.</p>`;
    }
}

/* -------------------------
    Inicialização
------------------------- */
export function init() {
    // Chamada inicial que define se a página é 'login' ou 'admin'
    checkInitialSession();
}
