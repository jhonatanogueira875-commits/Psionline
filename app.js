/* app.js - Versão com Dashboard Admin completo
   Cards, gráfico de barras (atendimentos por mês),
   gráfico de linhas (novos usuários por mês) e
   lista de próximos agendamentos.
   Requer:
   - supabase-js v2 carregado antes
   - Chart.js CDN carregado antes deste arquivo
*/

const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.error("ERRO: Supabase não inicializado");

let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "dashboard";

/* -------------------------
   Utilitários e Formatação
   ------------------------- */

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return '-';
    // Formato: 22/11/2025 10:30
    return date.toLocaleDateString('pt-BR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        hour12: false
    });
};

/* -------------------------
   Autenticação básica
   ------------------------- */
async function handleLogin(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Falha no login: " + error.message);
        return;
    }

    currentAuthSession = data.session;
    
    // Buscar perfil do usuário para verificar o papel (role)
    const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

    if (profileError || !profileData || profileData.role !== 'admin') {
        alert("Acesso negado. Usuário não é administrador.");
        await supabaseClient.auth.signOut();
        currentAuthSession = null;
        render(); // Volta para a tela de login
        return;
    }

    currentPage = "admin";
    render();
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentAuthSession = null;
    currentPage = "login";
    currentAdminTab = "dashboard";
    render();
}

// Inicializa a escuta de mudanças de autenticação
supabaseClient.auth.onAuthStateChange((event, session) => {
    currentAuthSession = session;
    if (event === 'SIGNED_IN' && session) {
        // Quando o usuário faz login, buscamos o perfil para definir a página correta
        supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
            .then(({ data, error }) => {
                if (!error && data && data.role === 'admin') {
                    currentPage = "admin";
                } else {
                    // Se não for admin ou houver erro, desloga
                    supabaseClient.auth.signOut();
                    currentPage = "login";
                }
                render();
            });
    } else if (event === 'SIGNED_OUT') {
        currentPage = "login";
        render();
    }
});


/* ------------------------
   Views - Login
   ------------------------- */

function renderLogin() {
    return `
    <div class="flex justify-center items-center h-screen bg-gray-100 p-4">
        <div class="glass p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200">
            <h1 class="text-3xl font-extrabold text-gray-900 mb-6 text-center">Psionline Login</h1>
            <p class="text-sm text-gray-500 mb-6 text-center">Apenas para administradores.</p>
            <form id="login-form">
                <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input type="email" id="email" name="email" required class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <div class="mb-6">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <input type="password" id="password" name="password" required class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition duration-150 ease-in-out font-semibold shadow-md">
                    Entrar
                </button>
            </form>
        </div>
    </div>
    <script>
        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            handleLogin(email, password);
        });
    </script>
    `;
}

/* ------------------------
   Views - Admin Shell
   ------------------------- */

function renderAdminShell() {
    const isAdmin = currentAuthSession?.user?.role === 'admin';

    const renderNavButton = (tab, label, iconClass) => {
        const isActive = currentAdminTab === tab;
        const activeClasses = 'bg-indigo-600 text-white shadow-lg';
        const inactiveClasses = 'text-indigo-200 hover:bg-indigo-700/50 hover:text-white';
        return `
            <button onclick="setAdminTab('${tab}')" 
                    class="flex items-center space-x-3 p-3 rounded-xl transition duration-150 ease-in-out w-full text-left ${isActive ? activeClasses : inactiveClasses}">
                <i class="${iconClass} w-5 h-5 fa-fw"></i>
                <span class="font-medium">${label}</span>
            </button>
        `;
    };

    return `
    <div class="min-h-screen flex bg-gray-100">
        <!-- Sidebar -->
        <div class="w-64 bg-indigo-800 text-white flex flex-col fixed h-full shadow-2xl">
            <div class="p-6 border-b border-indigo-700">
                <h2 class="text-3xl font-bold tracking-tight">Psionline</h2>
                <p class="text-indigo-300 text-sm">Painel Administrativo</p>
            </div>
            <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
                ${renderNavButton('dashboard', 'Dashboard', 'fa-solid fa-gauge-high')}
                ${renderNavButton('profiles', 'Perfis de Usuário', 'fa-solid fa-users')}
                ${renderNavButton('appointments', 'Agendamentos', 'fa-solid fa-calendar-check')}
            </nav>
            <div class="p-4 border-t border-indigo-700">
                <button onclick="handleLogout()" class="w-full flex items-center justify-center space-x-2 p-3 bg-indigo-700 text-indigo-100 rounded-xl hover:bg-indigo-900 transition duration-150 ease-in-out font-semibold shadow-md">
                    <i class="fa-solid fa-right-from-bracket fa-fw"></i>
                    <span>Sair</span>
                </button>
            </div>
        </div>

        <!-- Conteúdo Principal -->
        <main id="admin-content" class="flex-1 p-8 ml-64 transition-all duration-300">
            <!-- Conteúdo específico da aba será injetado aqui -->
            <div class="flex justify-center items-center h-full">
                <div class="text-xl text-gray-500">Carregando...</div>
            </div>
        </main>
    </div>
    `;
}

