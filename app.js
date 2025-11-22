/*
  app.js
  Lógica unificada para inicialização do Supabase, navegação e gestão de dados.
  Substitui auth.js e database.js.
*/

// =============================================================
// 1. CONFIGURAÇÃO SUPABASE
// =============================================================

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

// =============================================================
// 2. VARIÁVEIS GLOBAIS
// =============================================================

let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "profiles"; // 'profiles', 'appointments'

// =============================================================
// 3. FUNÇÕES DE AUTENTICAÇÃO (MANTIDAS BREVES)
// =============================================================

// Exemplo de função de login
async function handleLogin(email, password) {
    const loginErrorMessage = document.getElementById("login-error-message");
    
    // Esconde qualquer erro anterior
    if (loginErrorMessage) {
        loginErrorMessage.classList.add('hidden');
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        // Linha 77 mencionada no log original
        console.error("Erro de Login:", error.message);
        if (loginErrorMessage) {
            loginErrorMessage.textContent = "Erro de Login: Credenciais inválidas.";
            loginErrorMessage.classList.remove('hidden');
        }
        return;
    }

    currentAuthSession = data.session;
    currentPage = "admin";
    render();
}

// Exemplo de função de logout
async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentAuthSession = null;
    currentPage = "login";
    render();
}

// =============================================================
// 4. FUNÇÕES DE CARREGAMENTO DE DADOS (DATABASE)
// =============================================================

/**
 * Carrega todos os perfis da tabela 'profiles'.
 *
 * CORREÇÃO CRÍTICA: O schema da tabela tem 'full_name', não 'name'.
 * A query foi atualizada para solicitar a coluna correta.
 */
async function loadProfiles() {
    const { data: profiles, error } = await supabaseClient
        .from('profiles')
        // CORRIGIDO: de 'name' para 'full_name'
        .select('id, full_name, email'); 

    if (error) {
        throw error; 
    }
    return profiles;
}

// Funções de renderização da UI (esboços)
function renderLogin() {
    // Esqueleto da página de Login
    return `
        <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
                <h1 class="text-3xl font-bold text-center text-purple-700 mb-8">Login</h1>
                <form id="login-form" onsubmit="event.preventDefault(); handleLogin(document.getElementById('email').value, document.getElementById('password').value);">
                    <div class="mb-4">
                        <label for="email" class="block text-gray-700 font-semibold mb-2">Email</label>
                        <input type="email" id="email" value="admin@exemplo.com" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" required>
                    </div>
                    <div class="mb-6">
                        <label for="password" class="block text-gray-700 font-semibold mb-2">Senha</label>
                        <input type="password" id="password" value="123456" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" required>
                    </div>
                    <button type="submit" class="w-full bg-purple-600 text-white p-3 rounded-lg font-bold hover:bg-purple-700 transition duration-200 shadow-md">Entrar</button>
                    <p id="login-error-message" class="mt-4 text-center text-sm text-red-500 hidden">Erro de Login: Credenciais inválidas.</p>
                </form>
            </div>
        </div>
    `;
}

function renderAdminShell() {
    // Esqueleto da página de Admin
    return `
        <div class="min-h-screen bg-gray-50 flex flex-col">
            <header class="bg-purple-700 text-white p-4 shadow-lg flex justify-between items-center">
                <h1 class="text-xl font-bold">Painel de Administração</h1>
                <nav>
                    <button onclick="currentAdminTab = 'profiles'; renderAdminContent();" class="px-4 py-2 rounded-lg ${currentAdminTab === 'profiles' ? 'bg-purple-800' : 'hover:bg-purple-600'}">Perfis</button>
                    <button onclick="currentAdminTab = 'appointments'; renderAdminContent();" class="px-4 py-2 rounded-lg ${currentAdminTab === 'appointments' ? 'bg-purple-800' : 'hover:bg-purple-600'}">Agendamentos</button>
                    <button onclick="handleLogout()" class="ml-4 bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition duration-200">Sair</button>
                </nav>
            </header>
            <main class="flex-grow p-6">
                <div id="admin-content" class="container mx-auto">
                    <!-- Conteúdo será carregado aqui por renderAdminContent() -->
                </div>
            </main>
        </div>
    `;
}

// =============================================================
// 5. FUNÇÃO DE RENDERIZAÇÃO DE CONTEÚDO (ADMIN)
// =============================================================

/**
 * Carrega e renderiza o conteúdo específico da aba de Administração.
 * Esta função é assíncrona.
 */
async function renderAdminContent() {
    const mainContent = document.getElementById("admin-content");

    if (currentAdminTab === 'profiles') {
        try {
            // Exibe um estado de carregamento enquanto espera o resultado
            mainContent.innerHTML = `<div class="p-10 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div><p class="mt-4 text-gray-600">Carregando Perfis...</p></div>`;

            // 1. Carrega os perfis
            const profiles = await loadProfiles(); 

            // 2. Renderiza o conteúdo
            mainContent.innerHTML = `
                <div class="p-6 bg-white shadow-lg rounded-xl">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Perfis de Usuários (${profiles.length})</h2>
                    ${profiles.length > 0 
                        ? `<ul class="space-y-3">
                            ${profiles.map(p => 
                                // CORRIGIDO: de 'p.name' para 'p.full_name'
                                `<li class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    ${p.full_name || 'Nome Indefinido'} (${p.email}) - ID: ${p.id}
                                </li>`).join('')}
                        </ul>`
                        : `<p class="text-red-500">Nenhum perfil encontrado. Verifique as políticas RLS para 'select'.</p>`
                    }
                </div>
            `;

        } catch (error) {
            // Linha 425 no log original
            console.error("Erro ao carregar perfis:", error);
            
            mainContent.innerHTML = `
                <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
                    <p class="font-bold text-red-700 mb-3">Falha ao Carregar Perfis (Erro)</p>
                    <p class="text-sm text-red-600 mb-4">
                        O código foi corrigido para usar a coluna correta <code>full_name</code>. Se você ainda vir esta mensagem de erro, verifique se a política RLS para <code>profiles</code> permite que o usuário autenticado (`auth.uid()`) faça `SELECT`.
                    </p>
                    <button onclick="renderAdminContent()" class="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition duration-150">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    } else if (currentAdminTab === 'appointments') {
        // Implementação futura para agendamentos
        mainContent.innerHTML = `<div class="p-10 text-center text-gray-600">Conteúdo de Agendamentos (Ainda não implementado).</div>`;
    }
}


// =============================================================
// 6. FUNÇÃO MESTRE DE RENDERIZAÇÃO
// =============================================================

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

// =============================================================
// 7. INICIALIZAÇÃO
// =============================================================
// Monitora o estado de autenticação e renderiza a página correta.
supabaseClient.auth.onAuthStateChange((event, session) => {
    // Linha 485 no log original
    console.log("Evento de Autenticação:", event); 
    currentAuthSession = session;
    
    if (session) {
        currentPage = "admin";
    } else {
        currentPage = "login";
    }
    render();
});

// A função de renderização inicial é chamada pela mudança de estado de autenticação.
if (!currentAuthSession) {
    render();
}
