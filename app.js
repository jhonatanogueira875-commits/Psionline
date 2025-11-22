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
  const msg = document.getElementById("login-error-message");
  if (msg) msg.classList.add("hidden");

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    if (msg) { msg.textContent = "Erro de login: verifique email/senha"; msg.classList.remove("hidden"); }
    console.error(error);
    return;
  }
  currentAuthSession = data.session;
  currentPage = "admin";
  render();
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  currentAuthSession = null;
  currentPage = "login";
  render();
}

/* -------------------------
   Requisições ao Supabase usadas no Dashboard
   ------------------------- */

// Conta de linhas com count: 'exact' (retorna count no objeto)
async function countRows(table) {
  const resp = await supabaseClient.from(table).select('id', { count: 'exact', head: false }).limit(1);
  if (resp.error) { console.error(resp.error); return 0; }
  return resp.count || 0;
}

// Buscar estatísticas para os cards
async function loadDashboardStats() {
  // total de psicólogos, pacientes, agendamentos, agendamentos semana
  const [totalPsy, totalPat, totalAppointments] = await Promise.all([
    countRows('psychologists'),
    countRows('patients'),
    countRows('appointments')
  ]);

  // agendamentos próximos 7 dias
  const today = new Date();
  const end = new Date(); end.setDate(today.getDate() + 7);
  const { data: upcoming, error: ue } = await supabaseClient
    .from('appointments')
    .select(`id, scheduled_date, scheduled_time, patient:patients_view!appointments_patient_id_fkey1(id, full_name), psychologist:psychologists_view!appointments_psychologist_id_fkey1(id, full_name), status`)
    .gte('scheduled_date', today.toISOString().split('T')[0])
    .lte('scheduled_date', end.toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
    .limit(10);

  if (ue) { console.error("Erro upcoming:", ue); }

  return {
    totalPsychologists: totalPsy,
    totalPatients: totalPat,
    totalAppointments,
    upcoming: upcoming || []
  };
}

// Agrupar por mês para gráficos (retorna array de {label, count})
async function loadAppointmentsGroupedByMonth(monthsBack = 6) {
  // Puxa todos os agendamentos recentes (limite razoável)
  const { data, error } = await supabaseClient
    .from('appointments')
    .select('id, created_at, scheduled_date')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) { console.error(error); return []; }

  // Agrupa por 'YYYY-MM'
  const counts = {};
  const now = new Date();
  // initialize labels
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    counts[label] = 0;
  }

  (data || []).forEach(a => {
    const date = a.created_at ? new Date(a.created_at) : (a.scheduled_date ? new Date(a.scheduled_date) : null);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    if (counts[key] !== undefined) counts[key] += 1;
  });

  return Object.keys(counts).map(k => ({ label: k, count: counts[k] }));
}

// Carrega novos usuários (profiles) por mês (psicólogos + pacientes)
async function loadNewUsersGroupedByMonth(monthsBack = 6) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, created_at, role')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) { console.error(error); return []; }

  const counts = {};
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    counts[label] = 0;
  }

  (data || []).forEach(u => {
    const date = u.created_at ? new Date(u.created_at) : null;
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    if (counts[key] !== undefined) counts[key] += 1;
  });

  return Object.keys(counts).map(k => ({ label: k, count: counts[k] }));
}

/* -------------------------
   UI: Renderizações
   ------------------------- */

function renderLogin() {
  return `
    <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <h1 class="text-3xl font-bold text-center text-purple-700 mb-8">Login Administrativo</h1>
        <form id="login-form" onsubmit="event.preventDefault(); handleLogin(document.getElementById('email').value, document.getElementById('password').value);">
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Email</label>
            <input id="email" type="email" class="w-full px-4 py-3 border rounded-lg" required>
          </div>
          <div class="mb-6">
            <label class="block text-gray-700 mb-2">Senha</label>
            <input id="password" type="password" class="w-full px-4 py-3 border rounded-lg" required>
          </div>
          <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold">Entrar</button>
          <p id="login-error-message" class="hidden mt-4 text-center text-sm text-red-500"></p>
        </form>
      </div>
    </div>
  `;
}

