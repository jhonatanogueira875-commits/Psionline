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
let currentAppointmentId = null; 
let currentUserId = null; // Novo estado para armazenar o ID do usuário sendo editado

/* -------------------------
   Utilitários de Navegação
   ------------------------- */

// Função para mudar a página e renderizar novamente
function navigate(page, id = null) {
    currentAppointmentId = null;
    currentUserId = null;
    
    if (page === 'edit_appointment' && id) {
        currentAppointmentId = id;
    } else if (page === 'edit_profile' && id) {
        currentUserId = id;
    }
    
    currentPage = page;
    render();
}

/* -------------------------
   Autenticação básica
   ------------------------- */
async function handleLogin(email, password) {
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (error) {
        document.getElementById('login-message').innerText = `Erro de Login: ${error.message}`;
        console.error("Erro de login:", error);
    }
}

function handleLogout() {
    supabaseClient.auth.signOut();
}

async function checkAdminRole(userId) {
    console.log(`Verificando status de administrador/ROLE para o ID: ${userId}`);
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignora 'zero rows' no primeiro login

        const role = data?.role;
        console.log(`Role encontrada: ${role}. É Admin? ${role === 'admin'}`);
        return role === 'admin';
    } catch (e) {
        console.error("Erro ao verificar admin role:", e);
        return false;
    }
}

// Listener de estado de autenticação
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log(`Evento de Autenticação: ${event}`);
    currentAuthSession = session;
    if (session) {
        console.log(`Usuário autenticado: ${session.user.id}`);
        // Verifica o role e navega
        checkAdminRole(session.user.id).then(isAdmin => {
            if (isAdmin) {
                navigate('admin');
            } else {
                // Se não for admin, desloga (ou navega para uma página de erro/bloqueio)
                handleLogout();
                navigate('login');
                // Substituído por modal ou mensagem de erro customizada em produção
                console.error("Acesso negado. Apenas administradores podem acessar este painel.");
                const app = document.getElementById('app');
                if (app) app.innerHTML = `<div class="p-10 text-center text-red-700">Acesso negado. Você não é um administrador.</div>`;
            }
        }).catch(e => {
            console.error("Erro na checagem de role:", e);
            navigate('login');
        });
    } else {
        navigate('login');
    }
});


/* ------------------------
   API de Dados (Supabase)
   ------------------------ */

// Busca dados para os cards do dashboard (total de usuários, agendamentos, etc.)
async function getDashboardCardsData() {
    const data = {
        totalUsers: 0,
        totalAppointments: 0,
        activePsychologists: 0
    };

    try {
        // 1. Total de Usuários (profiles)
        let { count: userCount, error: userError } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        if (userError) throw userError;
        data.totalUsers = userCount;

        // 2. Total de Agendamentos (appointments)
        let { count: appCount, error: appError } = await supabaseClient
            .from('appointments')
            .select('*', { count: 'exact', head: true });
        if (appError) throw appError;
        data.totalAppointments = appCount;

        // 3. Psicólogos Ativos (profiles com role 'psychologist')
        let { count: psyCount, error: psyError } = await supabaseClient
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'psychologist');
        if (psyError) throw psyError;
        data.activePsychologists = psyCount;

    } catch (e) {
        console.error("Erro ao buscar dados dos cards:", e);
    }
    return data;
}

// Busca dados para o gráfico de novos usuários por mês (Mock)
async function getNewUsersByMonth() {
    return {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        data: [12, 19, 3, 5, 2, 3]
    };
}

// Busca os 5 próximos agendamentos ordenados por data
async function getAppointments() {
    try {
        const { data, error } = await supabaseClient
            .from('appointments')
            .select('*, patient:patient_id(full_name), psychologist:psychologist_id(full_name)')
            .order('scheduled_date', { ascending: true })
            .limit(5);

        if (error) throw error;
        return { data, error: null };
    } catch (e) {
        console.error("Erro ao buscar agendamentos:", e);
        return { data: [], error: e };
    }
}

// Busca um único agendamento pelo ID
async function getAppointmentById(id) {
    try {
        const { data, error } = await supabaseClient
            .from('appointments')
            .select('*, patient:patient_id(id, full_name), psychologist:psychologist_id(id, full_name)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (e) {
        console.error(`Erro ao buscar agendamento ${id}:`, e);
        return { data: null, error: e };
    }
}

// Atualiza um agendamento
async function updateAppointment(id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        console.log("Agendamento atualizado com sucesso:", data);
        return { data, error: null };
    } catch (e) {
        console.error(`Erro ao atualizar agendamento ${id}:`, e);
        return { data: null, error: e };
    }
}

