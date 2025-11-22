/*
  app.js – Versão FINAL (JOIN fixado usando views)
  Sistema: PsiOnline
  Autor: ChatGPT
*/

// =============================================================
// 1. CONFIGURAÇÃO SUPABASE
// =============================================================
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabaseClient) {
  console.error("ERRO AO INICIALIZAR SUPABASE");
} else {
  console.log("Supabase inicializado.");
}

// =============================================================
// 2. ESTADO GLOBAL
// =============================================================
let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "appointments";

// =============================================================
// 3. AUTENTICAÇÃO
// =============================================================
async function handleLogin(email, password) {
  const msg = document.getElementById("login-error-message");
  if (msg) msg.classList.add("hidden");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (msg) {
      msg.textContent = "Erro de Login: email ou senha inválidos.";
      msg.classList.remove("hidden");
    }
    return;
  }

  currentAuthSession = data.session;
  currentPage = "admin";
  render();
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  currentPage = "login";
  currentAuthSession = null;
  render();
}

// =============================================================
// 4. BANCO DE DADOS (JOIN com views!)
// =============================================================

/** Carrega perfis */
async function loadProfiles() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email, role");

  if (error) throw error;
  return data;
}

/** Carrega agendamentos — agora usando VIEWS para evitar erro PGRST201 */
async function loadAppointments() {
  const { data, error } = await supabaseClient
    .from("appointments")
    .select(`
      *,
      patient:patients_view!appointments_patient_id_fkey1 (
        id,
        full_name,
        email
      ),
      psychologist:psychologists_view!appointments_psychologist_id_fkey1 (
        id,
        full_name,
        email
      )
    `);

  if (error) {
    console.error("ERRO JOIN appointments:", error);
    throw error;
  }

  return data;
}

// =============================================================
// 5. TELAS
// =============================================================
function renderLogin() {
  return `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <h1 class="text-3xl font-bold text-center text-purple-700 mb-6">Login Administrativo</h1>

        <form onsubmit="event.preventDefault(); handleLogin(email.value, password.value)">
          <label class="block mb-3">
            <span class="font-semibold text-gray-700">Email</span>
            <input id="email" type="email" class="w-full p-3 border rounded-lg mt-1" required>
          </label>

          <label class="block mb-4">
            <span class="font-semibold text-gray-700">Senha</span>
            <input id="password" type="password" class="w-full p-3 border rounded-lg mt-1" required>
          </label>

          <button class="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 font-bold">Entrar</button>

          <p id="login-error-message" class="hidden mt-4 text-center text-red-500 text-sm"></p>
        </form>
      </div>
    </div>
  `;
}

function renderAdminShell() {
  return `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="bg-purple-700 text-white p-4 flex justify-between">
        <h1 class="text-xl font-bold">Painel Administrativo</h1>
        <nav>
          <button onclick="currentAdminTab='profiles'; renderAdminContent()" class="px-4 py-2 ${currentAdminTab === 'profiles' ? 'bg-purple-900' : 'hover:bg-purple-600'} rounded-lg">Perfis</button>
          <button onclick="currentAdminTab='appointments'; renderAdminContent()" class="px-4 py-2 ${currentAdminTab === 'appointments' ? 'bg-purple-900' : 'hover:bg-purple-600'} rounded-lg">Agendamentos</button>
          <button onclick="handleLogout()" class="ml-4 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg">Sair</button>
        </nav>
      </header>

      <main class="flex-grow p-6">
        <div id="admin-content"></div>
      </main>
    </div>
  `;
}

// =============================================================
// 6. CONTEÚDO DA ÁREA ADMINISTRATIVA
// =============================================================
async function renderAdminContent() {
  const box = document.getElementById("admin-content");

  // LOADING
  box.innerHTML = `
    <div class="p-10 text-center">
      <div class="animate-spin h-10 w-10 border-b-2 border-purple-700 mx-auto"></div>
      <p class="mt-4 text-gray-600">Carregando...</p>
    </div>
  `;

  // -------- PERFIS ----------
  if (currentAdminTab === "profiles") {
    try {
      const profiles = await loadProfiles();

      box.innerHTML = `
        <div class="p-6 bg-white shadow rounded-xl">
          <h2 class="text-2xl font-bold mb-6 text-gray-800">Perfis (${profiles.length})</h2>
          <ul class="space-y-3">
            ${profiles
              .map(
                (p) => `
              <li class="p-3 bg-gray-50 border rounded-lg">
                <b>${p.full_name || "Sem nome"}</b> — ${p.email} 
                <span class="text-purple-600">(${p.role})</span>
              </li>
            `
              )
              .join("")}
          </ul>
        </div>
      `;
    } catch (e) {
      box.innerHTML = `<p class="text-red-500">Erro: ${e.message}</p>`;
    }
    return;
  }

  // -------- AGENDAMENTOS ----------
  if (currentAdminTab === "appointments") {
    try {
      const apps = await loadAppointments();

      box.innerHTML = `
        <div class="p-6 bg-white shadow rounded-xl">
          <h2 class="text-2xl font-bold mb-6 text-gray-800">Agendamentos (${apps.length})</h2>
          <ul class="space-y-4">
            ${apps
              .map((a) => {
                const patient = a.patient;
                const psy = a.psychologist;

                return `
                <li class="p-4 bg-indigo-50 border rounded-lg">
                  <div><b>ID:</b> ${a.id}</div>
                  <div><b>Data:</b> ${new Date(a.date || a.created_at).toLocaleString(
                    "pt-BR"
                  )}</div>
                  <div><b>Paciente:</b> ${patient?.full_name || "N/D"} (${patient?.email || "-"})</div>
                  <div><b>Psicólogo:</b> ${psy?.full_name || "N/D"} (${psy?.email || "-"})</div>
                </li>
              `;
              })
              .join("")}
          </ul>
        </div>
      `;
    } catch (e) {
      box.innerHTML = `<p class="text-red-500">ERRO: ${e.message}</p>`;
    }
  }
}

// =============================================================
// 7. RENDERIZAÇÃO PRINCIPAL
// =============================================================
function render() {
  const app = document.getElementById("app");

  if (!app) return alert("Elemento #app não encontrado!");

  if (currentPage === "login") {
    app.innerHTML = renderLogin();
    return;
  }

  if (currentPage === "admin") {
    app.innerHTML = renderAdminShell();
    renderAdminContent();
    return;
  }

  app.innerHTML = "<p>Página não encontrada.</p>";
}

// Autenticação automática
supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("Auth Event:", event);
  currentAuthSession = session;
  currentPage = session ? "admin" : "login";
  render();
});

// Inicializa
render();