function renderAdminShell() {
  return `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="bg-purple-700 text-white p-4 shadow-lg flex justify-between items-center">
        <h1 class="text-xl font-bold">Painel Administrativo</h1>
        <nav class="flex items-center gap-3">
          <button onclick="currentAdminTab='dashboard'; renderAdminContent()" class="px-4 py-2 rounded-lg ${currentAdminTab==='dashboard'?'bg-purple-900':''}">Dashboard</button>
          <button onclick="currentAdminTab='profiles'; renderAdminContent()" class="px-4 py-2 rounded-lg ${currentAdminTab==='profiles'?'bg-purple-900':''}">Perfis</button>
          <button onclick="currentAdminTab='appointments'; renderAdminContent()" class="px-4 py-2 rounded-lg ${currentAdminTab==='appointments'?'bg-purple-900':''}">Agendamentos</button>
          <button onclick="handleLogout()" class="ml-4 bg-red-500 px-4 py-2 rounded-lg">Sair</button>
        </nav>
      </header>
      <main class="flex-grow p-6">
        <div id="admin-content" class="container mx-auto"></div>
      </main>
    </div>
  `;
}

/* -------------------------
   Dashboard: componentes e render
   ------------------------- */

function buildDashboardHTML() {
  return `
    <div class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-4 bg-white rounded-lg shadow flex flex-col">
          <div class="text-sm text-gray-500">Psicólogos</div>
          <div id="card-psychologists" class="text-2xl font-bold mt-2">--</div>
        </div>
        <div class="p-4 bg-white rounded-lg shadow flex flex-col">
          <div class="text-sm text-gray-500">Pacientes</div>
          <div id="card-patients" class="text-2xl font-bold mt-2">--</div>
        </div>
        <div class="p-4 bg-white rounded-lg shadow flex flex-col">
          <div class="text-sm text-gray-500">Total Agendamentos</div>
          <div id="card-appointments" class="text-2xl font-bold mt-2">--</div>
        </div>
        <div class="p-4 bg-white rounded-lg shadow flex flex-col">
          <div class="text-sm text-gray-500">Próximos 7 dias</div>
          <div id="card-upcoming" class="text-2xl font-bold mt-2">--</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 p-4 bg-white rounded-lg shadow">
          <h3 class="font-semibold mb-2">Atendimentos (últimos meses)</h3>
          <canvas id="barAppointments" height="140"></canvas>
        </div>

        <div class="p-4 bg-white rounded-lg shadow">
          <h3 class="font-semibold mb-2">Novos Usuários (mensal)</h3>
          <canvas id="lineUsers" height="140"></canvas>
        </div>
      </div>

      <div class="p-4 bg-white rounded-lg shadow">
        <h3 class="font-semibold mb-4">Próximos Agendamentos</h3>
        <ul id="upcoming-list" class="space-y-3"></ul>
      </div>
    </div>
  `;
}

let barChart = null;
let lineChart = null;

