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
   Utilitários globais
   ------------------------- */

// Função para mudar a página (usada pelo index.html)
function setCurrentPage(newPage) {
    console.log(`Página alterada: de ${currentPage} para ${newPage}`);
    currentPage = newPage;
}

// Função para atualizar o estado da sessão (usada pelo index.html)
function setCurrentSession(session) {
    currentAuthSession = session;
}

/* -------------------------
   Autenticação básica
   ------------------------- */
async function handleLogin(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) throw error;
    console.log("Login bem-sucedido:", data.user.email);
    setCurrentPage('admin');
    render(); // Re-renderiza para mostrar o painel admin
  } catch (error) {
    console.error("Erro de login:", error.message);
    document.getElementById('login-message').innerText = `Erro: ${error.message}`;
  }
}

async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    console.log("Logout bem-sucedido.");
    setCurrentPage('login');
    render(); // Re-renderiza para mostrar a tela de login
  } catch (error) {
    console.error("Erro de logout:", error.message);
  }
}

/* -------------------------
   Views HTML
   ------------------------- */

function renderLogin() {
  // Tela de login
  return `
    <div class="flex flex-col items-center justify-center h-screen p-4 bg-gray-100">
        <div class="glass p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h1 class="text-3xl font-bold text-center text-indigo-700 mb-6">Psionline Admin</h1>
            <form id="login-form">
                <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input type="email" id="email" name="email" placeholder="seu.admin@dominio.com" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div class="mb-6">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <input type="password" id="password" name="password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition duration-150 ease-in-out shadow-md">
                    Entrar
                </button>
                <p id="login-message" class="text-sm text-red-600 mt-4 text-center"></p>
            </form>
        </div>
    </div>
  `;
}

function renderAdminShell() {
  // Layout principal do painel admin (apenas a estrutura)
  return `
    <div class="min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-white shadow-md z-10 sticky top-0">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-indigo-600">Psionline Admin</h1>
                <nav class="flex space-x-4">
                    <button onclick="changeAdminTab('dashboard')" class="tab-button p-2 rounded-md ${currentAdminTab === 'dashboard' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}">
                        Dashboard
                    </button>
                    <button onclick="changeAdminTab('users')" class="tab-button p-2 rounded-md ${currentAdminTab === 'users' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}">
                        Usuários
                    </button>
                    <button onclick="handleLogout()" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-150">
                        Sair
                    </button>
                </nav>
            </div>
        </header>
        <!-- Main Content -->
        <main id="admin-content" class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div class="text-center p-10">
                <div class="animate-pulse text-gray-500">Carregando conteúdo...</div>
            </div>
        </main>
    </div>
  `;
}

/* -------------------------
   Renderização dos Cards e Gráficos
   ------------------------- */
async function renderDashboard() {
  const main = document.getElementById('admin-content');
  if (!main) return console.error("#admin-content não encontrado para dashboard");

  try {
    // 1. Obter Cards (Exemplo: Total de Usuários)
    const { count: totalUsers } = await supabaseClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    const dashboardHtml = `
      <h2 class="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
      
      <!-- Cards de Métricas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
          <p class="text-sm font-medium text-gray-500">Total de Usuários</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">${totalUsers || 0}</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-teal-500">
          <p class="text-sm font-medium text-gray-500">Agendamentos Pendentes</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">24</p> <!-- Mock Data -->
        </div>
        <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
          <p class="text-sm font-medium text-gray-500">Psicólogos Ativos</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">12</p> <!-- Mock Data -->
        </div>
      </div>
      
      <!-- Seção de Agendamentos e Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Gráficos -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-4 text-gray-800">Atendimentos por Mês (Gráfico de Barras)</h3>
            <canvas id="appointmentsChart" class="h-80 w-full"></canvas>
          </div>
          <div class="bg-white p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-4 text-gray-800">Novos Usuários (Gráfico de Linhas)</h3>
            <canvas id="usersChart" class="h-80 w-full"></canvas>
          </div>
        </div>

        <!-- Próximos Agendamentos -->
        <div class="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Próximos Agendamentos</h3>
          <ul id="upcoming-appointments-list" class="space-y-3">
            <!-- Loader inicial -->
            <li class="p-3 border rounded mb-2 text-center text-gray-500">Carregando...</li>
          </ul>
        </div>
      </div>
    `;

    main.innerHTML = dashboardHtml;

    // A renderização dos gráficos e agendamentos deve ser feita APÓS a injeção do HTML
    await renderCharts();
    await renderUpcomingAppointments();

  } catch (e) {
    console.error("Erro ao renderizar dashboard:", e);
    main.innerHTML = `
      <div class="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-xl mt-6">
        <h2 class="text-2xl font-bold mb-3">🚨 Erro ao Carregar Dashboard</h2>
        <p>Houve um problema ao buscar os dados iniciais. Verifique a conexão com o Supabase e as regras de RLS.</p>
        <p class="mt-2 font-mono text-sm">Detalhe: ${e.message}</p>
      </div>
    `;
  }
}

