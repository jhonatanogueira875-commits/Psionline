// app.js - Supabase version (plain JS, no React)
// Requires: index.html includes supabase-js UMD and sets SUPABASE_URL and SUPABASE_ANON_KEY on window

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_ANON_KEY;

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY); // supabaseJs is provided by UMD build

// DOM elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authMsg = document.getElementById('auth-msg');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnSignUp = document.getElementById('btn-signup');
const btnSignIn = document.getElementById('btn-signin');
const btnLogout = document.getElementById('btn-logout');
const userEmailLabel = document.getElementById('user-email');

const profileSection = document.getElementById('profile-section');
const dashboardSection = document.getElementById('dashboard-section');

let currentUser = null;
let profile = null;

// UTIL
function showAuthMessage(msg) {
  authMsg.style.display = msg ? 'block' : 'none';
  authMsg.innerText = msg || '';
}

function safeText(t, fallback='N/A') { return (t===null||t===undefined||t==='')?fallback:String(t); }

// AUTH
btnSignUp.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return showAuthMessage('Preencha email e senha.');

  showAuthMessage('Aguarde...');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    showAuthMessage(error.message || 'Erro ao criar conta.');
    return;
  }
  showAuthMessage('Conta criada. Verifique seu e-mail para confirmação (se habilitado). Faça login.');
});

btnSignIn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return showAuthMessage('Preencha email e senha.');

  showAuthMessage('Autenticando...');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showAuthMessage(error.message || 'Erro ao fazer login.');
    return;
  }
  showAuthMessage('');
  // onAuthStateChange will handle UI
});

btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// Auth state observer
supabase.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    userEmailLabel.innerText = currentUser.email || currentUser.id;
    showApp();
    loadProfile(currentUser.id);
  } else {
    currentUser = null;
    showAuth();
  }
});

// UI toggles
function showAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
}

// PROFILE CRUD (uses public.profiles table)
async function loadProfile(userId) {
  // profiles table should have: id (uuid = auth.user.id), name, role
  profileSection.innerHTML = `<div class="card form-card">Carregando perfil...</div>`;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { /* PGRST116 = no rows? */ }
  profile = data || null;
  renderProfileArea();
}

function renderProfileArea() {
  if (!profile) {
    // registration form
    profileSection.innerHTML = `
      <div class="card form-card">
        <div class="h3">Bem-vindo(a)!</div>
        <p class="muted">Complete seu perfil para continuar.</p>
        <input id="name" class="input" placeholder="Nome" />
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <button id="role-psicologo" class="btn" style="flex:1; background:#e6e7ff; color:#111;">Psicólogo(a)</button>
          <button id="role-paciente" class="btn" style="flex:1; background:#e6e7ff; color:#111;">Paciente</button>
        </div>
        <button id="save-profile" class="btn">Salvar e Continuar</button>
        <p id="profile-msg" class="muted" style="margin-top:8px;"></p>
      </div>
    `;

    document.getElementById('role-psicologo').addEventListener('click', () => { selectRole('psicologo'); });
    document.getElementById('role-paciente').addEventListener('click', () => { selectRole('paciente'); });
    document.getElementById('save-profile').addEventListener('click', saveProfile);
    window.__selectedRole = '';
    function selectRole(r) {
      window.__selectedRole = r;
      document.getElementById('profile-msg').innerText = `Papel selecionado: ${r}`;
    }
  } else {
    profileSection.innerHTML = `
      <div class="card form-card">
        <div class="h3">Perfil</div>
        <p><strong>${safeText(profile.name,'-')}</strong></p>
        <p class="muted">Papel: ${safeText(profile.role,'-')}</p>
        <div style="margin-top:10px">
          <button id="open-app" class="btn">Acessar Aplicativo</button>
        </div>
      </div>
    `;
    document.getElementById('open-app').addEventListener('click', () => {
      renderDashboardArea();
    });
  }
}

// Save profile
async function saveProfile() {
  const name = document.getElementById('name')?.value?.trim();
  const role = window.__selectedRole;
  const msgEl = document.getElementById('profile-msg');
  if (!name || !role) { msgEl.innerText = 'Preencha nome e selecione papel.'; return; }
  msgEl.innerText = 'Salvando...';

  const payload = { id: currentUser.id, name, role, created_at: new Date().toISOString() };
  const { error } = await supabase.from('profiles').upsert(payload, { returning: 'representation' });
  if (error) { msgEl.innerText = error.message || 'Erro ao salvar perfil.'; return; }
  msgEl.innerText = 'Perfil salvo!';
  // reload profile
  await loadProfile(currentUser.id);
}