async function renderDashboard() {
  const content = document.getElementById('admin-content');
  content.innerHTML = buildDashboardHTML();

  // Carrega stats e popula os cards
  const stats = await loadDashboardStats();
  document.getElementById('card-psychologists').textContent = stats.totalPsychologists;
  document.getElementById('card-patients').textContent = stats.totalPatients;
  document.getElementById('card-appointments').textContent = stats.totalAppointments;
  document.getElementById('card-upcoming').textContent = stats.upcoming.length;

  // Próximos agendamentos
  const list = document.getElementById('upcoming-list');
  list.innerHTML = stats.upcoming.length ? stats.upcoming.map(a => {
    const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
    const psy = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
    const date = a.scheduled_date ? new Date(a.scheduled_date).toLocaleString('pt-BR') : (a.created_at?new Date(a.created_at).toLocaleString('pt-BR'):'-');
    return `<li class="p-3 border rounded-lg">
              <div class="font-semibold">${patient?.full_name || 'Paciente'}</div>
              <div class="text-sm text-gray-600">${psy?.full_name || 'Psicólogo'} — ${date}</div>
            </li>`;
  }).join('') : `<li class="text-gray-600">Nenhum agendamento próximo.</li>`;

  // Dados para gráficos
  const apptsByMonth = await loadAppointmentsGroupedByMonth(6); // last 6 months
  const usersByMonth = await loadNewUsersGroupedByMonth(6);

  // Prepare labels & datasets
  const labels = apptsByMonth.map(x => x.label);
  const apptsData = apptsByMonth.map(x => x.count);
  const usersData = usersByMonth.map(x => x.count);

  // Destroy old charts if exist
  if (barChart) { barChart.destroy(); barChart = null; }
  if (lineChart) { lineChart.destroy(); lineChart = null; }

  // Create bar chart (appointments)
  const ctxBar = document.getElementById('barAppointments').getContext('2d');
  barChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Atendimentos', data: apptsData }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Create line chart (users)
  const ctxLine = document.getElementById('lineUsers').getContext('2d');
  lineChart = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Novos usuários', data: usersData, fill: false }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* -------------------------
   Conteúdo geral do Admin (rotas tabs)
   ------------------------- */

async function renderAdminContent() {
  const main = document.getElementById('admin-content');
  if (!main) return;

  if (currentAdminTab === 'dashboard') {
    // Apresenta dashboard
    try {
      await renderDashboard();
    } catch (e) {
      main.innerHTML = `<div class="p-6 bg-red-50 border rounded">${e.message}</div>`;
    }
    return;
  }

  // PERFIS (mantive sua implementação simples)
  if (currentAdminTab === 'profiles') {
    try {
      main.innerHTML = `<div class="p-6 bg-white rounded shadow">Carregando perfis...</div>`;
      const { data, error } = await supabaseClient.from('profiles').select('id, full_name, email, role').order('created_at', { ascending: false });
      if (error) throw error;
      main.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow">
          <h2 class="text-2xl font-bold mb-4">Perfis (${data.length})</h2>
          <ul class="space-y-3">${data.map(p => `<li class="p-3 bg-gray-50 border rounded">${p.full_name} — ${p.email} <span class="text-purple-600">(${p.role})</span></li>`).join('')}</ul>
        </div>`;
    } catch (e) {
      main.innerHTML = `<div class="p-6 bg-red-50 rounded">${e.message}</div>`;
    }
    return;
  }

  // AGENDAMENTOS (mantive sua implementação simples)
  if (currentAdminTab === 'appointments') {
    try {
      main.innerHTML = `<div class="p-6 bg-white rounded shadow">Carregando agendamentos...</div>`;
      const apps = await supabaseClient
        .from('appointments')
        .select(`*, patient:patients_view!appointments_patient_id_fkey1(id, full_name), psychologist:psychologists_view!appointments_psychologist_id_fkey1(id, full_name)`)
        .order('scheduled_date', { ascending: false })
        .limit(200);
      if (apps.error) throw apps.error;
      const list = (apps.data || []).map(a => {
        const patient = Array.isArray(a.patient)?a.patient[0]:a.patient;
        const psy = Array.isArray(a.psychologist)?a.psychologist[0]:a.psychologist;
        return `<li class="p-3 border rounded mb-2"><div class="font-semibold">${patient?.full_name||'Paciente'}</div><div class="text-sm text-gray-600">${psy?.full_name||'Psicólogo'} — ${a.scheduled_date||'-'}</div></li>`;
      }).join('');
      main.innerHTML = `<div class="p-6 bg-white rounded-xl shadow"><h2 class="text-2xl mb-4">Agendamentos (${apps.data.length})</h2><ul>${list||'<li class="text-gray-600">Nenhum</li>'}</ul></div>`;
    } catch (e) {
      main.innerHTML = `<div class="p-6 bg-red-50 rounded">${e.message}</div>`;
    }
    return;
  }
}

/* -------------------------
   Render principal
   ------------------------- */

function render() {
  const app = document.getElementById('app');
  if (!app) return console.error("#app não encontrado");
  if (currentPage === 'login') { app.innerHTML = renderLogin(); return; }
  if (currentPage === 'admin') { app.innerHTML = renderAdminShell(); renderAdminContent(); return; }
  app.innerHTML = "<p>Página desconhecida</p>";
}

/* -------------------------
   Auth state listener
   ------------------------- */
supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("Auth Event:", event);
  currentAuthSession = session;
  currentPage = session ? 'admin' : 'login';
  render();
});

// Start
render();
