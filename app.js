// app.js - Versão aprimorada com verificação de sessão inicial

// Configurações Supabase
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

// Inicializa o cliente Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis de estado global
let currentPage = 'loading'; // Novo estado inicial: 'loading'
let currentAdminTab = 'dashboard';

/* -------------------------
    Controle de página/aba
------------------------- */
/**
 * Altera a página atual e aciona a re-renderização.
 * @param {string} newPage - 'login' ou 'admin'.
 */
function setCurrentPage(newPage) {
    currentPage = newPage;
    render();
}
// function setCurrentSession(session) {} // Mantido como placeholder
function changeAdminTab(tab) {
    currentAdminTab = tab;
    render();
}

/* -------------------------
    Autenticação
------------------------- */
async function handleLogin(email, password) {
    try {
        // Tenta fazer o login
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Verifica se o usuário é um administrador (Exemplo: verifica um claim de metadata se disponível)
        // Por enquanto, apenas assume sucesso de login.
        setCurrentPage('admin');
    } catch (e) {
        const msg = document.getElementById('login-message');
        if (msg) msg.innerText = `Erro: ${e.message}. Tente novamente.`;
        console.error("Erro de login:", e);
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        setCurrentPage('login');
    } catch (e) {
        console.error("Erro ao fazer logout:", e.message);
    }
}

/**
 * Verifica a sessão Supabase ao iniciar a aplicação.
 */
async function checkInitialSession() {
    // Escuta mudanças de estado de autenticação
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Se houver uma sessão válida, vai direto para o painel de administração
        setCurrentPage('admin');
    } else {
        // Caso contrário, mostra a tela de login
        setCurrentPage('login');
    }
}


/* -------------------------
    Renderizações
------------------------- */

function renderLoading() {
    // Retorna o HTML do loader inicial (que já está no index.html)
    return `
        <div class="flex justify-center items-center h-screen bg-gray-50" id="initial-loader">
            <div class="flex items-center p-8 rounded-xl bg-white shadow-xl">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mr-4"></div>
                <span class="text-lg font-medium text-gray-700">Iniciando aplicação...</span>
            </div>
        </div>
    `;
}

function renderLogin() {
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

function renderAdminShell() {
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
            <!-- Conteúdo da aba será injetado aqui -->
            <div class="text-center p-10">
                <div class="animate-pulse text-gray-500">Carregando conteúdo...</div>
            </div>
        </main>
    </div>
    `;
}

/* -------------------------
    Conteúdo Admin
------------------------- */
function renderAdminContent() {
    const main = document.getElementById('admin-content');
    if (!main) return;

    if (currentAdminTab==='dashboard') {
        main.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-xl border-l-4 border-indigo-500 transition hover:shadow-2xl">
                    <p class="text-sm font-medium text-gray-500">Total de Usuários</p>
                    <p class="text-4xl font-extrabold text-gray-900 mt-2">42</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-xl border-l-4 border-teal-500 transition hover:shadow-2xl">
                    <p class="text-sm font-medium text-gray-500">Agendamentos Pendentes</p>
                    <p class="text-4xl font-extrabold text-gray-900 mt-2">24</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-xl border-l-4 border-yellow-500 transition hover:shadow-2xl">
                    <p class="text-sm font-medium text-gray-500">Psicólogos Ativos</p>
                    <p class="text-4xl font-extrabold text-gray-900 mt-2">12</p>
                </div>
            </div>
            <div class="mt-8 bg-white p-6 rounded-xl shadow-xl">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Atendimentos Mensais</h3>
                <canvas id="dashboardChart" class="w-full"></canvas>
            </div>
        `;
        // Adicionando um pequeno atraso para garantir que Chart.js tenha carregado
        setTimeout(renderDashboardChart, 100); 
    } else if (currentAdminTab==='users') {
        main.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Lista de Usuários</h2>
            <div class="overflow-x-auto bg-white rounded-xl shadow-xl">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Função</th>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr class="hover:bg-indigo-50/50 transition">
                            <td class="px-6 py-4 whitespace-nowrap">Alice Silva</td>
                            <td class="px-6 py-4 whitespace-nowrap text-indigo-600">alice@psionline.com</td>
                            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Admin</span></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Ativo</td>
                        </tr>
                        <tr class="hover:bg-indigo-50/50 transition">
                            <td class="px-6 py-4 whitespace-nowrap">Bob Santos</td>
                            <td class="px-6 py-4 whitespace-nowrap text-indigo-600">bob@cliente.com</td>
                            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Cliente</span></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Ativo</td>
                        </tr>
                        <tr class="hover:bg-indigo-50/50 transition">
                            <td class="px-6 py-4 whitespace-nowrap">Carol Pires</td>
                            <td class="px-6 py-4 whitespace-nowrap text-indigo-600">carol@psi.com</td>
                            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Psicólogo</span></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Pendente</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    } else {
        main.innerHTML = `<p class="text-center text-red-500">Aba não encontrada.</p>`;
    }
}