async function renderCharts() {
    // Carrega a biblioteca Chart.js se ainda não estiver carregada (idealmente estaria no index.html)
    if (typeof window.Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
    }
    
    // Dados Mock para os gráficos
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const appointmentsData = [12, 19, 3, 5, 2, 3];
    const usersData = [2, 5, 8, 15, 18, 20];

    // Gráfico de Barras (Atendimentos)
    const appCtx = document.getElementById('appointmentsChart');
    if (appCtx) {
      new Chart(appCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Atendimentos Realizados',
            data: appointmentsData,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Gráfico de Linhas (Novos Usuários)
    const userCtx = document.getElementById('usersChart');
    if (userCtx) {
        new Chart(userCtx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Novos Usuários',
                data: usersData,
                borderColor: 'rgb(20, 184, 166)',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                tension: 0.4,
                fill: true,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: { y: { beginAtZero: true } }
            }
          });
    }
}

async function renderUpcomingAppointments() {
  const list = document.getElementById('upcoming-appointments-list');
  if (!list) return;

  try {
    // 2. Obter próximos agendamentos (Join com psychologist e patient)
    const apps = await supabaseClient
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        patient:patient_id (full_name),
        psychologist:psychologist_id (full_name)
      `)
      .limit(5)
      .order('scheduled_date', { ascending: true });

    if (apps.error) throw apps.error;

    if (apps.data.length === 0) {
      list.innerHTML = `<li class="p-3 text-center text-gray-600">Nenhum agendamento futuro encontrado.</li>`;
    } else {
      list.innerHTML = apps.data.map(a => {
        // Garantir que é um objeto mesmo que o Supabase retorne um array de 1 elemento devido ao JOIN
        const patient = Array.isArray(a.patient)?a.patient[0]:a.patient;
        const psy = Array.isArray(a.psychologist)?a.psychologist[0]:a.psychologist;
        return `
          <li class="p-3 border rounded-xl bg-white shadow-sm hover:shadow-md transition duration-150">
            <div class="font-semibold text-indigo-700">${patient?.full_name||'Paciente Desconhecido'}</div>
            <div class="text-sm text-gray-500">Psicólogo(a): ${psy?.full_name||'Não Atribuído'}</div>
            <div class="text-xs text-gray-400">Data: ${a.scheduled_date||'N/A'}</div>
          </li>
        `;
      }).join('');
    }
  } catch (e) {
    console.error("Erro ao carregar agendamentos:", e);
    list.innerHTML = `<li class="p-4 bg-red-50 rounded-lg text-red-700 border border-red-200">Erro: ${e.message}</li>`;
  }
}

async function renderUsersContent() {
  const main = document.getElementById('admin-content');
  if (!main) return console.error("#admin-content não encontrado para usuários");

  try {
    const { data: users, error } = await supabaseClient
      .from('users')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const listHtml = users.map(user => `
      <tr class="border-b hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.full_name}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-semibold">${user.role}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(user.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

    main.innerHTML = `
      <h2 class="text-3xl font-bold text-gray-800 mb-6">Gerenciamento de Usuários</h2>
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Completo</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desde</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${listHtml}
          </tbody>
        </table>
        ${users.length === 0 ? '<p class="p-6 text-center text-gray-500">Nenhum usuário cadastrado.</p>' : ''}
      </div>
    `;
  } catch (e) {
    console.error("Erro ao renderizar usuários:", e);
    main.innerHTML = `
      <div class="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-xl mt-6">
        <h2 class="text-2xl font-bold mb-3">🚨 Erro ao Carregar Usuários</h2>
        <p>Houve um problema ao buscar a lista de usuários.</p>
        <p class="mt-2 font-mono text-sm">Detalhe: ${e.message}</p>
      </div>
    `;
  }
}

function renderAdminContent() {
  const app = document.getElementById('app');
  if (!app) return console.error("#app não encontrado para conteúdo admin");

  // Adiciona o listener para o formulário de login (se ainda não estiver presente)
  // Este listener deve ser adicionado *após* renderLogin() ser injetado, mas aqui ele
  // só é chamado se estiver na página 'admin'. O listener de login é tratado na exportação.

  switch (currentAdminTab) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'users':
      renderUsersContent();
      break;
    default:
      document.getElementById('admin-content').innerHTML = `
        <div class="text-center p-10 bg-yellow-100 rounded-lg">
          <p>Aba de administração desconhecida: ${currentAdminTab}</p>
        </div>
      `;
      break;
  }
}

