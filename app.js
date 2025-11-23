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
   Autenticação básica
   ------------------------- */
async function handleLogin(email, password) {
  try {
    const { data: { session }, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw new Error("Falha no login: " + error.message);
    if (!session) throw new Error("Sessão não criada. Verifique credenciais.");
    
    const user = session.user;
    
    // 1. Verificar se o usuário possui a role 'admin'
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1);

    if (rolesError) throw new Error("Erro ao buscar role: " + rolesError.message);
    
    // Verificação defensiva: RLS pode retornar data nula mesmo sem error explícito
    if (!userRoles || userRoles.length === 0 || userRoles[0].role !== 'admin') {
        throw new Error("Acesso negado: Usuário não é administrador ou role não encontrada.");
    }

    // Login de administrador bem-sucedido
    currentAuthSession = session;
    currentPage = 'admin';
    render();

  } catch (e) {
    alert(e.message); // Usando alert() provisório para erro fatal
    console.error(e);
    renderLogin(); // Volta para o login em caso de falha
  }
}

function handleLogout() {
  // Limpa o estado da aplicação e força a volta para a página de login
  currentAuthSession = null;
  currentPage = 'login';
  render();
}

/* -------------------------
   Elementos de UI
   ------------------------- */

function renderLogin() {
  return `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div class="glass w-full max-w-md p-8 space-y-6 rounded-xl shadow-2xl">
        <h2 class="text-3xl font-bold text-center text-gray-800">Psionline Admin</h2>
        <form id="loginForm" class="space-y-4">
          <div>
            <label for="email" class="text-sm font-medium text-gray-700">Email</label>
            <input type="email" id="email" required 
                   class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
          </div>
          <div>
            <label for="password" class="text-sm font-medium text-gray-700">Senha</label>
            <input type="password" id="password" required 
                   class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
          </div>
          <button type="submit" 
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 transform hover:scale-[1.01]">
            Entrar
          </button>
        </form>
      </div>
    </div>
    <script>
        document.getElementById('loginForm').onsubmit = (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password);
        };
    </script>
  `;
}