/* -------------------------
    Gráficos Dashboard
------------------------- */
function renderDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    // Verifica se o elemento e o objeto Chart existem antes de tentar criar o gráfico
    if (!ctx || typeof Chart === 'undefined') {
        console.warn("Chart.js ainda não carregado ou canvas não encontrado.");
        return;
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan','Fev','Mar','Abr','Mai','Jun'],
            datasets: [{
                label: 'Atendimentos Realizados',
                data: [12, 19, 3, 5, 20, 15], // Dados um pouco mais variados
                backgroundColor: 'rgba(99, 102, 241, 0.7)', // Cor principal: Indigo
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Atendimentos'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                }
            }
        }
    });
}

/* -------------------------
    Event listeners
------------------------- */
function attachAdminListeners() {
    // 1. Listeners dos botões de aba
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', e => {
            // Garante que o data-tab seja lido corretamente
            const tab = e.currentTarget.dataset.tab; 
            changeAdminTab(tab);
        });
    });

    // 2. Listener do botão de logout
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
            
            // Estado de carregamento
            btn.disabled = true;
            btn.textContent = 'Autenticando...';
            btn.classList.add('opacity-75', 'cursor-not-allowed');

            await handleLogin(e.target.email.value, e.target.password.value);
            
            // Restaura o estado
            btn.disabled = false;
            btn.textContent = originalText;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
        });
    }
}


/* -------------------------
    Render principal
------------------------- */
/**
 * Função principal de renderização baseada no estado 'currentPage'.
 * Também anexa os listeners apropriados.
 */
function render() {
    const app = document.getElementById('app');
    if (!app) return;

    if (currentPage === 'loading') {
        app.innerHTML = renderLoading();
    } else if (currentPage === 'login') {
        app.innerHTML = renderLogin();
        // Anexa listener do formulário de login após renderizar o HTML
        attachLoginListener(); 
    } else if (currentPage === 'admin') {
        app.innerHTML = renderAdminShell();
        renderAdminContent();
        // Anexa listeners do painel admin (abas e logout)
        attachAdminListeners(); 
    } else {
        app.innerHTML = `<p class="text-center text-xl text-red-500 mt-20">Página desconhecida.</p>`;
    }
}

/* -------------------------
    Inicialização
------------------------- */
/**
 * Inicia a aplicação: verifica a sessão e renderiza.
 */
function init() {
    // Esconde o loader inicial do index.html e começa a renderização
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) initialLoader.remove();
    
    // Inicia a verificação de sessão para definir a página inicial
    checkInitialSession();
}

// Garante que a inicialização ocorra somente após o DOM estar completamente carregado
document.addEventListener('DOMContentLoaded', init);


/* -------------------------
    Exposição global (Opcional, mas útil para debug)
------------------------- */
window.appModule = {
    render,
    setCurrentPage,
    handleLogin,
    handleLogout,
    changeAdminTab,
    renderAdminContent,
    supabaseClient,
    init
};