function changeAdminTab(tab) {
  currentAdminTab = tab;
  renderAdminContent(); // Re-renderiza o conteúdo interno
  // O shell principal (renderAdminShell) não precisa ser re-renderizado, apenas o conteúdo interno
}


/* -------------------------
   Render principal
   ------------------------- */

function render() {
  const app = document.getElementById('app');
  if (!app) return console.error("#app não encontrado");
  
  try {
    if (currentPage === 'login') { 
        console.log("RENDER: Exibindo tela de Login.");
        app.innerHTML = renderLogin(); 
        return; 
    }
    
    if (currentPage === 'admin') { 
        console.log("RENDER: Exibindo Shell Admin.");
        app.innerHTML = renderAdminShell(); 
        // O conteúdo do admin (dashboard/users) é carregado em uma etapa separada após o Shell.
        renderAdminContent(); 
        return; 
    }
    
    app.innerHTML = "<p>Página desconhecida</p>";

  } catch (e) {
    console.error("ERRO CRÍTICO na função render():", e);
    // Exibe a mensagem de erro no lugar do loader/aplicação
    app.innerHTML = `
        <div class="flex justify-center items-center h-screen bg-red-100">
            <div class="text-center p-8 max-w-lg w-full text-red-800 bg-white border border-red-400 rounded-lg shadow-2xl">
                <p class="font-bold text-xl mb-3">🚨 Erro Crítico na Renderização 🚨</p>
                <p class="text-base mb-4">
                    Ocorreu um erro inesperado ao tentar exibir a interface. Verifique o console para mais detalhes.
                </p>
                <p class="text-sm text-red-600 font-mono">
                    Detalhe: ${e.message}
                </p>
            </div>
        </div>
    `;
  }
}

/* -------------------------
   Exportações e Inicialização
   ------------------------- */

// Exporta as funções necessárias para o index.html
export { render, setCurrentPage, setCurrentSession, handleLogin, handleLogout, supabaseClient };

// O listener de submissão do formulário de login precisa ser adicionado após a primeira renderização do login
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'login-form') {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        await handleLogin(email, password);
    }
});/* app.js - Versão com Dashboard Admin completo
   Cards, gráfico de barras (atendimentos por mês),
   gráfico de linhas (novos usuários por mês) e
   lista de próximos agendamentos.
   Requer:
   - supabase-js v2 carregado antes
   - Chart.js CDN carregado antes deste arquivo
*/

const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

// Certifique-se de que a biblioteca Chart.js está disponível globalmente.
if (typeof Chart === 'undefined') {
    console.error("ERRO: Chart.js não está carregado. Por favor, adicione a CDN antes de app.js.");
}

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.error("ERRO: Supabase não inicializado");

let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "dashboard";
let db = null; // Instância do Firestore (manter por compatibilidade/futuro, mas usaremos Supabase)

/* -------------------------
   Utilitários de Datas
   ------------------------- */

// Simula dados dos últimos 12 meses para o gráfico
function getLast12Months() {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }));
    }
    return months;
}

// Mapeia atendimentos/usuários por mês (dados mockados para demonstração)
function mapDataByMonth(data) {
    const months = getLast12Months();
    const monthlyData = {};
    months.forEach(month => monthlyData[month] = 0);

    // Em um cenário real, você processaria os dados do Supabase
    // para preencher 'monthlyData' com contagens reais.
    // Usando dados mockados por enquanto:
    monthlyData[months[months.length - 1]] = 15; // Mês atual
    monthlyData[months[months.length - 2]] = 12;
    monthlyData[months[months.length - 3]] = 8;
    // ... e assim por diante
    return monthlyData;
}


/* -------------------------
   Autenticação básica
   ------------------------- */
