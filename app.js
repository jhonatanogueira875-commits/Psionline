// app.js
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentPage = 'login';
let currentAuthSession = null;
let currentAdminTab = 'dashboard';

/* -------------------------
   Funções de controle
------------------------- */
function setCurrentPage(newPage) { currentPage = newPage; }
function setCurrentSession(session) { currentAuthSession = session; }
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
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
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
                    <input type="email" id="email" name="email" placeholder="seu.admin@dominio.com" required 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div class="mb-6">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <input type="password" id="password" name="password" required value="123456" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <button type="submit" id="loginButton" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition duration-150 ease-in-out shadow-md">
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
                    <button class="tab-button p-2 rounded-md ${currentAdminTab==='dashboard'?'bg-indigo-100 text-indigo-700 font-semibold':'text-gray-600 hover:bg-gray-100'}" data-tab="dashboard">Dashboard</button>
                    <button class="tab-button p-2 rounded-md ${currentAdminTab==='users'?'bg-indigo-100 text-indigo-700 font-semibold':'text-gray-600 hover:bg-gray-100'}" data-tab="users">Usuários</button>
                    <button id="logoutBtn" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-150">Sair</button>
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
   Render principal
------------------------- */
function render() {
    const app = document.getElementById('app');
    if (!app) return console.error("#app não encontrado");

    if (currentPage==='login') {
        app.innerHTML = renderLogin();
    } else if (currentPage==='admin') {
        app.innerHTML = renderAdminShell();
        renderAdminContent();
        attachAdminListeners();
    }
}

/* -------------------------
   Conteúdo Admin
------------------------- */
function renderAdminContent() {
    const main = document.getElementById('admin-content');
    if (!main) return;

    if (currentAdminTab==='dashboard') main.innerHTML = `<h2 class="text-3xl font-bold text-gray-800">Dashboard</h2>`;
    else if (currentAdminTab==='users') main.innerHTML = `<h2 class="text-3xl font-bold text-gray-800">Usuários</h2>`;
    else main.innerHTML = `<p>Aba não encontrada</p>`;
}

/* -------------------------
   Event Listeners
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
        const loginButton = document.getElementById('loginButton');
        loginButton.disabled = true;
        loginButton.textContent = 'Autenticando...';
        const email = e.target.email.value;
        const password = e.target.password.value;
        await handleLogin(email,password);
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
    }
});

/* -------------------------
   Exportações
------------------------- */
window.appModule = { render, setCurrentPage, setCurrentSession, supabaseClient, handleLogin, handleLogout, changeAdminTab, renderAdminContent };
export { render, setCurrentPage, setCurrentSession, supabaseClient, handleLogin, handleLogout, changeAdminTab, renderAdminContent };
