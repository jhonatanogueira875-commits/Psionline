/*
  auth.js
  Supabase authentication helpers and core navigation logic.
  Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project's values.
*/

// **IMPORTANTE**: Use os seus valores exatos que ja estao definidos aqui.
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

// initialize client (expects <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> in HTML)
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.warn("Supabase client not initialized. Check your script import and keys.");

// ============================================================
// LÓGICA DE ESTADO E NAVEGAÇÃO
// ============================================================

let currentPage = "login"; // Página atual: 'login' ou 'admin'
let adminTab = "dashboard"; // Aba atual do admin
let authReady = !!supabaseClient; // Indica se o Supabase inicializou

/**
 * Altera a página atual e chama a renderização.
 * @param {string} page - A página para onde navegar ('login' ou 'admin').
 */
function navigate(page) {
    currentPage = page;
    render();
}

/**
 * Altera a aba ativa do Painel Admin e chama a renderização.
 * @param {string} tab - A aba para onde navegar ('dashboard', 'psychologists', 'patients').
 */
function changeAdminTab(tab) {
    adminTab = tab;
    render(); // A função render() chamará renderAdminContent() que usa a nova aba
}

// ============================================================
// FUNÇÕES DE RENDERIZAÇÃO DE PÁGINAS (Esqueletos HTML)
// ============================================================

function renderLogin() {
    return `
        <div class="flex items-center justify-center h-screen px-4 bg-purple-600">
            <div class="glass shadow-xl rounded-2xl p-8 max-w-md w-full bg-white bg-opacity-90">
                <h2 class="text-3xl font-extrabold text-purple-700 text-center mb-6">Psionline Admin</h2>
                <p class="text-center text-gray-500 mb-6">Acesso restrito ao painel de gestão.</p>
                <input type="text" placeholder="Usuário Admin" id="admin-email"
                    class="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                <input type="password" placeholder="Senha" id="admin-password"
                    class="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                <button onclick="simulateAdminLogin()"
                    class="w-full bg-purple-600 text-white p-3 rounded-lg font-semibold shadow-lg hover:bg-purple-700 transition-all transform hover:scale-[1.01]">
                    Entrar no Painel
                </button>
            </div>
        </div>
    `;
}

// Função de login simulada/temporária
function simulateAdminLogin() {
    // Por enquanto, apenas navega para o admin para vermos a dashboard.
    navigate('admin');
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
                <!-- Usa navigate('login') para simular o sair -->
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
                    <!-- O conteúdo será preenchido por renderAdminContent() de database.js -->
                    <div id="dynamic-content">
                        <!-- Loader -->
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
// FUNÇÃO MESTRE DE RENDERIZAÇÃO
// ============================================================

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
        if (typeof renderAdminContent === 'function') {
            renderAdminContent();
        } else {
             console.error("Erro: A função 'renderAdminContent' não está definida. Verifique database.js.");
             document.getElementById('dynamic-content').innerHTML = "<p class='text-red-500 text-center p-8'>Erro: `renderAdminContent` não definida. Verifique database.js.</p>";
        }
        return;
    }

    app.innerHTML = "<p class='p-10 text-center'>Página desconhecida.</p>";
}


// ============================================================
// FUNÇÕES DE AUTENTICAÇÃO SUPABASE (Mantidas como referências)
// ============================================================

async function signUp(email, password, full_name, role = "patient") {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  // Implementação
}

async function signIn(email, password) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  // Implementação
}

async function signOut() {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  await supabaseClient.auth.signOut();
}

async function getProfile(uid) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  // Implementação
  return null;
}

function onAuthChange(cb) {
  if (!supabaseClient) return;
  // Implementação
}
