/* app.js
   Versão final profissional para PsiOnline - Painel Admin
   - Menu profissional (sidebar)
   - Dashboard como aba inicial
   - Perfis / Psicólogos / Pacientes / Agendamentos
   - Gráficos com Chart.js (usa Chart global)
   - Joins seguros usando views: patients_view / psychologists_view
   - Foreign keys confirmadas:
       appointments_patient_id_fkey1
       appointments_psychologist_id_fkey1
*/

/* ============================
   0. CONFIGURAÇÃO - Ajuste aqui se necessário
   ============================ */
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

const FKs = {
  patient: 'appointments_patient_id_fkey1',
  psychologist: 'appointments_psychologist_id_fkey1'
};

const VIEWS = {
  patients: 'patients_view',
  psychologists: 'psychologists_view'
};

/* ============================
   1. Inicialização Supabase
   ============================ */
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) {
  console.error('ERRO: Supabase não inicializado. Verifique o CDN/keys no index.html');
} else {
  console.log('Supabase inicializado.');
}

/* ============================
   2. Estado global
   ============================ */
let currentPage = 'login';               // 'login' | 'admin'
let currentAuthSession = null;
let currentAdminTab = 'dashboard';       // dashboard é a aba padrão
let charts = { line: null, bar: null };

/* ============================
   3. Autenticação
   ============================ */
async function handleLogin(email, password) {
  const errEl = document.getElementById('login-error-message');
  if (errEl) errEl.classList.add('hidden');

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Erro login:', error);
      if (errEl) { errEl.textContent = 'Email/senha inválidos'; errEl.classList.remove('hidden'); }
      return;
    }
    currentAuthSession = data.session;
    currentPage = 'admin';
    currentAdminTab = 'dashboard';
    render();
  } catch (e) {
    console.error('Erro inesperado em handleLogin:', e);
    if (errEl) { errEl.textContent = 'Erro inesperado'; errEl.classList.remove('hidden'); }
  }
}

async function handleLogout() {
  try {
    await supabaseClient.auth.signOut();
  } catch (e) {
    console.warn('Erro no signOut', e);
  }
  currentAuthSession = null;
  currentPage = 'login';
  render();
}

/* ============================
   4. Utilitários / helpers
   ============================ */

// Conta rápida usando count (exact)
async function countRows(table) {
  try {
    const res = await supabaseClient.from(table).select('id', { count: 'exact', head: false }).limit(1);
    if (res.error) { console.error('countRows error', res.error); return 0; }
    return res.count || 0;
  } catch (e) {
    console.error('countRows exception', e);
    return 0;
  }
}

// Formata data pt-BR com hora opcional
function fmtDate(dateStr, withTime = false) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return withTime ? d.toLocaleString('pt-BR') : d.toLocaleDateString('pt-BR');
}

/* ============================
   5. Funções de carregamento de dados (DB)
   ============================ */

/** Carrega profiles (todos) */
async function loadProfiles() {
  const { data, error } = await supabaseClient.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false });
  if (error) { console.error('loadProfiles error', error); throw error; }
  return data || [];
}

/** Carrega psychologists (detalhes da tabela psychologists + profile) */
async function loadPsychologists() {
  const { data, error } = await supabaseClient
    .from('psychologists')
    .select(`id, user_id, crp, bio, specialty, session_price, status, created_at, users:profiles!users_profile_fkey(id, full_name, email)`);
  // Note: if relationship name differs, the join can be adapted; using profiles via relation "users_profile_fkey" is an example.
  if (error) { console.error('loadPsychologists error', error); throw error; }
  return data || [];
}

/** Carrega patients (tabela patients) */
async function loadPatients() {
  const { data, error } = await supabaseClient.from('patients').select('id, user_id, cpf, birthdate, created_at');
  if (error) { console.error('loadPatients error', error); throw error; }
  return data || [];
}

