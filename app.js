// -------------------------
// Configuração Supabase
// -------------------------
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!supabaseClient) console.error("ERRO: Supabase não inicializado");

let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "dashboard";

// -------------------------
// Funções de Controle
// -------------------------
function setCurrentPage(newPage) {
    currentPage = newPage;
    console.log("Página atual:", currentPage);
}

function setCurrentSession(session) {
    currentAuthSession = session;
}

// -------------------------
// Autenticação
// -------------------------
async function handleLogin(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email, password
        });
        if (error) throw error;
        console.log("Login bem-sucedido:", data.user.email);
        setCurrentPage('admin');
        render();
    } catch (e) {
        console.error("Erro de login:", e.message);
        const msg = document.getElementById('login-message');
        if (msg) msg.innerText = `Erro: ${e.message}`;
    }
}

async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log("Logout bem-sucedido.");
        setCurrentPage('login');
        render();
    } catch (e) {
        console.error("Erro de logout:", e.message);
    }
}

// -------------------------
// Roteamento Admin
// -------------------------
function changeAdminTab(tab) {
    currentAdminTab = tab;
    render();
}

async function renderAdminContent() {
    const main = document.getElementById('admin-content');
    if (!main) return;

    if (currentAdminTab === 'dashboard') {
        await renderDashboard();
    } else if (currentAdminTab === 'users') {
        await renderUsersContent();
    } else {
        main.innerHTML = `<div class="p-8 text-center text-gray-500">Aba não encontrada: ${currentAdminTab}</div>`;
    }
}

// -------------------------
// Views HTML
// -------------------------
function renderLogin() {
    return `
    <div class="flex flex-col items-center justify-center h-screen p-4 bg-gray-100">
        <div class="glass p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h1 class="text-3xl font-bold text-center text-indigo-700 mb-6">Psionline Admin</h1>
            <form id="login-form">
                <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input type="email" id="email" name="email" placeholder="seu.admin@dominio.com" required 
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div class="mb-6">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <input type="password" id="password" name="password" required value="123456" 
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <button type="submit" id="loginButton" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">
                    Entrar
                </button>
                <p id="login-message" class="text-sm text-red-600 mt-4 text-center"></p>
            </form>
        </div>
    </div>
    `;
}

function renderAdminShell() {
    return `
    <div class="min-h-screen flex flex-col">
        <header class="bg-white shadow-md z-10 sticky top-0">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-indigo-600">Psionline Admin</h1>
                <nav class="flex space-x-4">
                    <button onclick="window.appModule.changeAdminTab('dashboard')" class="${currentAdminTab==='dashboard'?'bg-indigo-100 text-indigo-700 font-semibold':'text-gray-600'} p-2 rounded-md">Dashboard</button>
                    <button onclick="window.appModule.changeAdminTab('users')" class="${currentAdminTab==='users'?'bg-indigo-100 text-indigo-700 font-semibold':'text-gray-600'} p-2 rounded-md">Usuários</button>
                    <button onclick="window.appModule.handleLogout()" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg">Sair</button>
                </nav>
            </div>
        </header>
        <main id="admin-content" class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div class="text-center p-10"><div class="animate-pulse text-gray-500">Carregando conteúdo...</div></div>
        </main>
    </div>
    `;
}

// -------------------------
// Dashboard e Users
// -------------------------
async function renderDashboard() {
    const main = document.getElementById('admin-content');
    if (!main) return;

    try {
        const { count: totalUsers } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });

        main.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Visão Geral</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
                    <p class="text-sm font-medium text-gray-500">Total de Usuários</p>
                    <p class="text-3xl font-bold text-gray-900 mt-1">${totalUsers||0}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-teal-500">
                    <p class="text-sm font-medium text-gray-500">Agendamentos Pendentes</p>
                    <p class="text-3xl font-bold text-gray-900 mt-1">24</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
                    <p class="text-sm font-medium text-gray-500">Psicólogos Ativos</p>
                    <p class="text-3xl font-bold text-gray-900 mt-1">12</p>
                </div>
            </div>
        `;
    } catch (e) {
        main.innerHTML = `<p class="text-red-600">Erro ao carregar dashboard: ${e.message}</p>`;
    }
}

async function renderUsersContent() {
    const main = document.getElementById('admin-content');
    if (!main) return;

    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('id, full_name, email, role, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const listHtml = users.map(u => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-medium text-gray-900">${u.full_name}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${u.email}</td>
                <td class="px-6 py-4 text-sm text-indigo-600 font-semibold">${u.role||'user'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');

        main.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Gerenciamento de Usuários</h2>
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome Completo</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desde</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${listHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        main.innerHTML = `<p class="text-red-600">Erro ao carregar usuários: ${e.message}</p>`;
    }
}

// -------------------------
// Render principal
// -------------------------
function render() {
    const app = document.getElementById('app');
    if (!app) return;

    if (currentPage === 'login') app.innerHTML = renderLogin();
    else if (currentPage === 'admin') {
        app.innerHTML = renderAdminShell();
        renderAdminContent();
    } else app.innerHTML = "<p>Página desconhecida</p>";
}

// -------------------------
// Listener do formulário de login
// -------------------------
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'login-form') {
        e.preventDefault();
        const btn = document.getElementById('loginButton');
        btn.disabled = true;
        btn.textContent = 'Autenticando...';

        await handleLogin(e.target.email.value, e.target.password.value);

        if (currentPage === 'login') {
            btn.disabled = false;
            btn.textContent = 'Entrar';
        }
    }
});

// -------------------------
// Expor funções para HTML
// -------------------------
window.appModule = {
    render,
    setCurrentPage,
    setCurrentSession,
    handleLogin,
    handleLogout,
    changeAdminTab,
    renderAdminContent,
    supabaseClient
};