// NOVO: Busca todos os usuários (perfis)
async function getUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (e) {
        console.error("Erro ao buscar usuários:", e);
        return { data: [], error: e };
    }
}

// NOVO: Busca um único perfil pelo ID
async function getProfileById(id) {
    try {
        // Nota: Não temos acesso direto ao email do auth.users, apenas ao profile.
        // Assumimos que a tabela 'profiles' tem todas as informações necessárias,
        // mas para o email, precisaríamos de uma View ou RLS configurada corretamente no Supabase.
        // Para simplificar, vamos buscar o user e o profile.
        
        // 1. Busca o perfil
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', id)
            .single();
        
        if (profileError) throw profileError;

        // 2. Busca o email na tabela 'auth.users' (REQUER RLS ESPECÍFICO DE ADMIN)
        // Por não termos certeza das permissões de RLS, vamos retornar apenas o que
        // está disponível na tabela 'profiles', e pedir ao usuário para adicionar o email
        // ao perfil se for necessário a edição.
        
        // Simulação de busca do email (Apenas para demonstração, já que o Supabase RLS
        // não permite acesso direto à tabela auth.users sem permissões elevadas).
        // Vamos usar o ID como placeholder para o email se o campo não existir.
        
        // O campo 'email' não está em 'profiles' por padrão. Vamos pular a edição de email por RLS.

        return { data: profileData, error: null };

    } catch (e) {
        console.error(`Erro ao buscar perfil ${id}:`, e);
        return { data: null, error: e };
    }
}

// NOVO: Atualiza um perfil
async function updateProfile(id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        console.log("Perfil atualizado com sucesso:", data);
        return { data, error: null };
    } catch (e) {
        console.error(`Erro ao atualizar perfil ${id}:`, e);
        return { data: null, error: e };
    }
}


/* ------------------------
   Renderização dos Componentes
   ------------------------ */

// Renderiza o formulário de login (permanece inalterado)
function renderLogin() {
    return `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-2xl">
                <div class="text-center">
                    <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
                        Psionline
                    </h2>
                    <p class="mt-2 text-sm text-gray-600">
                        Painel Administrativo
                    </p>
                </div>
                <form class="mt-8 space-y-6" onsubmit="event.preventDefault(); handleLogin(document.getElementById('email').value, document.getElementById('password').value);">
                    <input type="hidden" name="remember" value="true">
                    <div class="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label for="email" class="sr-only">Email</label>
                            <input id="email" name="email" type="email" autocomplete="email" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Email">
                        </div>
                        <div>
                            <label for="password" class="sr-only">Senha</label>
                            <input id="password" name="password" type="password" autocomplete="current-password" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Senha">
                        </div>
                    </div>

                    <div>
                        <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Entrar
                        </button>
                    </div>
                    <p id="login-message" class="text-center text-sm text-red-600"></p>
                </form>
            </div>
        </div>
    `;
}