/** Carrega agendamentos com JOINs seguros usando VIEWS */
async function loadAppointments(limit = 500) {
  // Usa as views patients_view / psychologists_view para evitar ambiguidade de FK
  const selectStr = `
    *,
    patient:${VIEWS.patients}!${FKs.patient} (id, full_name, email),
    psychologist:${VIEWS.psychologists}!${FKs.psychologist} (id, full_name, email)
  `;
  const { data, error } = await supabaseClient
    .from('appointments')
    .select(selectStr)
    .order('scheduled_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erro DETALHADO ao carregar agendamentos:', JSON.stringify(error));
    throw error;
  }
  return data || [];
}

/* ============================
   6. Render - componentes básicos
   ============================ */

function renderLogin() {
  return `
    <div class="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div class="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h1 class="text-2xl font-bold text-purple-700 mb-6">Painel Admin — PsiOnline</h1>
        <form onsubmit="event.preventDefault(); handleLogin(email.value, password.value)">
          <label class="block mb-3"><span class="text-sm font-semibold">Email</span>
            <input id="email" type="email" class="w-full mt-2 p-3 border rounded" required />
          </label>
          <label class="block mb-4"><span class="text-sm font-semibold">Senha</span>
            <input id="password" type="password" class="w-full mt-2 p-3 border rounded" required />
          </label>
          <button class="w-full bg-purple-600 text-white p-3 rounded font-semibold hover:bg-purple-700">Entrar</button>
          <p id="login-error-message" class="text-red-500 text-sm mt-3 hidden"></p>
        </form>
      </div>
    </div>
  `;
}

/* Sidebar profissional (menu B) */
function renderSidebar() {
  // note: uses currentAdminTab variable
  return `
    <aside class="sidebar-glass w-72 p-6 fixed h-full overflow-auto fade-in">
      <div class="mb-8">
        <h2 class="text-2xl font-extrabold text-purple-700">PSI<span class="text-gray-800">online</span></h2>
        <p class="text-xs text-gray-600 mt-1">Painel Administrativo</p>
      </div>

      <nav class="space-y-2">
        ${sidebarButton('dashboard', '📊', 'Dashboard')}
        ${sidebarButton('users', '👥', 'Usuários')}
        ${sidebarButton('psychologists', '🧠', 'Psicólogos')}
        ${sidebarButton('patients', '🧍‍♂️', 'Pacientes')}
        ${sidebarButton('appointments', '📅', 'Agendamentos')}
        ${sidebarButton('finance', '💰', 'Financeiro')}
        ${sidebarButton('reports', '📈', 'Relatórios')}
        ${sidebarButton('settings', '⚙️', 'Configurações')}
      </nav>

      <div class="absolute bottom-6 left-6 right-6">
        <button onclick="handleLogout()" class="w-full bg-red-500 text-white py-3 rounded-xl font-semibold">Sair</button>
      </div>
    </aside>
  `;
}

function sidebarButton(tab, emoji, label) {
  const active = (currentAdminTab === tab);
  return `
    <button onclick="currentAdminTab='${tab}'; renderAdminContent();" 
      class="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${active ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-purple-100'}">
      <span class="text-lg">${emoji}</span>
      <span>${label}</span>
    </button>
  `;
}

/* Admin shell — sidebar + main content */
function renderAdminShell() {
  return `
    <div class="min-h-screen flex bg-gray-100">
      ${renderSidebar()}
      <main class="flex-1 ml-72 p-10">
        <div id="admin-content"></div>
      </main>
    </div>
  `;
}

/* ============================
   7. Render content for admin tabs (complete)
   ============================ */