async function handleLogin(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        currentAuthSession = data.session;
        // Simular que o usuário logado é um administrador
        // Em um sistema real, você verificaria o perfil/role do usuário
        if (data.user) {
            currentPage = "admin";
            render();
        } else {
            console.error("Usuário sem permissão de administrador.");
            alert("Acesso negado. Apenas administradores.");
        }

    } catch (error) {
        console.error("Erro no login:", error.message);
        // Não usar alert(), mas por ser o login, vamos manter por enquanto
        // Idealmente, usaríamos um modal customizado.
        alert("Erro no login: " + error.message);
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        currentAuthSession = null;
        currentPage = "login";
        render();
    } catch (error) {
        console.error("Erro no logout:", error.message);
    }
}

/* -------------------------
   Views de Login
   ------------------------- */
function renderLogin() {
    return `
        <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h1 class="text-3xl font-bold text-center text-indigo-700 mb-6">Psionline Admin</h1>
                <form id="loginForm">
                    <div class="mb-4">
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <input type="email" id="email" required placeholder="admin@psionline.com"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
                    </div>
                    <div class="mb-6">
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                        <input type="password" id="password" required value="123456"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
                    </div>
                    <button type="submit" id="loginButton"
                            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg">
                        Entrar
                    </button>
                </form>
                <p class="text-xs text-gray-500 text-center mt-4">
                    Use admin@psionline.com / 123456 para testar.
                </p>
            </div>
        </div>
    `;
}

function attachLoginEvents() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const button = document.getElementById('loginButton');

            button.disabled = true;
            button.textContent = 'Aguarde...';

            await handleLogin(email, password);

            button.disabled = false;
            if (currentPage === 'login') {
                 button.textContent = 'Entrar'; // Reverter se falhar
            }
        });
    }
}

/* -------------------------
   Layout Admin (Shell)
   ------------------------- */
function renderAdminShell() {
    const tabs = [
        { id: 'dashboard', name: 'Dashboard', icon: 'M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z' },
        { id: 'users', name: 'Usuários', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'appointments', name: 'Agendamentos', icon: 'M8 7V3m8 4V3m-9 8h.01M16 12h.01M16 16h.01M9 16h.01M5 12h.01M5 16h.01M8 21h8a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ];

    const tabNav = tabs.map(tab => {
        const isActive = tab.id === currentAdminTab;
        const activeClass = isActive ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50';
        return `
            <button id="tab-${tab.id}" data-tab="${tab.id}"
                class="flex items-center space-x-2 px-6 py-3 font-semibold transition duration-150 ${activeClass}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${tab.icon}"></path></svg>
                <span>${tab.name}</span>
            </button>
        `;
    }).join('');

    return `
        <div class="min-h-screen flex flex-col">
            <!-- Header/Navbar -->
            <header class="bg-white shadow-md sticky top-0 z-10">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
                    <h1 class="text-2xl font-extrabold text-indigo-800">Psionline</h1>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-500 hidden sm:inline">Bem-vindo(a), Admin!</span>
                        <button id="logoutButton" class="text-sm px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition duration-150 shadow-md">
                            Sair
                        </button>
                    </div>
                </div>
                <!-- Tab Navigation -->
                <nav class="bg-white border-t border-gray-200">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto">
                        ${tabNav}
                    </div>
                </nav>
            </header>

            <!-- Main Content Area -->
            <main id="adminContent" class="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto"></main>

            <!-- Footer (Opcional) -->
            <footer class="bg-gray-50 border-t border-gray-200 py-4 text-center text-xs text-gray-500">
                &copy; 2025 Psionline. Todos os direitos reservados.
            </footer>
        </div>
    `;
}

function attachAdminShellEvents() {
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);

    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const newTab = e.currentTarget.getAttribute('data-tab');
            if (newTab && newTab !== currentAdminTab) {
                currentAdminTab = newTab;
                render(); // Re-renderiza a página para atualizar o conteúdo
            }
        });
    });
}

/* -------------------------
   Conteúdo do Dashboard
   ------------------------- */

// Card de métricas reutilizável
function renderMetricCard(title, value, icon, bgColor, textColor) {
    return `
        <div class="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between ${bgColor} bg-opacity-10 border border-gray-200">
            <div>
                <p class="text-sm font-medium text-gray-500">${title}</p>
                <p class="text-3xl font-bold ${textColor} mt-1">${value}</p>
            </div>
            <div class="p-3 rounded-full ${bgColor} ${textColor} bg-opacity-90">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icon}"></path></svg>
            </div>
        </div>
    `;
}