// Renderiza o shell do Admin (permanece inalterado, mas agora o header reflete a página)
function renderAdminShell() {
    let headerTitle = '';
    if (currentPage === 'admin') {
        headerTitle = currentAdminTab === 'dashboard' ? 'Dashboard' :
                      currentAdminTab === 'users' ? 'Gestão de Usuários' :
                      currentAdminTab === 'appointments' ? 'Gestão de Agendamentos' : '';
    } else if (currentPage === 'edit_appointment') {
        headerTitle = 'Editor de Agendamento';
    } else if (currentPage === 'edit_profile') {
        headerTitle = 'Editor de Perfil';
    }

    return `
        <div class="min-h-screen flex font-sans bg-gray-50">
            <!-- Sidebar -->
            <div class="flex flex-col w-64 bg-indigo-800 text-white p-4 shadow-xl">
                <div class="text-2xl font-bold mb-8">Psionline Admin</div>
                <nav class="flex-grow">
                    <a href="#" onclick="currentAdminTab='dashboard'; navigate('admin'); return false;"
                       class="flex items-center p-3 rounded-lg transition duration-150 ease-in-out ${currentAdminTab === 'dashboard' && currentPage === 'admin' ? 'bg-indigo-700 font-semibold' : 'hover:bg-indigo-700'}">
                       <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2-2m2 2v10a1 1 0 00-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                       Dashboard
                    </a>
                    <a href="#" onclick="currentAdminTab='users'; navigate('admin'); return false;"
                       class="flex items-center p-3 rounded-lg transition duration-150 ease-in-out mt-1 ${currentAdminTab === 'users' && currentPage === 'admin' ? 'bg-indigo-700 font-semibold' : 'hover:bg-indigo-700'}">
                       <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                       Usuários
                    </a>
                    <a href="#" onclick="currentAdminTab='appointments'; navigate('admin'); return false;"
                       class="flex items-center p-3 rounded-lg transition duration-150 ease-in-out mt-1 ${currentAdminTab === 'appointments' && currentPage === 'admin' ? 'bg-indigo-700 font-semibold' : 'hover:bg-indigo-700'}">
                       <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                       Agendamentos
                    </a>
                </nav>
                <button onclick="handleLogout()" class="mt-4 flex items-center justify-center p-3 rounded-lg text-red-300 bg-indigo-700 hover:bg-red-700 hover:text-white transition duration-150 ease-in-out">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-3m6-6V7a3 3 0 013-3h2a3 3 0 013 3v4"></path></svg>
                    Sair
                </button>
            </div>

            <!-- Conteúdo Principal -->
            <main id="admin-content-main" class="flex-grow p-6 sm:p-8 overflow-y-auto">
                <header class="mb-6 pb-4 border-b border-gray-200">
                    <h1 class="text-3xl font-bold text-gray-800" id="header-title">
                        ${headerTitle}
                    </h1>
                </header>
                <div id="content-container">Carregando conteúdo...</div>
            </main>
        </div>
    `;
}

// Renderiza um card do dashboard (permanece inalterado)
function renderCard(title, value, colorClass) {
    return `
        <div class="p-6 ${colorClass} text-white rounded-xl shadow-lg">
            <p class="text-sm font-medium opacity-80">${title}</p>
            <p class="text-4xl font-bold mt-2">${value}</p>
        </div>
    `;
}

// Renderiza a lista de Agendamentos (MODIFICADO para ser clicável)
function renderAppointmentsList(appsResult) {
    const apps = appsResult.data;
    if (appsResult.error) {
        return `<div class="p-4 text-red-700 bg-red-100 rounded-lg">Erro: ${appsResult.error.message}</div>`;
    }
    
    if (apps.length === 0) {
        return `<p class="text-gray-600 italic">Nenhum agendamento futuro encontrado.</p>`;
    }

    const list = apps.map(a => {
        // Garantindo acesso aos dados do JOIN
        const patient = Array.isArray(a.patient)?a.patient[0]:a.patient;
        const psy = Array.isArray(a.psychologist)?a.psychologist[0]:a.psychologist;
        const formattedDate = new Date(a.scheduled_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        
        // Adiciona um evento onClick que chama navigate('edit_appointment', a.id)
        return `
            <li onclick="navigate('edit_appointment', '${a.id}')"
                class="p-3 border border-gray-200 rounded-lg mb-2 cursor-pointer transition duration-150 ease-in-out hover:bg-indigo-50 hover:border-indigo-400">
                <div class="font-semibold text-gray-800">${patient?.full_name||'Paciente'} - ${psy?.full_name||'Psicólogo'}</div>
                <div class="text-sm text-gray-600 flex justify-between items-center">
                    <span>${formattedDate}</span>
                    <span class="text-xs font-medium text-indigo-600">EDITAR ></span>
                </div>
            </li>
        `;
    }).join('');
    
    return `<ul class="divide-y divide-gray-100">${list}</ul>`;
}

// Função para inicializar gráficos (requer Chart.js) (permanece inalterado)
function renderChart(canvasId, labels, data, type, title) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Destroi gráfico anterior se existir
    if (window.chartInstances && window.chartInstances[canvasId]) {
        window.chartInstances[canvasId].destroy();
    }

    const newChart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: type === 'bar' ? 'rgba(79, 70, 229, 0.7)' : 'rgba(99, 102, 241, 0.2)',
                borderColor: type === 'line' ? 'rgb(99, 102, 241)' : 'rgba(79, 70, 229, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: type === 'line'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    if (!window.chartInstances) window.chartInstances = {};
    window.chartInstances[canvasId] = newChart;
}