async function renderAdminContent() {
  const main = document.getElementById('admin-content');
  if (!main) {
    console.error('#admin-content não encontrado');
    return;
  }

  // Dashboard (default)
  if (currentAdminTab === 'dashboard') {
    main.innerHTML = renderDashboardShell();
    try {
      await fillDashboard(); // populates cards, charts, list
    } catch (e) {
      console.error('Erro ao preencher dashboard:', e);
      main.querySelector('#dashboard-error') && (main.querySelector('#dashboard-error').textContent = e.message || String(e));
    }
    return;
  }

  // Usuários (profiles)
  if (currentAdminTab === 'users') {
    main.innerHTML = `<div class="card"><h2 class="text-xl font-bold mb-4">Usuários</h2><div id="users-list">Carregando...</div></div>`;
    try {
      const profiles = await loadProfiles();
      const listHtml = profiles.map(p => `<div class="p-3 border rounded mb-2"><b>${p.full_name || '(sem nome)'}</b> — ${p.email} <span class="text-sm text-gray-500">(${p.role})</span></div>`).join('');
      main.querySelector('#users-list').innerHTML = listHtml || '<div class="text-gray-600">Nenhum usuário encontrado</div>';
    } catch (e) {
      main.querySelector('#users-list').innerHTML = `<div class="text-red-500">${e.message}</div>`;
    }
    return;
  }

  // Psicólogos
  if (currentAdminTab === 'psychologists') {
    main.innerHTML = `<div class="card"><h2 class="text-xl font-bold mb-4">Psicólogos</h2><div id="psych-list">Carregando...</div></div>`;
    try {
      // use direct join if available; fallback to loading profiles and psychologists separately
      // We'll try to fetch psychologists and expand profile via profiles relation if exists
      const { data, error } = await supabaseClient
        .from('psychologists')
        .select(`id, user_id, crp, specialty, bio, session_price, status, created_at, user:profiles!${FKs.patient} (id, full_name, email)`);
      // above select attempts to join profiles via FK named in FKs.patient. If this errors, fallback:
      if (error) {
        console.warn('join psych->profiles failed, fallback:', error);
        const psy = await loadPsychologists();
        main.querySelector('#psych-list').innerHTML = psy.map(p => `<div class="p-3 border rounded mb-2"><b>${p.users?.full_name || '(sem nome)'}</b> — CRP: ${p.crp || '-'}</div>`).join('');
      } else {
        main.querySelector('#psych-list').innerHTML = (data || []).map(p => `<div class="p-3 border rounded mb-2"><b>${p.user?.full_name || '(sem nome)'}</b> — CRP: ${p.crp || '-'}</div>`).join('');
      }
    } catch (e) {
      main.querySelector('#psych-list').innerHTML = `<div class="text-red-500">${e.message}</div>`;
    }
    return;
  }

  // Pacientes
  if (currentAdminTab === 'patients') {
    main.innerHTML = `<div class="card"><h2 class="text-xl font-bold mb-4">Pacientes</h2><div id="patients-list">Carregando...</div></div>`;
    try {
      const patients = await loadPatients();
      main.querySelector('#patients-list').innerHTML = patients.map(p => `<div class="p-3 border rounded mb-2">ID: ${p.id} — CPF: ${p.cpf || '-'} — ${fmtDate(p.created_at)}</div>`).join('') || '<div class="text-gray-600">Nenhum paciente</div>';
    } catch (e) {
      main.querySelector('#patients-list').innerHTML = `<div class="text-red-500">${e.message}</div>`;
    }
    return;
  }

  // Agendamentos
  if (currentAdminTab === 'appointments') {
    main.innerHTML = `<div class="card"><h2 class="text-xl font-bold mb-4">Agendamentos</h2><div id="appointments-list">Carregando...</div></div>`;
    try {
      const apps = await loadAppointments(300);
      const listHtml = (apps || []).map(a => {
        const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
        const psych = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
        return `<div class="p-3 border rounded mb-2">
                  <div class="font-semibold">${patient?.full_name || 'Paciente'}</div>
                  <div class="text-sm text-gray-600">${psych?.full_name || 'Psicólogo'} — ${fmtDate(a.scheduled_date)} ${a.scheduled_time || ''}</div>
                  <div class="text-xs text-gray-500 mt-1">Status: ${a.status || '-'}</div>
                </div>`;
      }).join('');
      main.querySelector('#appointments-list').innerHTML = listHtml || '<div class="text-gray-600">Nenhum agendamento</div>';
    } catch (e) {
      main.querySelector('#appointments-list').innerHTML = `<div class="text-red-500">${e.message}</div>`;
    }
    return;
  }

  // Financeiro / Reports / Settings placeholders:
  if (currentAdminTab === 'finance') {
    main.innerHTML = `<div class="card"><h2 class="text-xl font-bold mb-4">Financeiro</h2><p>Em construção — métricas e pagamentos</p></div>`;
    return;
  }
  if (currentAdminTab === 'reports') {
    main.innerHTML = `<div class="card"><h2 class="text-xl font-bold mb-4">Relatórios</h2><p>Em construção — export, filtros e dashboards</p></div>`;
    return;
  }
  if (currentAdminTab === 'settings') {
    main.innerHTML = `<div class="card"><h2 class="text-xl font-bold mb-4">Configurações</h2><p>Configurações do sistema</p></div>`;
    return;
  }

  // Default fallback
  main.innerHTML = `<div class="card"><p>Área não encontrada</p></div>`;
}

