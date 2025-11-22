/*
  app.js
  Lógica unificada para inicialização do Supabase, navegação e gestão de dados.
  TRATAMENTO DE ERRO REFORÇADO PARA MOSTRAR MAIS DETALHES DE FALHAS RLS.
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
let currentAdminTab = "appointments"; // Inicia em appointments para testar o erro

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
        // Trata a falha de login exibindo a mensagem na tela (Erro 400)
        console.error("Erro de Login:", error.message);
        if (loginErrorMessage) {
            loginErrorMessage.textContent = "Erro de Login: Credenciais inválidas. Verifique seu email/senha e o status de confirmação do usuário no painel Supabase.";
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
 */
async function loadProfiles() {
    // Esta query é simples e deve funcionar se a RLS em 'profiles' estiver OK.
    const { data: profiles, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name, email'); 

    if (error) {
        throw error; 
    }
    return profiles;
}

/**
 * Carrega todos os agendamentos da tabela 'appointments'.
 * Faz um join (join implícito) para obter o nome do usuário.
 */
async function loadAppointments() {
    // Query que exige RLS de SELECT em ambas as tabelas: 'appointments' E 'profiles'.
    const { data: appointments, error } = await supabaseClient
        .from('appointments')
        .select('*, profiles(full_name, email)');

    if (error) {
        throw error;
    }
    return appointments;
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
            // Exibe um estado de carregamento
            mainContent.innerHTML = `<div class="p-10 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div><p class="mt-4 text-gray-600">Carregando Perfis...</p></div>`;

            const profiles = await loadProfiles(); 

            // Renderiza a lista de perfis
            mainContent.innerHTML = `
                <div class="p-6 bg-white shadow-lg rounded-xl">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Perfis de Usuários (${profiles.length})</h2>
                    <p class="text-sm text-gray-500 mb-4">RLS para 'profiles' está OK para a query direta.</p>
                    ${profiles.length > 0 
                        ? `<ul class="space-y-3">
                            ${profiles.map(p => 
                                `<li class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <span class="font-semibold">${p.full_name || 'Nome Indefinido'}</span> (${p.email}) - ID: ${p.id}
                                </li>`).join('')}
                        </ul>`
                        : `<p class="text-red-500">Nenhum perfil encontrado.</p>`
                    }
                </div>
            `;

        } catch (error) {
            // Captura do Erro 500 para 'profiles' 
            console.error("Erro ao carregar perfis:", error);
            
            mainContent.innerHTML = `
                <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
                    <p class="font-bold text-red-700 mb-3">Falha ao Carregar Perfis (Verifique RLS de 'profiles')</p>
                    <p class="text-sm text-red-600">Erro: ${error.message}</p>
                </div>
            `;
        }
    } else if (currentAdminTab === 'appointments') {
        try {
            // Exibe um estado de carregamento
            mainContent.innerHTML = `<div class="p-10 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div><p class="mt-4 text-gray-600">Carregando Agendamentos...</p></div>`;

            const appointments = await loadAppointments();
            
            // Renderiza a lista de agendamentos
            mainContent.innerHTML = `
                <div class="p-6 bg-white shadow-lg rounded-xl">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Agendamentos Registrados (${appointments.length})</h2>
                    <p class="text-sm text-gray-500 mb-4">Sucesso! RLS em 'appointments' e 'profiles' está funcionando.</p>

                    ${appointments.length > 0 
                        ? `<ul class="space-y-4">
                            ${appointments.map(a => {
                                // Assume que o campo 'date' existe e o join com 'profiles' funcionou
                                // Caso o campo 'date' não exista, usa created_at
                                const appointmentDate = new Date(a.date || a.created_at).toLocaleString('pt-BR');
                                // Acessa o objeto aninhado 'profiles' para pegar o nome
                                const userName = a.profiles?.full_name || 'Usuário Desconhecido';
                                const userEmail = a.profiles?.email || 'N/A';

                                return `<li class="p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm">
                                    <div class="font-semibold text-indigo-700">Agendamento ID: ${a.id}</div>
                                    <div class="text-sm text-gray-700 mt-1">Data/Hora: <span class="font-medium">${appointmentDate}</span></div>
                                    <div class="text-sm text-gray-700">Usuário: <span class="font-medium">${userName}</span> (${userEmail})</div>
                                    <div class="text-xs text-gray-500 mt-2">Descrição/Status: ${a.description || a.status || 'Detalhes não preenchidos'}</div>
                                </li>`;
                            }).join('')}
                        </ul>`
                        : `<p class="text-gray-600 font-medium">Nenhum agendamento encontrado no banco de dados.</p>`
                    }
                </div>
            `;

        } catch (error) {
            // **CAPTURA DO ERRO DE RLS**
            const errorMessage = error.message || error.details || JSON.stringify(error);
            console.error("Erro ao carregar agendamentos (PROVÁVEL FALHA DE CACHE/SESSÃO):", error);
            
            mainContent.innerHTML = `
                <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
                    <p class="font-bold text-red-700 mb-3">⚠️ FALHA NO CARREGAMENTO DOS AGENDAMENTOS (SESSÃO DESATUALIZADA)</p>
                    <p class="text-sm text-red-600">
                        Ambas as políticas RLS (`appointments` e `profiles`) estão **corretas**. O erro é, quase certamente, devido a um **token de sessão antigo**.
                        <br>
                        **AÇÃO:** Por favor, clique no botão "Sair" e depois faça o login novamente. Isso forçará a aquisição de um novo token.
                        <br><br>
                        Detalhe do Erro: <span class="font-mono text-xs block mt-1 p-2 bg-red-100 rounded">${errorMessage}</span>
                    </p>
                    <button onclick="handleLogout()" class="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition duration-150 mt-3">
                        Sair e Tentar Novamente
                    </button>
                </div>
            `;
        }
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