// DASHBOARD AREA
async function renderDashboardArea() {
  dashboardSection.classList.remove('hidden');

  if (!profile) {
    dashboardSection.innerHTML = `<div class="card">Perfil não encontrado.</div>`;
    return;
  }

  if (profile.role === 'paciente') {
    // Simple patient app view
    dashboardSection.innerHTML = `
      <div>
        <div class="h3">Aplicativo do Paciente</div>
        <div class="card">
          <p>Olá <strong>${safeText(profile.name)}</strong>. Aqui você verá suas tarefas (coming soon).</p>
          <button id="btn-back-to-profile" class="btn" style="margin-top:10px; background:#111;">Voltar</button>
        </div>
      </div>
    `;
    document.getElementById('btn-back-to-profile').addEventListener('click', () => { dashboardSection.classList.add('hidden'); });
    return;
  }

  // Psicólogo dashboard
  dashboardSection.innerHTML = `
    <div>
      <div class="h3">Dashboard do Psicólogo — ${safeText(profile.name)}</div>

      <div class="card" style="margin-bottom:12px;">
        <form id="connect-form">
          <label class="muted">Conectar paciente pelo ID (UUID do perfil)</label>
          <input id="connect-id" class="input" placeholder="ID do paciente (ex: uuid)" />
          <div style="display:flex; gap:8px;">
            <button id="btn-connect" class="btn" type="submit">Conectar Paciente</button>
            <button id="btn-refresh" class="btn" type="button" style="background:#111;">Atualizar</button>
          </div>
          <p id="connect-msg" class="muted"></p>
        </form>
      </div>

      <div class="card">
        <div class="h3">Pacientes Conectados</div>
        <div id="patients-list" class="patients-list">Carregando...</div>
      </div>
    </div>
  `;

  document.getElementById('connect-form').addEventListener('submit', handleConnectPatient);
  document.getElementById('btn-refresh').addEventListener('click', loadConnectedPatients);

  // initial load
  loadConnectedPatients();
}

// Create connection row in public.connections
async function handleConnectPatient(e) {
  e.preventDefault();
  const input = document.getElementById('connect-id');
  const id = (input.value || '').trim();
  const msg = document.getElementById('connect-msg');
  msg.innerText = '';

  if (!id) { msg.innerText = 'Informe ID do paciente.'; return; }
  if (id === profile.id) { msg.innerText = 'Não é possível conectar consigo mesmo.'; return; }

  // check if patient exists and role == 'paciente'
  const { data: patientProfile, error: pError } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (pError || !patientProfile) { msg.innerText = 'Paciente não encontrado.'; return; }
  if (patientProfile.role !== 'paciente') { msg.innerText = 'Este usuário não é um paciente.'; return; }

  // upsert connection (psicologo_id, paciente_id)
  const { error } = await supabase.from('connections').upsert({
    psicologo_id: profile.id,
    paciente_id: id,
    paciente_name: patientProfile.name,
    created_at: new Date().toISOString()
  }, { onConflict: ['psicologo_id', 'paciente_id'] });

  if (error) { msg.innerText = error.message || 'Erro ao conectar paciente.'; return; }
  msg.innerText = 'Paciente conectado!';
  input.value = '';
  loadConnectedPatients();
}

// Load connected patients for the logged-in psychologist
async function loadConnectedPatients() {
  const listEl = document.getElementById('patients-list');
  listEl.innerHTML = 'Carregando...';
  // Query connections table
  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .eq('psicologo_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) { listEl.innerHTML = `<div class="error">Erro: ${error.message}</div>`; return; }
  if (!data || !data.length) { listEl.innerHTML = '<div class="muted">Nenhum paciente conectado.</div>'; return; }

  listEl.innerHTML = data.map(c => `
    <div class="patient-item">
      <div>
        <div style="font-weight:700">${safeText(c.paciente_name,'-')}</div>
        <div class="muted" style="font-size:13px">${safeText(c.paciente_id)}</div>
      </div>
      <div>
        <button class="btn" data-pid="${c.paciente_id}" style="background:#111;">Abrir</button>
      </div>
    </div>
  `).join('');

  // attach click handlers for "Abrir" buttons
  listEl.querySelectorAll('button[data-pid]').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      const pid = ev.currentTarget.dataset.pid;
      // open patient profile (simple modal or replace dashboard)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', pid).single();
      alert(`Paciente: ${p.name}\nID: ${p.id}\nPapel: ${p.role}`);
    });
  });
}

// INIT - check session
(async function init() {
  // If already logged in, supabase.onAuthStateChange will handle
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    currentUser = session.user;
    userEmailLabel.innerText = currentUser.email || currentUser.id;
    showApp();
    await loadProfile(currentUser.id);
  } else {
    showAuth();
  }
})();
