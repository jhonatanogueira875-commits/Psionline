// app.js
const SUPABASE_URL = 'https://...';
const SUPABASE_ANON_KEY = '...';
export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentPage = "login";
let currentAdminTab = "dashboard";
let currentAuthSession = null;

export function setCurrentPage(page) { currentPage = page; }
export function setCurrentSession(session) { currentAuthSession = session; }

export function renderDashboard() {
    const main = document.getElementById('admin-content');
    if (main) main.innerHTML = `<div>Dashboard carregado!</div>`;
}

export function renderUsersContent() {
    const main = document.getElementById('admin-content');
    if (main) main.innerHTML = `<div>Usuários carregados!</div>`;
}

export function renderAdminContent() {
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;
    if (currentAdminTab === 'dashboard') renderDashboard();
    else if (currentAdminTab === 'users') renderUsersContent();
    else adminContent.innerHTML = `<div>Aba não encontrada: ${currentAdminTab}</div>`;
}

export function changeAdminTab(tab) { currentAdminTab = tab; render(); }

export function renderLogin() {
    return `<div class="flex items-center justify-center h-screen"><h1>Login</h1></div>`;
}

export function renderAdminShell() {
    return `<div>
        <header>Admin Header</header>
        <main id="admin-content">Carregando...</main>
    </div>`;
}

export function render() {
    const app = document.getElementById('app');
    if (!app) return;
    if (currentPage === 'login') app.innerHTML = renderLogin();
    else if (currentPage === 'admin') {
        app.innerHTML = renderAdminShell();
        renderAdminContent();
    }
    else app.innerHTML = `<div>Página desconhecida</div>`;
}
