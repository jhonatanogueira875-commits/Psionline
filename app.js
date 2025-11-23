// app.js
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentPage = 'login';
let currentAdminTab = 'dashboard';

/* -------------------------
   Controle de página/aba
------------------------- */
function setCurrentPage(newPage) { currentPage = newPage; }
function changeAdminTab(tab) { currentAdminTab = tab; render(); }

/* -------------------------
   Autenticação
------------------------- */
async function handleLogin(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setCurrentPage('admin'); render();
    } catch (e) {
        const msg = document.getElementById('login-message');
        if (msg) msg.innerText = `Erro: ${e.message}`;
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        setCurrentPage('login'); render();
    } catch (e) { console.error(e.message); }
}

/* -------------------------
   Renderizações
------------------------- */
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
                    class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg shadow-md">
                    Entrar
                </button>
                <p id="login-message" class="text-sm text-red-600 mt-4 text-center"></p>
                <p class="text-xs text-gray-500 text-center mt-4">Use admin@psionline.com / 123456</p>
            </form>
        </div>
    </div>
    `;
}

function renderAdminShell() {
    return `
    <div class="min-h-screen flex flex-col">
        <header class="bg-white shadow-md sticky top-0 z-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-indigo-600">Psionline Admin</h1>
                <nav class="flex space-x-4">
                    <button class="tab-button p-2 rounded-md ${currentAdminTab==='dashboard'?'bg-indigo-100 text-indigo-700 font-semibold':'text-gray-600 hover:bg-gray-100'}" data-tab="dashboard">Dashboard</button>
                    <button class="tab-button p-2 rounded-md ${currentAdminTab==='users'?'bg-indigo-100 text-indigo-700 font-semibold':'text-gray-600 hover:bg-gray-100'}" data-tab="users">Usuários</button>
                    <button id="logoutBtn" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm">Sair</button>
                </nav>
            </div>
        </header>
        <main id="admin-content" class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
                <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
                    <p class="text-sm font-medium text-gray-500">Total de Usuários</p>
                    <p class="text-3xl font-bold text-gray-900 mt-1">42</p>
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
            <div class="mt-8">
                <canvas id="dashboardChart" class="h-64 w-full"></canvas>
            </div>
        `;
        renderDashboardChart();
    } else if (currentAdminTab==='users') {
        main.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Usuários</h2>
            <table class="min-w-full bg-white rounded-xl shadow-md">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="border-b"><td class="px-6 py-4">Alice</td><td class="px-6 py-4">alice@ex.com</td><td class="px-6 py-4">Admin</td></tr>
                    <tr class="border-b"><td class="px-6 py-4">Bob</td><td class="px-6 py-4">bob@ex.com</td><td class="px-6 py-4">User</td></tr>
                </tbody>
            </table>
        `;
    } else {
        main.innerHTML = `<p>Aba não encontrada</p>`;
    }
}

/* -------------------------
   Gráficos Dashboard
------------------------- */
function renderDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx || typeof Chart==='undefined') return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan','Fev','Mar','Abr','Mai','Jun'],
            datasets: [{
                label: 'Atendimentos',
                data: [12,19,3,5,2,3],
                backgroundColor: 'rgba(99,102,241,0.5)',
                borderColor: 'rgba(99,102,241,1)',
                borderWidth: 1
            }]
        },
        options: { responsive:true, maintainAspectRatio:false }
    });
}

/* -------------------------
   Event listeners
------------------------- */
function attachAdminListeners() {
    document.querySelectorAll('.tab-button').forEach(btn=>{
        btn.addEventListener('click', e=>{
            changeAdminTab(e.target.dataset.tab);
        });
    });
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

document.addEventListener('submit', async e=>{
    if(e.target && e.target.id==='login-form'){
        e.preventDefault();
        const btn = document.getElementById('loginButton');
        btn.disabled = true;
        btn.textContent = 'Autenticando...';
        await handleLogin(e.target.email.value, e.target.password.value);
        btn.disabled = false;
        btn.textContent = 'Entrar';
    }
});

/* -------------------------
   Render inicial
------------------------- */
window.appModule = { render, setCurrentPage, changeAdminTab, handleLogin, handleLogout };
render();
