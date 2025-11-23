/* app.js - Versão com Dashboard Admin completo
   Cards, gráfico de barras (atendimentos por mês),
   gráfico de linhas (novos usuários por mês) e
   lista de próximos agendamentos.
   REVISADO: Garantia de acesso global para funções 'onclick'.
*/

const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.error("ERRO: Supabase não inicializado");

let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "dashboard";

/* -------------------------
   Utilitários globais (Exportados para o index.html)
   ------------------------- */

function setCurrentPage(newPage) {
    console.log(`Página alterada: de ${currentPage} para ${newPage}`);
    currentPage = newPage;
}

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
    // As próximas duas linhas (setCurrentPage e render) são o que o index.html faria
    // ao receber a notificação, mas as executamos diretamente para feedback imediato no formulário.
    setCurrentPage('admin');
    render(); 
  } catch (error) {
    console.error("Erro de login:", error.message);
    const loginMsg = document.getElementById('login-message');
    if(loginMsg) loginMsg.innerText = `Erro: ${error.message}`;
  }
}

async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    console.log("Logout bem-sucedido.");
    setCurrentPage('login');
    render(); 
  } catch (error) {
    console.error("Erro de logout:", error.message);
  }
}

/* -------------------------
   Views HTML
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
                <p class="text-xs text-gray-500 text-center mt-4">Use admin@psionline.com / 123456</p>
            </form>
        </div>
    </div>
  `;
}

function renderAdminShell() {
  // As chamadas 'onclick' agora usam 'window.appModule.funcao' para garantir acesso global
  return `
    <div class="min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-white shadow-md z-10 sticky top-0">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-indigo-600">Psionline Admin</h1>
                <nav class="flex space-x-4">
                    <button onclick="window.appModule.changeAdminTab('dashboard')" class="tab-button p-2 rounded-md ${currentAdminTab === 'dashboard' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}">
                        Dashboard
                    </button>
                    <button onclick="window.appModule.changeAdminTab('users')" class="tab-button p-2 rounded-md ${currentAdminTab === 'users' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}">
                        Usuários
                    </button>
                    <button onclick="window.appModule.handleLogout()" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-150">
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
    // 1. Obter Total de Usuários (Exemplo de consulta real)
    const { count: totalUsers } = await supabaseClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    const dashboardHtml = `
      <h2 class="text-3xl font-bold text-gray-800 mb-6">Visão Geral</h2>
      
      <!-- Cards de Métricas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
          <p class="text-sm font-medium text-gray-500">Total de Usuários</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">${totalUsers || 0}</p>
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
      
      <!-- Seção de Agendamentos e Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Gráficos (h-96 garante a estabilidade visual) -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-4 text-gray-800">Atendimentos por Mês</h3>
            <div class="relative h-96">
                <canvas id="appointmentsChart"></canvas>
            </div>
          </div>
          <div class="bg-white p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-4 text-gray-800">Novos Usuários</h3>
            <div class="relative h-96">
                <canvas id="usersChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Próximos Agendamentos -->
        <div class="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Próximos Agendamentos</h3>
          <ul id="upcoming-appointments-list" class="space-y-3">
            <li class="p-3 text-center text-gray-500">Carregando...</li>
          </ul>
        </div>
      </div>
    `;

    main.innerHTML = dashboardHtml;

    await renderCharts();
    await renderUpcomingAppointments();

  } catch (e) {
    console.error("Erro ao renderizar dashboard:", e);
    main.innerHTML = `
      <div class="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-xl mt-6">
        <h2 class="text-2xl font-bold mb-3">🚨 Erro ao Carregar Dashboard</h2>
        <p>Verifique a conexão com o Supabase e as regras de RLS.</p>
        <p class="mt-2 font-mono text-sm">Detalhe: ${e.message}</p>
      </div>
    `;
  }
}

async function renderCharts() {
    // Verifica se Chart.js está disponível
    if (typeof window.Chart === 'undefined') {
        console.warn("Chart.js não carregado. Pulando renderização de gráficos.");
        return;
    }
    
    // Dados Mock para os gráficos
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const appointmentsData = [12, 19, 3, 5, 2, 3];
    const usersData = [2, 5, 8, 15, 18, 20];

    // Gráfico de Barras (Atendimentos)
    const appCtx = document.getElementById('appointmentsChart');
    if (appCtx) {
      if (window.appointmentsChartInstance) window.appointmentsChartInstance.destroy();
      window.appointmentsChartInstance = new Chart(appCtx, {
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
          maintainAspectRatio: false, // CRUCIAL para estabilidade
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Gráfico de Linhas (Novos Usuários)
    const userCtx = document.getElementById('usersChart');
    if (userCtx) {
        if (window.usersChartInstance) window.usersChartInstance.destroy();
        window.usersChartInstance = new Chart(userCtx, {
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
              maintainAspectRatio: false, // CRUCIAL para estabilidade
              scales: { y: { beginAtZero: true } }
            }
          });
    }
}

async function renderUpcomingAppointments() {
  const list = document.getElementById('upcoming-appointments-list');
  if (!list) return;

  try {
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
        const patient = Array.isArray(a.patient)?a.patient[0]:a.patient;
        const psy = Array.isArray(a.psychologist)?a.psychologist[0]:a.psychologist;
        const dateStr = a.scheduled_date ? new Date(a.scheduled_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
        return `
          <li class="p-3 border rounded-xl bg-white shadow-sm hover:shadow-md transition duration-150">
            <div class="font-semibold text-indigo-700">${patient?.full_name||'Paciente Desconhecido'}</div>
            <div class="text-sm text-gray-500">Psicólogo(a): ${psy?.full_name||'Não Atribuído'}</div>
            <div class="text-xs text-gray-400">Data: ${dateStr}</div>
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
        <td class="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-semibold">${user.role||'user'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(user.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

    main.innerHTML = `
      <h2 class="text-3xl font-bold text-gray-800 mb-6">Gerenciamento de Usuários</h2>
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
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
        </div>
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

function changeAdminTab(tab) {
  currentAdminTab = tab;
  // Re-renderiza o shell para atualizar o estilo da tab e o conteúdo
  render(); 
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
    }
    else if (currentPage === 'admin') { 
        console.log("RENDER: Exibindo Shell Admin e conteúdo da aba " + currentAdminTab);
        app.innerHTML = renderAdminShell(); 
        renderAdminContent(); 
    }
    else {
        app.innerHTML = "<p>Página desconhecida</p>";
    }

  } catch (e) {
    console.error("ERRO CRÍTICO na função render():", e);
    app.innerHTML = `
        <div class="flex justify-center items-center h-screen bg-red-100">
            <div class="text-center p-8 max-w-lg w-full text-red-800 bg-white border border-red-400 rounded-lg shadow-2xl">
                <p class="font-bold text-xl mb-3">🚨 Erro Crítico na Renderização 🚨</p>
                <p class="text-base mb-4">
                    Ocorreu um erro inesperado. Verifique o console.
                </p>
                <p class="text-sm text-red-600 font-mono">
                    Detalhe: ${e.message}
                </p>
            </div>
        </div>
    `;
  }
}

// O bloco de eventos do formulário de login precisa ser um listener de evento global.
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'login-form') {
        e.preventDefault();
        const loginButton = document.getElementById('loginButton');
        loginButton.disabled = true;
        loginButton.textContent = 'Autenticando...';

        const email = e.target.email.value;
        const password = e.target.password.value;
        await handleLogin(email, password);
        
        // Reativa o botão se o login falhou e a página permaneceu 'login'
        if (currentPage === 'login') {
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    }
});


// Coloca as funções que precisam ser chamadas pelo index.html ou no HTML inline no objeto global window.appModule
// Isso é necessário porque funções exportadas de módulos não são acessíveis via 'onclick' em strings HTML simples.
window.appModule = {
    render, 
    setCurrentPage, 
    setCurrentSession, 
    handleLogin, 
    handleLogout, 
    supabaseClient,
    changeAdminTab,
    renderAdminContent
};


/* -------------------------
   Exportações (Para que o index.html possa importar)
   ------------------------- */
export { render, setCurrentPage, setCurrentSession, handleLogin, handleLogout, supabaseClient };

// Exporta changeAdminTab também para chamadas via index.html/módulo
export { changeAdminTab, renderAdminContent };