/* ============================
   8. DASHBOARD shell + fill functions
   ============================ */

function renderDashboardShell() {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div class="text-sm text-gray-500">Bem-vindo ao painel administrativo</div>
      </div>

      <div id="dashboard-error" class="text-red-500 mb-4"></div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-cards">
        <!-- cards serão preenchidos via JS -->
        <div class="card"><div class="text-sm text-gray-500">Total Usuários</div><div id="kpi-users" class="text-2xl font-bold text-purple-700">—</div></div>
        <div class="card"><div class="text-sm text-gray-500">Psicólogos</div><div id="kpi-psych" class="text-2xl font-bold text-purple-700">—</div></div>
        <div class="card"><div class="text-sm text-gray-500">Consultas Totais</div><div id="kpi-appts" class="text-2xl font-bold text-purple-700">—</div></div>
        <div class="card"><div class="text-sm text-gray-500">Próximos 7 dias</div><div id="kpi-next7" class="text-2xl font-bold text-purple-700">—</div></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div class="card">
          <h3 class="font-semibold mb-3">Atendimentos por mês</h3>
          <canvas id="chart-line" height="160"></canvas>
        </div>
        <div class="card">
          <h3 class="font-semibold mb-3">Atendimentos por Psicólogo</h3>
          <canvas id="chart-bar" height="160"></canvas>
        </div>
      </div>

      <div class="card mt-8">
        <h3 class="font-semibold mb-4">Próximos Agendamentos</h3>
        <ul id="dashboard-upcoming" class="space-y-3"></ul>
      </div>
    </div>
  `;
}

async function fillDashboard() {
  // quick fetches
  const [profiles, appointments] = await Promise.all([loadProfiles(), loadAppointments(1000)]);
  // KPIs
  const totalUsers = (profiles || []).length;
  const totalPsych = profiles.filter(p => p.role === 'psychologist').length;
  const totalAppointments = (appointments || []).length;

  // upcoming next 7 days
  const today = new Date();
  const end = new Date(); end.setDate(today.getDate() + 7);
  const upcoming = (appointments || []).filter(a => {
    const d = a.scheduled_date ? new Date(a.scheduled_date) : (a.scheduled_at ? new Date(a.scheduled_at) : null);
    if (!d) return false;
    return d >= startOfDay(today) && d <= end;
  }).sort((a,b)=> new Date(a.scheduled_date) - new Date(b.scheduled_date)).slice(0,10);

  // Fill KPIs
  document.getElementById('kpi-users').textContent = totalUsers;
  document.getElementById('kpi-psych').textContent = totalPsych;
  document.getElementById('kpi-appts').textContent = totalAppointments;
  document.getElementById('kpi-next7').textContent = upcoming.length;

  // Upcoming list
  const upcomingEl = document.getElementById('dashboard-upcoming');
  upcomingEl.innerHTML = upcoming.length ? upcoming.map(a => {
    const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
    const psych = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
    const dateTxt = a.scheduled_date ? `${fmtDate(a.scheduled_date)} ${a.scheduled_time || ''}` : fmtDate(a.created_at, true);
    return `<li class="p-3 border rounded"><div class="font-semibold">${patient?.full_name || 'Paciente'}</div><div class="text-sm text-gray-600">${psych?.full_name || 'Psicólogo'} — ${dateTxt}</div></li>`;
  }).join('') : `<li class="text-gray-600">Nenhum agendamento próximo.</li>`;

  // Build charts
  buildDashboardCharts(appointments, profiles);
}

/* ============================
   9. CHART building
   ============================ */

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

function buildDashboardCharts(appointments = [], profiles = []) {
  // Prepare monthly labels (last 12 months)
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.toLocaleString('pt-BR', { month: 'short' })}/${d.getFullYear()}`);
  }

  // Count appointments per month (by created_at or scheduled_date)
  const monthCounts = months.map(() => 0);
  (appointments || []).forEach(a => {
    const date = a.created_at ? new Date(a.created_at) : (a.scheduled_date ? new Date(a.scheduled_date) : null);
    if (!date) return;
    const key = `${date.toLocaleString('pt-BR', { month: 'short' })}/${date.getFullYear()}`;
    const idx = months.indexOf(key);
    if (idx >= 0) monthCounts[idx] += 1;
  });

  // Build line chart
  const lineCtx = document.getElementById('chart-line').getContext('2d');
  if (charts.line) charts.line.destroy();
  charts.line = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Atendimentos',
        data: monthCounts,
        borderColor: '#6d28d9',
        backgroundColor: 'rgba(109,40,217,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Bar chart: appointments per psychologist (top 8)
  const psychProfiles = (profiles || []).filter(p => p.role === 'psychologist');
  const names = psychProfiles.map(p => p.full_name || p.id);
  const counts = psychProfiles.map(p => {
    // match by psychologist id in appointments - note appointments may have psychologist.id from view, or psychologist_id field
    const pid = p.id;
    return (appointments || []).reduce((acc, a) => {
      // a.psychologist may be array or object
      const psych = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
      if (!psych) {
        // fallback: match on psychologist_id raw field
        if (a.psychologist_id && a.psychologist_id === pid) return acc + 1;
        return acc;
      }
      if (psych.id === pid) return acc + 1;
      return acc;
    }, 0);
  });

  // If there are too many psychologists, pick top 8
  const combined = names.map((n, i) => ({ name: n, count: counts[i] }));
  combined.sort((a,b) => b.count - a.count);
  const top = combined.slice(0, 8);
  const barCtx = document.getElementById('chart-bar').getContext('2d');
  if (charts.bar) charts.bar.destroy();
  charts.bar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: top.map(t => t.name),
      datasets: [{ label: 'Atendimentos', data: top.map(t => t.count), backgroundColor: '#8b5cf6' }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* ============================
   10. RENDER principal
   ============================ */
function render() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('#app não encontrado');
    return;
  }

  if (currentPage === 'login') {
    app.innerHTML = renderLogin();
    return;
  }

  if (currentPage === 'admin') {
    app.innerHTML = renderAdminShell();
    // renderAdminContent será chamado pela sidebar ao setar aba,
    // mas chamamos manualmente para garantir carregamento da aba atual
    setTimeout(() => renderAdminContent(), 50);
    return;
  }

  app.innerHTML = '<div class="p-8">Página não encontrada</div>';
}

/* ============================
   11. Auth state listener e init
   ============================ */
supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log('Auth Event:', event);
  currentAuthSession = session;
  currentPage = session ? 'admin' : 'login';
  // default to dashboard when signing in
  if (session && !currentAdminTab) currentAdminTab = 'dashboard';
  render();
});

// Start initial render (will show login or admin depending on session)
render();

/* ============================
   12. Export / debugging helpers (available in console)
   ============================ */
window.psiApp = {
  supabase: supabaseClient,
  reload: () => { render(); },
  loadAppointments,
  loadProfiles,
  loadPatients,
  loadPsychologists
};