function renderAdminShell() {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2.586a1 1 0 01.293-.707l2-2a1 1 0 011.414 0l2 2a1 1 0 01.293.707V17a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>' },
    { id: 'appointments', name: 'Agendamentos', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>' },
    { id: 'users', name: 'Usuários', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0118 14v4h-2zM2 15a4 4 0 004 3v-3h-4z"/></svg>' },
  ];

  const navLinks = tabs.map(tab => {
    const isActive = currentAdminTab === tab.id;
    const activeClasses = 'bg-indigo-600 text-white shadow-lg';
    const inactiveClasses = 'text-indigo-700 hover:bg-indigo-100';
    
    return `
      <a href="#" data-tab="${tab.id}" 
         class="tab-link flex items-center space-x-2 px-4 py-2 rounded-lg transition duration-200 ${isActive ? activeClasses : inactiveClasses}">
        ${tab.icon}
        <span class="font-medium">${tab.name}</span>
      </a>
    `;
  }).join('');

  return `
    <div class="min-h-screen bg-gray-100 flex flex-col">
        <!-- Header -->
        <header class="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
            <div class="text-xl font-bold text-indigo-700">Psionline - Painel Admin</div>
            <button id="logoutBtn" class="flex items-center space-x-2 text-red-600 hover:text-red-800 transition duration-150">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/></svg>
                <span>Sair</span>
            </button>
        </header>

        <!-- Main Content Area -->
        <main class="flex-grow p-4 md:p-8">
            <div class="max-w-7xl mx-auto">
                <!-- Navigation Tabs -->
                <nav class="flex space-x-4 p-2 bg-white rounded-xl shadow-lg mb-8">
                    ${navLinks}
                </nav>

                <!-- Content Area -->
                <div id="adminContent">
                    <!-- Conteúdo dinâmico será injetado aqui -->
                    <div class="flex justify-center items-center h-64">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                        <span class="ml-3 text-lg text-gray-600">Carregando dados...</span>
                    </div>
                </div>
            </div>
        </main>

    </div>
    <script>
        document.getElementById('logoutBtn').onclick = handleLogout;
        document.querySelectorAll('.tab-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                currentAdminTab = e.currentTarget.dataset.tab;
                render(); // Re-renderiza o shell para atualizar o estado da navegação
            };
        });
    </script>
  `;
}

/* -------------------------
   Gráficos e Funções de Dash
   ------------------------- */
   
// Variável global para armazenar a instância do Chart.js
let myChart = null;

/**
 * Desenha o gráfico de atendimentos por mês (Dashboard).
 * Requer o Chart.js carregado.
 */
async function drawAppointmentsChart(ctx) {
  if (!supabaseClient) return;
  
  // Destrói a instância anterior do gráfico se existir
  if (myChart) {
    myChart.destroy();
    myChart = null;
  }
  
  try {
    // 1. Fetch de dados de agendamentos
    const monthlyApps = await supabaseClient
      .from('appointments')
      .select('scheduled_date');

    if (monthlyApps.error) throw new Error(monthlyApps.error.message);
    
    // **CORREÇÃO RLS/NULL**: Verifica se 'data' veio nula devido a RLS
    if (!monthlyApps.data) throw new Error("Erro de permissão na tabela 'appointments' (RLS) para o gráfico.");

    // 2. Processamento dos dados
    const monthlyData = {};
    monthlyApps.data.forEach(app => {
      if (app.scheduled_date) {
        const date = new Date(app.scheduled_date);
        // Formato AAAA-MM
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
      }
    });
    
    // 3. Preparação dos dados para o gráfico (Ordenado)
    const sortedKeys = Object.keys(monthlyData).sort();
    const labels = sortedKeys.map(key => key.replace('-', '/')); // MM/AAAA
    const data = sortedKeys.map(key => monthlyData[key]);

    // 4. Criação do gráfico
    myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Atendimentos Realizados',
          data: data,
          backgroundColor: 'rgba(79, 70, 229, 0.8)',
          borderColor: 'rgb(79, 70, 229)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Nº de Atendimentos' }
          }
        },
        plugins: {
            legend: { display: false }
        }
      }
    });

  } catch (e) {
    console.error("Erro ao carregar gráfico de atendimentos:", e);
    // Exibe mensagem de erro na área do gráfico
    const chartContainer = ctx.closest('div');
    if (chartContainer) {
        chartContainer.innerHTML = `<div class="p-4 text-center text-red-700 bg-red-100 rounded-lg">Falha ao carregar o gráfico: ${e.message}</div>`;
    }
  }
}

/**
 * Desenha o gráfico de novos usuários por mês (Dashboard).
 * Requer o Chart.js carregado.
 */
async function drawNewUsersChart(ctx) {
    if (!supabaseClient) return;
    
    try {
        // 1. Fetch de dados de usuários
        // Aqui assumimos que 'created_at' está disponível na tabela 'users' (auth.users)
        const users = await supabaseClient.from('users').select('created_at');

        if (users.error) throw new Error(users.error.message);
        
        // **CORREÇÃO RLS/NULL**: Verifica se 'data' veio nula devido a RLS
        if (!users.data) throw new Error("Erro de permissão na tabela 'users' (RLS) para o gráfico.");
        
        // 2. Processamento dos dados
        const monthlyUsers = {};
        users.data.forEach(user => {
            if (user.created_at) {
                const date = new Date(user.created_at);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyUsers[monthYear] = (monthlyUsers[monthYear] || 0) + 1;
            }
        });

        // 3. Preparação dos dados para o gráfico (Ordenado)
        const sortedKeys = Object.keys(monthlyUsers).sort();
        const labels = sortedKeys.map(key => key.replace('-', '/'));
        const data = sortedKeys.map(key => monthlyUsers[key]);

        // 4. Criação do gráfico
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Novos Usuários',
                    data: data,
                    fill: true,
                    backgroundColor: 'rgba(252, 165, 165, 0.2)', // rose-300
                    borderColor: 'rgb(244, 63, 94)', // rose-600
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Nº de Usuários' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

    } catch (e) {
        console.error("Erro ao carregar gráfico de novos usuários:", e);
        const chartContainer = ctx.closest('div');
        if (chartContainer) {
            chartContainer.innerHTML = `<div class="p-4 text-center text-red-700 bg-red-100 rounded-lg">Falha ao carregar o gráfico: ${e.message}</div>`;
        }
    }
}