// Funções para carregar e renderizar os gráficos
function loadAppointmentsPerMonthChart(mainElement) {
    const months = getLast12Months();
    const data = Object.values(mapDataByMonth());
    const ctx = document.getElementById('appointmentsChart')?.getContext('2d');

    if (!ctx) return;

    // Destrói gráfico existente para evitar duplicidade ou conflito
    if (window.appointmentsChartInstance) {
        window.appointmentsChartInstance.destroy();
    }

    // CRUCIAL: Configuração para estabilidade do gráfico
    window.appointmentsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Atendimentos Realizados',
                data: data,
                backgroundColor: 'rgba(79, 70, 229, 0.8)', // indigo-600
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        },
        options: {
            // ESSENCIAL para evitar a instabilidade (gráfico "indo para baixo")
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
}

function loadNewUsersPerMonthChart(mainElement) {
    const months = getLast12Months();
    const data = Object.values(mapDataByMonth()); // Reutilizando dados mockados
    const ctx = document.getElementById('usersChart')?.getContext('2d');

    if (!ctx) return;

    // Destrói gráfico existente para evitar duplicidade ou conflito
    if (window.usersChartInstance) {
        window.usersChartInstance.destroy();
    }

    // CRUCIAL: Configuração para estabilidade do gráfico
    window.usersChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Novos Usuários Cadastrados',
                data: data.map(v => Math.round(v * 1.5)), // Mocked: um pouco mais que atendimentos
                backgroundColor: 'rgba(16, 185, 129, 0.2)', // emerald-500
                borderColor: 'rgba(16, 185, 129, 1)',
                tension: 0.3,
                borderWidth: 3,
                fill: true
            }]
        },
        options: {
            // ESSENCIAL para evitar a instabilidade (gráfico "indo para baixo")
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
}