// Função utilitária para mudar a aba e re-renderizar
window.setAdminTab = (tab) => {
    currentAdminTab = tab;
    renderAdminContent();
};

/* ------------------------
   Views - Admin Content Switch
   ------------------------- */

function renderAdminContent() {
    const contentDiv = document.getElementById('admin-content');
    if (!contentDiv) return;

    // Coloca um loader enquanto o conteúdo real carrega
    contentDiv.innerHTML = `<div class="p-8"><div class="animate-pulse text-gray-400">Carregando ${currentAdminTab}...</div></div>`;

    switch (currentAdminTab) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'profiles':
            renderProfilesDashboard();
            break;
        case 'appointments':
            renderAppointmentsDashboard();
            break;
        default:
            contentDiv.innerHTML = `<h1 class="text-3xl font-bold mb-6">Página não encontrada</h1>`;
    }
}

/* ------------------------
   Dashboard - Agendamentos
   ------------------------- */

async function renderAppointmentsDashboard() {
    const contentDiv = document.getElementById('admin-content');
    if (!contentDiv) return;

    let html = `<h1 class="text-3xl font-bold text-gray-800 mb-6">Agendamentos</h1>`;

    try {
        // 1. Fetch Agendamentos com Joins
        // O RLS garante que só veremos o que nos pertence (Admin vê tudo, Psicólogo vê os seus)
        const { data: appointments, error } = await supabaseClient
            .from('appointments')
            .select(`
                *,
                patient:patient_id(full_name, email, phone),
                psychologist:psychologist_id(full_name, email, phone)
            `)
            .order('scheduled_date', { ascending: true }); // Ordena por data

        if (error) throw error;

        // Formata a lista de agendamentos
        const appointmentListHtml = appointments.map(app => {
            const patientName = app.patient?.full_name || 'Paciente Não Encontrado';
            const psyName = app.psychologist?.full_name || 'Psicólogo Não Encontrado';
            const dateStr = formatDate(app.scheduled_date);
            
            let statusClass = 'text-xs font-semibold px-2 py-0.5 rounded-full';
            switch (app.status) {
                case 'scheduled':
                    statusClass += ' bg-blue-100 text-blue-800';
                    break;
                case 'completed':
                    statusClass += ' bg-green-100 text-green-800';
                    break;
                case 'canceled':
                    statusClass += ' bg-red-100 text-red-800';
                    break;
                default:
                    statusClass += ' bg-gray-100 text-gray-800';
            }

            return `
                <li class="flex items-center justify-between p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition duration-200 mb-3 border-l-4 border-indigo-500">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-3 mb-1">
                            <i class="fa-solid fa-calendar-day text-indigo-600 fa-fw"></i>
                            <span class="text-lg font-bold text-gray-800">${dateStr}</span>
                            <span class="${statusClass}">${app.status.toUpperCase()}</span>
                        </div>
                        <p class="text-sm text-gray-600 truncate">
                            <strong>Paciente:</strong> ${patientName} 
                            (${app.patient?.email || 'N/A'})
                        </p>
                        <p class="text-sm text-gray-600 truncate">
                            <strong>Psicólogo:</strong> ${psyName} 
                            (${app.psychologist?.email || 'N/A'})
                        </p>
                    </div>
                    <div>
                        <button class="text-sm bg-indigo-500 text-white px-3 py-1 rounded-full hover:bg-indigo-600 transition">Detalhes</button>
                    </div>
                </li>
            `;
        }).join('');

        html += `
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <h2 class="text-xl font-semibold mb-4 text-gray-700">Próximos Agendamentos (${appointments.length})</h2>
                ${appointments.length > 0 ? `<ul class="space-y-3">${appointmentListHtml}</ul>` : '<p class="text-gray-500">Nenhum agendamento encontrado.</p>'}
            </div>
        `;

    } catch (e) {
        html += `<div class="p-4 mt-6 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                    <p class="font-bold">Erro ao carregar agendamentos:</p>
                    <p class="text-sm">${e.message}</p>
                 </div>`;
        console.error("Erro no renderAppointmentsDashboard:", e);
    }
    
    // AQUI ESTAVA A CHAVE EXTRA QUE CAUSAVA O ERRO DE SINTAXE.
    contentDiv.innerHTML = html;
}