/* -------------------------
   Conteúdo do Painel Admin
   ------------------------- */

async function renderAdminContent() {
  const main = document.getElementById('adminContent');
  if (!main || !supabaseClient) return;

  // Renderiza o conteúdo da aba selecionada
  if (currentAdminTab === 'dashboard') {
    // Layout do Dashboard
    main.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- Card 1: Total de Usuários -->
            <div class="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between transition duration-300 hover:shadow-xl">
                <div>
                    <p class="text-sm font-medium text-gray-500">Total de Usuários</p>
                    <p id="totalUsers" class="text-3xl font-bold text-gray-900 mt-1">...</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-indigo-400" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0118 14v4h-2zM2 15a4 4 0 004 3v-3h-4z"/></svg>
            </div>
            
            <!-- Card 2: Atendimentos no Mês -->
            <div class="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between transition duration-300 hover:shadow-xl">
                <div>
                    <p class="text-sm font-medium text-gray-500">Atendimentos no Mês</p>
                    <p id="monthlyApps" class="text-3xl font-bold text-gray-900 mt-1">...</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
            </div>
            
            <!-- Card 3: Próximo Agendamento -->
            <div class="bg-white p-6 rounded-xl shadow-lg transition duration-300 hover:shadow-xl">
                <p class="text-sm font-medium text-gray-500">Próximo Agendamento</p>
                <p id="nextApp" class="text-xl font-bold text-gray-900 mt-1 break-words">...</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Gráfico 1: Atendimentos Mensais -->
            <div class="bg-white p-6 rounded-xl shadow-lg h-96">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Evolução Mensal de Atendimentos</h3>
                <canvas id="appointmentsChart"></canvas>
            </div>

            <!-- Gráfico 2: Novos Usuários -->
            <div class="bg-white p-6 rounded-xl shadow-lg h-96">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Novos Usuários por Mês</h3>
                <canvas id="newUsersChart"></canvas>
            </div>
        </div>
    `;

    // 1. Cards (Carregamento assíncrono)
    try {
        // Total de Usuários
        const { count: totalUsers, error: userError } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
        if (userError) throw new Error(userError.message);
        document.getElementById('totalUsers').textContent = totalUsers !== null ? totalUsers : 'N/A';

        // Atendimentos no Mês
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count: monthlyAppsCount, error: appsError } = await supabaseClient
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .gt('scheduled_date', startOfMonth);
        if (appsError) throw new Error(appsError.message);
        document.getElementById('monthlyApps').textContent = monthlyAppsCount !== null ? monthlyAppsCount : 'N/A';

        // Próximo Agendamento
        const now = new Date().toISOString();
        const { data: nextApp, error: nextAppError } = await supabaseClient
            .from('appointments')
            .select(`
                scheduled_date,
                patient:patient_id (full_name)
            `)
            .gte('scheduled_date', now)
            .order('scheduled_date', { ascending: true })
            .limit(1)
            .single();

        if (nextAppError && nextAppError.code !== 'PGRST116') { // PGRST116 é "No rows found"
            // Se for outro erro (como RLS), lança
            throw new Error(nextAppError.message);
        }

        if (nextApp) {
            const patientName = nextApp.patient?.full_name || 'Paciente Desconhecido';
            const date = new Date(nextApp.scheduled_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            document.getElementById('nextApp').innerHTML = `
                <span class="text-lg text-indigo-600">${date}</span><br>
                com ${patientName}
            `;
        } else {
            document.getElementById('nextApp').textContent = 'Nenhum agendamento futuro.';
        }

    } catch (e) {
        console.error("Erro ao carregar Cards:", e);
        // Exibe erro na área de conteúdo
        main.innerHTML = `<div class="p-6 bg-red-100 rounded-xl shadow-lg text-red-800">
            <h2 class="font-bold mb-2">Erro ao carregar dados do Dashboard!</h2>
            <p><strong>Causa provável:</strong> Problema de Permissão (RLS) nas tabelas <code>users</code> ou <code>appointments</code>.</p>
            <p class="mt-2 text-sm">${e.message}</p>
        </div>`;
        return; // Sai da função para não tentar desenhar gráficos com erro
    }
    
    // 2. Gráficos (Somente se os dados dos cards carregaram)
    const chartCtx1 = document.getElementById('appointmentsChart').getContext('2d');
    const chartCtx2 = document.getElementById('newUsersChart').getContext('2d');
    
    drawAppointmentsChart(chartCtx1);
    drawNewUsersChart(chartCtx2);
    
    return;
  } 
  
  // Renderiza a aba de Agendamentos (Tabela)
  if (currentAdminTab === 'appointments') {
    main.innerHTML = `<div class="p-6 bg-white rounded-xl shadow-lg">Carregando agendamentos...</div>`;
    
    try {
        // ESTE É UM PONTO ONDE PODE TER PROBLEMAS DE PERMISSÃO/REQUISIÇÃO (RLS)
        const apps = await supabaseClient
            .from('appointments')
            .select(`
                id, scheduled_date,
                patient:patient_id (full_name, id),
                psychologist:psychologist_id (full_name, id)
            `)
            .order('scheduled_date', { ascending: true }); // Ordena do mais antigo para o mais novo

        if (apps.error) throw new Error(apps.error.message);
        
        // **CORREÇÃO RLS/NULL**: Verifica se 'data' veio nula devido a RLS
        if (!apps.data) throw new Error("Erro de permissão na tabela 'appointments' (RLS). Verifique se o RLS está desativado para o ADMIN.");


        const list = apps.data.map(a => {
            // Mapeia para garantir que 'patient' e 'psychologist' são objetos (handle join results)
            const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
            const psy = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
            
            const dateStr = new Date(a.scheduled_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

            return `
                <li class="p-4 border-b border-gray-200 hover:bg-gray-50 transition duration-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="font-medium text-indigo-600 truncate">${dateStr}</div>
                    <div>${patient?.full_name || 'Paciente [ID ' + patient?.id + ']'}</div>
                    <div class="text-sm text-gray-600">${psy?.full_name || 'Psicólogo [ID ' + psy?.id + ']'}</div>
                    <div class="text-right text-sm text-gray-500">${a.id}</div>
                </li>
            `;
        }).join('');
        
        main.innerHTML = `
            <div class="p-6 bg-white rounded-xl shadow-lg">
                <h2 class="text-2xl font-semibold mb-4 text-gray-800">Próximos Agendamentos (${apps.data.length})</h2>
                <ul class="divide-y divide-gray-200">
                    <li class="p-4 bg-gray-50 font-bold grid grid-cols-1 md:grid-cols-4 gap-4 rounded-t-lg border-b-2 border-indigo-200 hidden md:grid">
                        <div>Data/Hora</div>
                        <div>Paciente</div>
                        <div>Psicólogo</div>
                        <div class="text-right">ID</div>
                    </li>
                    ${list || '<li class="p-4 text-gray-600 italic">Nenhum agendamento encontrado.</li>'}
                </ul>
            </div>
        `;
    } catch (e) {
        // Exibe o erro de forma clara, mencionando o RLS
        main.innerHTML = `
            <div class="p-6 bg-red-100 rounded-xl shadow-lg text-red-800">
                <h2 class="font-bold mb-2">Falha ao carregar agendamentos!</h2>
                <p><strong>Causa provável:</strong> Problema de Permissão (RLS) na tabela <code>appointments</code>.</p>
                <p class="mt-2 text-sm">${e.message}</p>
            </div>
        `;
    }
    return;
  }

  // Renderiza a aba de Usuários
  if (currentAdminTab === 'users') {
    main.innerHTML = `<div class="p-6 bg-white rounded-xl shadow-lg">Carregando usuários...</div>`;
    
    try {
        // ESTE É UM PONTO ONDE PODE TER PROBLEMAS DE PERMISSÃO/REQUISIÇÃO (RLS)
        const users = await supabaseClient
            .from('users')
            .select(`
                id, email, created_at,
                profiles:id (full_name) 
            `)
            .order('created_at', { ascending: false });

        if (users.error) throw new Error(users.error.message);
        
        // **CORREÇÃO RLS/NULL**: Verifica se 'data' veio nula devido a RLS
        if (!users.data) throw new Error("Erro de permissão na tabela 'users' (RLS). Verifique se o RLS está desativado para o ADMIN.");

        const list = users.data.map(u => {
            const profile = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
            const dateStr = new Date(u.created_at).toLocaleDateString('pt-BR');

            return `
                <li class="p-4 border-b border-gray-200 hover:bg-gray-50 transition duration-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="font-medium truncate">${profile?.full_name || 'Sem nome (ID ' + u.id + ')'}</div>
                    <div class="text-sm text-indigo-600 truncate">${u.email}</div>
                    <div class="text-sm text-gray-600">${dateStr}</div>
                    <div class="text-right text-sm text-gray-500 truncate">${u.id}</div>
                </li>
            `;
        }).join('');
        
        main.innerHTML = `
            <div class="p-6 bg-white rounded-xl shadow-lg">
                <h2 class="text-2xl font-semibold mb-4 text-gray-800">Usuários Cadastrados (${users.data.length})</h2>
                <ul class="divide-y divide-gray-200">
                    <li class="p-4 bg-gray-50 font-bold grid grid-cols-1 md:grid-cols-4 gap-4 rounded-t-lg border-b-2 border-indigo-200 hidden md:grid">
                        <div>Nome</div>
                        <div>Email</div>
                        <div>Criação</div>
                        <div class="text-right">ID (UID)</div>
                    </li>
                    ${list || '<li class="p-4 text-gray-600 italic">Nenhum usuário encontrado.</li>'}
                </ul>
            </div>
        `;
    } catch (e) {
        main.innerHTML = `
            <div class="p-6 bg-red-100 rounded-xl shadow-lg text-red-800">
                <h2 class="font-bold mb-2">Falha ao carregar usuários!</h2>
                <p><strong>Causa provável:</strong> Problema de Permissão (RLS) na tabela <code>users</code> ou <code>profiles</code>.</p>
                <p class="mt-2 text-sm">${e.message}</p>
            </div>
        `;
    }
    return;
  }
}

/* -------------------------
   Render principal
   ------------------------- */

// Esta função agora precisa ser exposta globalmente, conforme o index.html espera.
function render() {
  const app = document.getElementById('app');
  if (!app) return console.error("#app não encontrado");
  if (currentPage === 'login') { app.innerHTML = renderLogin(); return; }
  if (currentPage === 'admin') { app.innerHTML = renderAdminShell(); renderAdminContent(); return; }
  app.innerHTML = "<p>Página desconhecida</p>";
}

// Expõe a função render para ser chamada pelo index.html após o carregamento
window.render = render;