async function loadUpcomingAppointmentsList(mainElement) {
    // Simulando busca de dados (Adapte esta parte para a sua tabela real)
    try {
      const apps = await supabaseClient.from('appointments')
        .select(`
            scheduled_date,
            patient(full_name),
            psychologist(full_name)
        `)
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (apps.error) throw apps.error;
      
      const list = apps.data.map(a => {
        // Garantindo acesso seguro aos dados (mesma correção feita antes)
        const patient = Array.isArray(a.patient)?a.patient[0]:a.patient;
        const psy = Array.isArray(a.psychologist)?a.psychologist[0]:a.psychologist;
        
        const dateStr = a.scheduled_date ? new Date(a.scheduled_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

        return `<li class="p-3 border rounded mb-2 hover:bg-gray-50 transition duration-100">
                    <div class="font-semibold text-indigo-600">${patient?.full_name||'Paciente Não Informado'}</div>
                    <div class="text-sm text-gray-600">
                        <span class="font-medium">${psy?.full_name||'Psicólogo Não Informado'}</span> — ${dateStr}
                    </div>
                </li>`;
      }).join('');
      
      mainElement.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Próximos Agendamentos (${apps.data.length})</h2>
            <ul class="divide-y divide-gray-200">
                ${list||'<li class="text-gray-600 py-3">Nenhum agendamento futuro encontrado.</li>'}
            </ul>
        </div>
      `;
    } catch (e) {
      mainElement.innerHTML = `
        <div class="p-6 bg-red-100 rounded-xl shadow border border-red-300">
            <h2 class="text-xl font-bold text-red-700 mb-2">Erro ao carregar agendamentos</h2>
            <p class="text-red-600">${e.message}</p>
        </div>
      `;
    }
}


function renderDashboard() {
    // Mock Data para os Cards
    const totalUsers = '450';
    const activePsychologists = '12';
    const appointmentsThisMonth = '35';
    const revenueProjection = 'R$ 15.500';

    return `
        <h2 class="text-3xl font-bold text-gray-800 mb-6">Visão Geral</h2>
        <!-- Cards de Métricas -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            ${renderMetricCard('Total de Usuários', totalUsers, 'M17 20h-1a1 1 0 01-1-1v-4a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1zM7 20h10a1 1 0 001-1v-4a1 1 0 00-1-1H7a1 1 0 00-1 1v4a1 1 0 001 1z', 'bg-indigo-500', 'text-indigo-700')}
            ${renderMetricCard('Psicólogos Ativos', activePsychologists, 'M12 4.5v15m7.5-7.5h-15', 'bg-emerald-500', 'text-emerald-700')}
            ${renderMetricCard('Atendimentos Mês', appointmentsThisMonth, 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', 'bg-yellow-500', 'text-yellow-700')}
            ${renderMetricCard('Receita (Proj.)', revenueProjection, 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2', 'bg-rose-500', 'text-rose-700')}
        </div>
        
        <!-- Gráficos e Lista -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Gráfico de Atendimentos (Barra) - Col Span 2 -->
            <div class="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h3 class="text-xl font-semibold text-gray-700 mb-4">Atendimentos por Mês (Últimos 12)</h3>
                <!-- CRUCIAL: Definir uma altura para o contêiner do gráfico -->
                <div class="relative h-96"> 
                    <canvas id="appointmentsChart"></canvas>
                </div>
            </div>

            <!-- Próximos Agendamentos (Lista) - Col Span 1 -->
            <div id="upcomingAppointmentsContainer" class="lg:col-span-1">
                <!-- O conteúdo será carregado aqui por loadUpcomingAppointmentsList -->
                <div class="flex justify-center items-center h-full bg-gray-50 rounded-xl shadow-lg">
                    <p class="text-gray-500">Carregando agendamentos...</p>
                </div>
            </div>

            <!-- Gráfico de Novos Usuários (Linha) - Full Width -->
            <div class="lg:col-span-3 bg-white p-6 rounded-xl shadow-lg border border-gray-100 mt-4">
                <h3 class="text-xl font-semibold text-gray-700 mb-4">Novos Cadastros de Usuários (Últimos 12 Meses)</h3>
                <!-- CRUCIAL: Definir uma altura para o contêiner do gráfico -->
                <div class="relative h-96">
                    <canvas id="usersChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

async function renderAdminContent() {
    const main = document.getElementById('adminContent');
    if (!main) return;

    // Lógica para diferentes abas
    switch (currentAdminTab) {
        case 'dashboard':
            main.innerHTML = renderDashboard();
            // Carrega e renderiza os gráficos e a lista após o HTML ser inserido
            loadAppointmentsPerMonthChart(main);
            loadNewUsersPerMonthChart(main);
            loadUpcomingAppointmentsList(document.getElementById('upcomingAppointmentsContainer'));
            break;
        case 'users':
            main.innerHTML = '<h2 class="text-3xl font-bold mb-6">Gestão de Usuários</h2><p class="p-6 bg-white rounded-xl shadow">Funcionalidade de listagem e edição de usuários.</p>';
            break;
        case 'appointments':
            main.innerHTML = '<h2 class="text-3xl font-bold mb-6">Todos os Agendamentos</h2><p class="p-6 bg-white rounded-xl shadow">Funcionalidade de visualização de todos os agendamentos.</p>';
            loadUpcomingAppointmentsList(main); // Exemplo de reuso
            break;
        default:
            main.innerHTML = '<p class="text-xl text-red-500">Aba não encontrada.</p>';
            break;
    }
}


/* -------------------------
   Render principal
   ------------------------- */

function render() {
    const app = document.getElementById('app');
    if (!app) return console.error("#app não encontrado");

    if (currentPage === 'login') {
        app.innerHTML = renderLogin();
        attachLoginEvents();
        return;
    }

    if (currentPage === 'admin') {
        app.innerHTML = renderAdminShell();
        attachAdminShellEvents(); // Adiciona listeners do shell (logout, tabs)
        renderAdminContent(); // Preenche o conteúdo da aba atual
        return;
    }

    app.innerHTML = "<p>Página desconhecida</p>";
}

/* -------------------------
   Inicialização e Autenticação
   ------------------------- */

// 1. Configura o listener de autenticação para reagir a mudanças de estado.
function setupAuthListener() {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentAuthSession = session;
        console.log(`[AUTH] Evento: ${event}`);

        // Se houver uma sessão, e assumindo que é um admin
        if (session) {
            currentPage = "admin";
        } else {
            currentPage = "login";
        }
        render();
    });
}

// 2. Bloco principal de execução (chamado após o DOM Carregado)
window.onload = function() {
    // Esta função é chamada a partir do index.html
    // e inicia todo o ciclo de vida da aplicação.
    // É uma boa prática, mas a chamada original está no index.html.
    // Garanto que a função existe aqui para evitar o erro de 'Unexpected end of input'.
}

// Chama o render inicial se a autenticação já foi verificada no index.html.
// No seu index.html, você está chamando setupAuthListener() e depois render().
// Garanto que render() é chamada aqui no final para completar o fluxo.
// A linha '/* -------------------------' no final do snippet anterior estava incompleta.
// Fim do arquivo.