/* ------------------------
   Dashboard - Perfis de Usuário (Versão Simplificada)
   ------------------------- */

async function renderProfilesDashboard() {
    const contentDiv = document.getElementById('admin-content');
    if (!contentDiv) return;

    let html = `<h1 class="text-3xl font-bold text-gray-800 mb-6">Gerenciamento de Perfis</h1>`;

    try {
        // A busca simples funciona graças ao RLS:
        // Admin: vê todos; Psicólogo: vê só o próprio; Paciente: vê só o próprio.
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const profileListHtml = profiles.map(p => {
            const roleClass = p.role === 'admin' ? 'bg-red-100 text-red-800' : 
                              p.role === 'psychologist' ? 'bg-green-100 text-green-800' : 
                              'bg-indigo-100 text-indigo-800';

            return `
                <li class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border-l-4 border-indigo-400 mb-2">
                    <div class="flex-1 min-w-0">
                        <p class="text-lg font-semibold text-gray-800">${p.full_name || 'Nome Não Informado'}</p>
                        <p class="text-sm text-gray-600 truncate">${p.email || 'E-mail não disponível'}</p>
                    </div>
                    <div class="flex-shrink-0">
                        <span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${roleClass}">${p.role.toUpperCase()}</span>
                    </div>
                </li>
            `;
        }).join('');

        html += `
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <h2 class="text-xl font-semibold mb-4 text-gray-700">Perfis Ativos (${profiles.length})</h2>
                ${profiles.length > 0 ? `<ul class="space-y-2">${profileListHtml}</ul>` : '<p class="text-gray-500">Nenhum perfil encontrado.</p>'}
            </div>
        `;

    } catch (e) {
        html += `<div class="p-4 mt-6 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                    <p class="font-bold">Erro ao carregar perfis:</p>
                    <p class="text-sm">${e.message}</p>
                 </div>`;
        console.error("Erro no renderProfilesDashboard:", e);
    }

    contentDiv.innerHTML = html;
}


/* ------------------------
   Dashboard - Gráficos e Cards (PLACEHOLDER)
   ------------------------- */

async function renderDashboard() {
    const contentDiv = document.getElementById('admin-content');
    if (!contentDiv) return;

    let html = `<h1 class="text-3xl font-bold text-gray-800 mb-6">Dashboard Administrativo</h1>`;

    // Cards de resumo (PLACEHOLDER)
    html += `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- Card 1 -->
            <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
                <div class="flex items-center">
                    <i class="fa-solid fa-users text-3xl text-indigo-500 mr-4"></i>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Total de Usuários</p>
                        <p class="text-2xl font-bold text-gray-900">120</p>
                    </div>
                </div>
            </div>
            <!-- Card 2 -->
            <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                <div class="flex items-center">
                    <i class="fa-solid fa-calendar-check text-3xl text-green-500 mr-4"></i>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Agendamentos Mês</p>
                        <p class="text-2xl font-bold text-gray-900">45</p>
                    </div>
                </div>
            </div>
            <!-- Card 3 -->
            <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
                <div class="flex items-center">
                    <i class="fa-solid fa-hand-holding-dollar text-3xl text-yellow-500 mr-4"></i>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Receita Estimada</p>
                        <p class="text-2xl font-bold text-gray-900">${formatCurrency(9800.00)}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Área para Conteúdo Principal (Agendamentos e Perfis no futuro) -->
        <div class="bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-xl font-semibold mb-4 text-gray-700">Relatório de Atividade (Mock)</h2>
            <p class="text-gray-500">Gráficos de uso e receita seriam inseridos aqui usando Chart.js.</p>
            <div class="h-64 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center mt-4">
                <span class="text-gray-400">Placeholder para Gráfico de Barras/Linhas</span>
            </div>
        </div>
    `;

    contentDiv.innerHTML = html;
}


/* ------------------------
   Render principal
   ------------------------- */

function render() {
  const app = document.getElementById('app');
  if (!app) return console.error("#app não encontrado");
  if (currentPage === 'login') { app.innerHTML = renderLogin(); return; }
  if (currentPage === 'admin') { app.innerHTML = renderAdminShell(); renderAdminContent(); return; }
  app.innerHTML = "<p>Página desconhecida</p>";
}

/* ------------------------
   Início da Aplicação
   ------------------------- */

// Tenta reautenticar ao carregar a página
if (!currentAuthSession) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // O onAuthStateChange acima cuidará da verificação do perfil e do render.
        } else {
            render();
        }
    });
} else {
    render();
}