// Renderiza o Dashboard (Cards e Gráficos)
async function renderDashboardContent() {
    const container = document.getElementById('content-container');
    if (!container) return;
    
    // Esqueleto de Carregamento
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white rounded-xl shadow-lg animate-pulse h-32"></div>
            <div class="p-6 bg-white rounded-xl shadow-lg animate-pulse h-32"></div>
            <div class="p-6 bg-white rounded-xl shadow-lg animate-pulse h-32"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 p-6 bg-white rounded-xl shadow-lg h-96">
                <h2 class="text-2xl font-semibold mb-4 text-gray-800">Gráfico de Novos Usuários</h2>
                <canvas id="newUsersChart" class="w-full h-80"></canvas>
            </div>
            <div id="appointments-list-card" class="p-6 bg-white rounded-xl shadow-lg lg:col-span-1 h-96">
                <h2 class="text-2xl font-semibold mb-4 text-gray-800">Próximos Agendamentos</h2>
                <div class="space-y-3 animate-pulse">
                    <div class="h-10 bg-gray-200 rounded"></div>
                    <div class="h-10 bg-gray-200 rounded"></div>
                    <div class="h-10 bg-gray-200 rounded"></div>
                    <div class="h-10 bg-gray-200 rounded"></div>
                    <div class="h-10 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    `;

    // Busca os dados
    const cardsData = await getDashboardCardsData();
    const appointmentsResult = await getAppointments();
    const chartData = await getNewUsersByMonth();
    
    // Monta o HTML final dos cards
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            ${renderCard('Total de Usuários', cardsData.totalUsers, 'bg-indigo-500')}
            ${renderCard('Agendamentos', cardsData.totalAppointments, 'bg-green-500')}
            ${renderCard('Psicólogos Ativos', cardsData.activePsychologists, 'bg-yellow-500')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 p-6 bg-white rounded-xl shadow-lg">
                <h2 class="text-2xl font-semibold mb-4 text-gray-800">Gráfico de Novos Usuários (Mock)</h2>
                <canvas id="newUsersChart"></canvas>
            </div>
            <div id="appointments-list-card" class="p-6 bg-white rounded-xl shadow-lg lg:col-span-1">
                <h2 class="text-2xl font-semibold mb-4 text-gray-800">Próximos Agendamentos</h2>
                ${renderAppointmentsList(appointmentsResult)}
            </div>
        </div>
    `;

    // Renderiza o gráfico
    renderChart('newUsersChart', chartData.labels, chartData.data, 'line', 'Novos Usuários');
}

// Implementação para Gestão de Usuários
async function renderUsersContent() {
    const container = document.getElementById('content-container');
    if (!container) return;

    // Esqueleto de Carregamento
    container.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">Todos os Usuários</h2>
            <div class="space-y-3 animate-pulse">
                <div class="h-10 bg-gray-200 rounded w-full"></div>
                <div class="h-10 bg-gray-200 rounded w-full"></div>
                <div class="h-10 bg-gray-200 rounded w-full"></div>
            </div>
        </div>
    `;

    const usersResult = await getUsers();
    const users = usersResult.data;

    if (usersResult.error) {
        container.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg">Erro: ${usersResult.error.message}</div>`;
        return;
    }

    if (users.length === 0) {
        container.innerHTML = `<p class="text-gray-600 italic py-10 text-center">Nenhum usuário cadastrado.</p>`;
        return;
    }
    
    const tableRows = users.map(user => {
        const isSelf = user.id === currentAuthSession?.user.id;
        
        return `
            <tr class="border-b hover:bg-indigo-50 cursor-pointer" onclick="navigate('edit_profile', '${user.id}')">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${user.full_name || 'Nome Não Informado'}
                    ${isSelf ? '<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Você</span>' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    ${user.role}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="#" onclick="event.stopPropagation(); navigate('edit_profile', '${user.id}'); return false;" class="text-indigo-600 hover:text-indigo-900">
                        Editar
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="bg-white shadow-xl rounded-xl overflow-hidden">
            <div class="p-6">
                <h2 class="text-2xl font-bold mb-4 text-gray-800">Todos os Usuários (${users.length})</h2>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nome Completo
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Papel (Role)
                            </th>
                            <th scope="col" class="relative px-6 py-3">
                                <span class="sr-only">Editar</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Renderiza a tela de edição de agendamento (Permanece a mesma)
async function renderAppointmentEditor() {
    const container = document.getElementById('content-container');
    if (!container || !currentAppointmentId) {
        navigate('admin'); 
        return;
    }
    
    // Esqueleto de Carregamento
    container.innerHTML = `
        <div class="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">Carregando Agendamento...</h2>
            <div class="space-y-4 animate-pulse">
                <div class="h-8 bg-gray-200 rounded w-3/4"></div>
                <div class="h-8 bg-gray-200 rounded w-full"></div>
                <div class="h-10 bg-gray-200 rounded"></div>
            </div>
        </div>
    `;

    const result = await getAppointmentById(currentAppointmentId);
    const appointment = result.data;

    if (result.error || !appointment) {
        container.innerHTML = `
            <div class="max-w-xl mx-auto p-6 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-lg">
                <p class="font-bold">Erro ao Carregar Agendamento</p>
                <p>${result.error ? result.error.message : 'Dados não encontrados.'}</p>
                <button onclick="navigate('admin')" class="mt-4 text-indigo-600 hover:text-indigo-800 font-medium">
                    Voltar ao Dashboard
                </button>
            </div>
        `;
        return;
    }

    // Nomes e IDs
    const patient = Array.isArray(appointment.patient)?appointment.patient[0]:appointment.patient;
    const psy = Array.isArray(appointment.psychologist)?appointment.psychologist[0]:appointment.psychologist;
    const patientName = patient?.full_name || 'Paciente Não Encontrado';
    const psyName = psy?.full_name || 'Psicólogo Não Encontrado';
    
    // Formata a data e hora para os inputs HTML
    const scheduledDate = new Date(appointment.scheduled_date);
    const datePart = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timePart = scheduledDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Status disponíveis
    const statuses = ['scheduled', 'completed', 'canceled', 'rescheduled'];

    // Monta o formulário de Edição
    container.innerHTML = `
        <div class="max-w-xl mx-auto p-8 bg-white rounded-xl shadow-2xl">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <h2 class="text-3xl font-bold text-indigo-700">Editar Agendamento</h2>
                <button onclick="navigate('admin')" class="text-gray-500 hover:text-gray-800 transition">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <form id="appointment-editor-form" onsubmit="event.preventDefault(); handleAppointmentUpdate();">
                <!-- Info do Paciente/Psicólogo -->
                <div class="mb-6 space-y-2">
                    <p class="text-lg font-medium text-gray-800">Paciente:</p>
                    <p class="p-3 bg-indigo-50 border border-indigo-200 rounded-lg font-semibold">${patientName}</p>
                    <p class="text-lg font-medium text-gray-800 pt-2">Psicólogo:</p>
                    <p class="p-3 bg-indigo-50 border border-indigo-200 rounded-lg font-semibold">${psyName}</p>
                </div>

                <!-- Campo Data -->
                <div class="mb-4">
                    <label for="scheduled_date" class="block text-sm font-medium text-gray-700 mb-1">Data:</label>
                    <input type="date" id="scheduled_date" name="scheduled_date" value="${datePart}" required
                        class="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                
                <!-- Campo Hora -->
                <div class="mb-4">
                    <label for="scheduled_time" class="block text-sm font-medium text-gray-700 mb-1">Hora:</label>
                    <input type="time" id="scheduled_time" name="scheduled_time" value="${timePart}" required
                        class="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                </div>

                <!-- Campo Status -->
                <div class="mb-6">
                    <label for="status" class="block text-sm font-medium text-gray-700 mb-1">Status:</label>
                    <select id="status" name="status" required
                        class="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                        ${statuses.map(s => `
                            <option value="${s}" ${appointment.status === s ? 'selected' : ''}>
                                ${s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Mensagem de Status -->
                <p id="update-message" class="text-center text-sm font-medium mb-4"></p>

                <!-- Botão de Ação -->
                <button type="submit" id="update-button" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                    Salvar Alterações
                </button>
            </form>
        </div>
    `;
}

// Função para lidar com a submissão do formulário de atualização de agendamento (Permanece a mesma)
async function handleAppointmentUpdate() {
    const form = document.getElementById('appointment-editor-form');
    const updateButton = document.getElementById('update-button');
    const message = document.getElementById('update-message');

    if (!form || !currentAppointmentId) return;

    // Desabilitar o botão e mostrar carregamento
    updateButton.disabled = true;
    updateButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Salvando...
    `;
    message.className = 'text-center text-sm font-medium mb-4 text-gray-500';
    message.innerText = 'Processando...';

    const dateInput = form.querySelector('#scheduled_date').value;
    const timeInput = form.querySelector('#scheduled_time').value;
    const newStatus = form.querySelector('#status').value;
    
    // Cria um objeto de data e hora no formato ISO string (Supabase)
    const newScheduledDate = `${dateInput}T${timeInput}:00Z`; // Adiciona :00 e Z para UTC

    const updates = {
        scheduled_date: newScheduledDate,
        status: newStatus
    };

    const { error } = await updateAppointment(currentAppointmentId, updates);

    if (error) {
        message.className = 'text-center text-sm font-medium mb-4 text-red-600';
        message.innerText = `Erro ao salvar: ${error.message}`;
    } else {
        message.className = 'text-center text-sm font-medium mb-4 text-green-600';
        message.innerText = '✅ Agendamento atualizado com sucesso!';
        
        // Opcional: Voltar para o dashboard após um pequeno atraso
        setTimeout(() => {
            navigate('admin');
        }, 1500);
    }

    // Reabilitar o botão se não houve navegação
    if (currentPage === 'edit_appointment') {
        updateButton.disabled = false;
        updateButton.innerHTML = 'Salvar Alterações';
    }
}


// NOVO: Renderiza a tela de edição de Perfil
async function renderProfileEditor() {
    const container = document.getElementById('content-container');
    if (!container || !currentUserId) {
        navigate('admin'); // Volta se não houver ID
        return;
    }
    
    // Esqueleto de Carregamento
    container.innerHTML = `
        <div class="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">Carregando Perfil...</h2>
            <div class="space-y-4 animate-pulse">
                <div class="h-8 bg-gray-200 rounded w-3/4"></div>
                <div class="h-8 bg-gray-200 rounded w-full"></div>
                <div class="h-10 bg-gray-200 rounded"></div>
            </div>
        </div>
    `;

    const result = await getProfileById(currentUserId);
    const profile = result.data;
    
    if (result.error || !profile) {
        container.innerHTML = `
            <div class="max-w-xl mx-auto p-6 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-lg">
                <p class="font-bold">Erro ao Carregar Perfil</p>
                <p>${result.error ? result.error.message : 'Dados não encontrados.'}</p>
                <button onclick="navigate('admin')" class="mt-4 text-indigo-600 hover:text-indigo-800 font-medium">
                    Voltar aos Usuários
                </button>
            </div>
        `;
        return;
    }

    // Papéis disponíveis
    const roles = ['admin', 'psychologist', 'patient'];
    const isSelf = profile.id === currentAuthSession?.user.id;
    const warningText = isSelf 
        ? "⚠️ Cuidado ao mudar seu próprio papel (role)! Isso pode bloquear seu acesso ao painel." 
        : "";

    // Monta o formulário de Edição
    container.innerHTML = `
        <div class="max-w-xl mx-auto p-8 bg-white rounded-xl shadow-2xl">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <h2 class="text-3xl font-bold text-indigo-700">Editar Perfil</h2>
                <button onclick="currentAdminTab='users'; navigate('admin');" class="text-gray-500 hover:text-gray-800 transition">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            ${warningText ? `<div class="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg text-sm font-medium">${warningText}</div>` : ''}

            <form id="profile-editor-form" onsubmit="event.preventDefault(); handleProfileUpdate('${profile.id}');">
                <!-- Campo Nome Completo -->
                <div class="mb-4">
                    <label for="full_name" class="block text-sm font-medium text-gray-700 mb-1">Nome Completo:</label>
                    <input type="text" id="full_name" name="full_name" value="${profile.full_name || ''}" required
                        class="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                </div>

                <!-- Campo Papel (Role) -->
                <div class="mb-6">
                    <label for="role" class="block text-sm font-medium text-gray-700 mb-1">Papel (Role):</label>
                    <select id="role" name="role" required
                        class="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                        ${roles.map(r => `
                            <option value="${r}" ${profile.role === r ? 'selected' : ''}>
                                ${r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Mensagem de Status -->
                <p id="update-profile-message" class="text-center text-sm font-medium mb-4"></p>

                <!-- Botão de Ação -->
                <button type="submit" id="update-profile-button" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                    Salvar Alterações do Perfil
                </button>
            </form>
        </div>
    `;
}

// NOVO: Função para lidar com a submissão do formulário de atualização de perfil
async function handleProfileUpdate(userId) {
    const form = document.getElementById('profile-editor-form');
    const updateButton = document.getElementById('update-profile-button');
    const message = document.getElementById('update-profile-message');

    if (!form || !userId) return;

    // Desabilitar o botão e mostrar carregamento
    updateButton.disabled = true;
    updateButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Salvando...
    `;
    message.className = 'text-center text-sm font-medium mb-4 text-gray-500';
    message.innerText = 'Processando...';

    const newFullName = form.querySelector('#full_name').value;
    const newRole = form.querySelector('#role').value;
    
    const updates = {
        full_name: newFullName,
        role: newRole
    };

    const { error } = await updateProfile(userId, updates);

    if (error) {
        message.className = 'text-center text-sm font-medium mb-4 text-red-600';
        message.innerText = `Erro ao salvar: ${error.message}`;
    } else {
        message.className = 'text-center text-sm font-medium mb-4 text-green-600';
        message.innerText = '✅ Perfil atualizado com sucesso!';
        
        // Se o usuário mudou o próprio role de 'admin' para outra coisa, desloga
        if (userId === currentAuthSession?.user.id && newRole !== 'admin') {
            setTimeout(() => {
                handleLogout(); // O listener de auth se encarrega do resto
            }, 1000);
        } else {
             // Opcional: Voltar para a lista de usuários após um pequeno atraso
            setTimeout(() => {
                currentAdminTab = 'users';
                navigate('admin');
            }, 1500);
        }
    }

    // Reabilitar o botão se não houve navegação
    if (currentPage === 'edit_profile') {
        updateButton.disabled = false;
        updateButton.innerHTML = 'Salvar Alterações do Perfil';
    }
}


// Função para renderizar o conteúdo específico do Admin
function renderAdminContent() {
    const container = document.getElementById('content-container');
    if (!container) return;
    
    // Garante que o Chart.js está carregado antes de tentar renderizar o dashboard
    if (currentAdminTab === 'dashboard') {
        // Verifica se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            // Se não, carrega o script do Chart.js dinamicamente (para o HTML/Immersive)
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js";
            script.onload = renderDashboardContent;
            document.head.appendChild(script);
            container.innerHTML = `<div class="text-center py-10 text-gray-600">Carregando bibliotecas de gráfico...</div>`;
        } else {
            renderDashboardContent();
        }
    } else if (currentAdminTab === 'users') {
        renderUsersContent(); // Nova função para listar usuários
    } else if (currentAdminTab === 'appointments') {
        // Para a aba de agendamentos (ainda em construção, mas agora separa o conteúdo)
        container.innerHTML = `<div class="text-center py-20 text-gray-500 text-xl">
                                  🚧 Gestão de Agendamentos (Tabela Completa) em construção 🚧
                                  <p class="mt-2 text-base">A lista completa virá aqui!</p>
                               </div>`;
    } else {
        container.innerHTML = `<p class="text-center py-20 text-red-500">Aba desconhecida.</p>`;
    }
}

// Adicionamos a lógica de navegação para a página de edição de perfil no render principal
function render() {
  const app = document.getElementById('app');
  if (!app) return console.error("#app não encontrado");

  // Atualiza o título do cabeçalho
  const header = document.getElementById('header-title');
  if (header) {
      if (currentPage === 'edit_appointment') {
          header.innerText = 'Editor de Agendamento';
      } else if (currentPage === 'edit_profile') {
          header.innerText = 'Editor de Perfil';
      } else if (currentPage === 'admin') {
          header.innerText = currentAdminTab === 'dashboard' ? 'Dashboard' :
                             currentAdminTab === 'users' ? 'Gestão de Usuários' :
                             currentAdminTab === 'appointments' ? 'Gestão de Agendamentos' : '';
      }
  }
  
  if (currentPage === 'login') { 
    app.innerHTML = renderLogin(); 
    return; 
  }
  
  if (currentPage === 'admin') { 
    app.innerHTML = renderAdminShell(); 
    // Garante que o conteúdo administrativo principal é carregado
    setTimeout(renderAdminContent, 0); 
    return; 
  }
  
  if (currentPage === 'edit_appointment') {
    app.innerHTML = renderAdminShell();
    setTimeout(renderAppointmentEditor, 0); 
    return;
  }
  
  if (currentPage === 'edit_profile') {
    app.innerHTML = renderAdminShell();
