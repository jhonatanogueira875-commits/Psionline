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
   Funções de Autenticação
   ------------------------- */

// Função para verificar o status de administrador do usuário
async function checkAdminStatus(userId) {
  if (!userId) return false;
  
  console.log("Verificando status de administrador/ROLE para o ID:", userId);

  try {
    // CORREÇÃO CRÍTICA: O erro anterior 'is_admin does not exist' foi corrigido.
    // Agora buscamos a coluna 'role' que existe na tabela 'profiles'.
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('role') // AGORA BUSCA A COLUNA 'ROLE'
      .eq('id', userId)
      .single(); // Espera apenas um resultado

    if (error) {
        // Erro geral (RLS, rede, etc.)
        console.error("Erro ao buscar perfil (possível RLS ou coluna 'role' ausente):", error.message);
        showToast(`Erro ao checar Role: ${error.message}. Verifique RLS ou o nome da coluna 'role'.`, 'error');
        return false;
    }
    
    // Se os dados existirem e a 'role' for EXATAMENTE 'admin'
    const isAdmin = data && data.role === 'admin';
    console.log(`Role encontrada: ${data.role}. É Admin? ${isAdmin}`);
    
    // Se o usuário não é admin, exibe um toast informativo
    if (!isAdmin) {
        // A mensagem é exibida antes do logout ser forçado
        showToast(`Sua função ('${data?.role || 'indefinida'}') não tem acesso ao painel de administração.`, 'warn');
    }
    
    return isAdmin;

  } catch (e) {
    console.error("Exceção ao verificar status de administrador:", e);
    showToast(`Erro Inesperado na Admin Check: ${e.message}`, 'error');
    return false;
  }
}

// Lida com a mudança de estado de autenticação (login/logout)
async function handleAuthChange(session) {
  currentAuthSession = session;
  let isAdmin = false;

  if (session) {
    console.log("Usuário autenticado:", session.user.id);
    // CRÍTICO: Se o login for bem-sucedido, verifica o admin status
    isAdmin = await checkAdminStatus(session.user.id);
  } else {
    console.log("Nenhuma sessão ativa. Exibindo tela de login.");
  }

  // Define a página e o estado baseado no resultado da verificação
  if (isAdmin) {
    currentPage = 'admin';
    currentAdminTab = 'dashboard';
  } else {
    currentPage = 'login';
    // Se logado mas não admin OU se houve erro na checagem, desloga para garantir
    if (session) {
      console.warn("Usuário logado, mas não é administrador. Forçando logout e exibindo tela de login.");
      // Não precisa esperar o signOut, pois o listener vai lidar com o próximo evento
      supabaseClient.auth.signOut(); 
    }
  }

  // Sempre renderiza a UI após a mudança de estado
  render();
}

async function handleLogin(email, password) {
  const loginButton = document.getElementById('login-btn');
  const errorArea = document.getElementById('login-error');
  
  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = 'Entrando...';
  }
  if (errorArea) errorArea.innerHTML = '';
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Erro de login:", error.message);
      if (errorArea) {
        // Exibe o erro da API, que será "Invalid login credentials"
        errorArea.innerHTML = `<p class="text-red-500 mt-2 text-sm">Falha no Login: ${error.message}</p>`;
      }
      return; 
    }
    
    // Se o login for bem-sucedido, o listener onAuthStateChange será disparado, 
    // que por sua vez chama handleAuthChange.
    console.log("Login bem-sucedido. Session:", data.session);

  } catch (e) {
    console.error("Exceção de Login:", e);
    if (errorArea) {
      errorArea.innerHTML = `<p class="text-red-500 mt-2 text-sm">Erro inesperado: ${e.message}</p>`;
    }
  } finally {
    if (loginButton) {
      // O botão será reativado após o handleAuthChange() finalizar a renderização completa
      // Se der erro de login antes de handleAuthChange, reativa aqui:
      if (currentPage === 'login') {
         loginButton.disabled = false;
         loginButton.textContent = 'Entrar';
      }
    }
  }
}

function handleLogout() {
  supabaseClient.auth.signOut();
  // onAuthStateChange irá lidar com a transição para a tela de login
}


/* ------------------------
   Funções de Utilitário
   ------------------------ */

// Exibe uma mensagem flutuante (Toast)
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const color = type === 'error' ? 'bg-red-500' : (type === 'warn' ? 'bg-yellow-500' : 'bg-blue-500');
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 ${color} text-white p-4 rounded-lg shadow-xl transition-opacity duration-300 z-50`;
    toast.textContent = message;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300); // Remove after fade
    }, 4000); // Show for 4 seconds
}

/* ------------------------
   Views - Login
   ------------------------ */

function renderLogin() {
  return `
    <div class="flex items-center justify-center h-screen bg-gray-100">
      <div class="glass p-8 w-full max-w-md rounded-xl shadow-2xl">
        <h1 class="text-3xl font-bold mb-6 text-indigo-700 text-center">Psionline Admin Login</h1>
        <form id="login-form" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email:</label>
            <input type="email" id="email" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Senha:</label>
            <input type="password" id="password" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div id="login-error" class="text-center"></div>
          <button type="submit" id="login-btn" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150">
            Entrar
          </button>
        </form>
      </div>
    </div>
    <div id="toast-container"></div>
  `;
}

// ATUALIZADO: Usando um listener mais simples e seguro
function attachLoginListeners() {
  const form = document.getElementById('login-form');
  if (form) {
    // Garante que o listener só é adicionado uma vez após a renderização
    form.onsubmit = (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      handleLogin(email, password);
    };
  }
}

/* ------------------------
   Views - Admin Shell
   ------------------------ */

function renderAdminShell() {
  const userId = currentAuthSession?.user?.id || 'N/A';
  return `
    <div class="flex h-screen bg-gray-50">
      <!-- Sidebar -->
      <div class="w-64 bg-gray-800 text-white flex flex-col shadow-2xl">
        <div class="p-6 text-2xl font-bold text-center border-b border-gray-700 text-indigo-300">
          Psionline Admin
        </div>
        <nav class="flex-grow p-4 space-y-2">
          ${renderTabLink('dashboard', 'Início')}
          ${renderTabLink('appointments', 'Agendamentos')}
          ${renderTabLink('users', 'Usuários')}
        </nav>
        <div class="p-4 border-t border-gray-700">
            <div class="text-xs mb-2 text-gray-400 truncate">
                ID do Usuário: ${userId}
            </div>
            <button id="logout-btn" class="w-full py-2 px-4 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition duration-150 shadow-md">
                Sair
            </button>
        </div>
      </div>
      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto">
        <header class="p-4 bg-white shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 class="text-2xl font-semibold text-gray-800">
            ${currentAdminTab.charAt(0).toUpperCase() + currentAdminTab.slice(1)}
          </h1>
        </header>
        <main id="admin-content" class="p-6">
          <!-- Conteúdo específico da aba será injetado aqui -->
          <div class="text-center p-10 text-gray-500">Carregando conteúdo...</div>
        </main>
      </div>
    </div>
    <div id="toast-container"></div>
  `;
}

function renderTabLink(tabName, label) {
  const isActive = currentAdminTab === tabName;
  const activeClass = isActive ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-gray-700';
  return `
    <a href="#" data-tab="${tabName}" class="tab-link block py-2 px-3 rounded-lg ${activeClass} transition duration-150">
      ${label}
    </a>
  `;
}

function attachAdminListeners() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  document.querySelectorAll('.tab-link').forEach(link => {
    link.onclick = (e) => { // Usando onclick para evitar múltiplos listeners em re-render
      e.preventDefault();
      currentAdminTab = e.target.getAttribute('data-tab');
      render(); // Força a re-renderização da shell para atualizar a aba ativa
      renderAdminContent(); // Apenas carrega o novo conteúdo
    };
  });
}

/* ------------------------
   Views - Admin Content
   ------------------------ */

// Gráfico: Placeholder para demonstração (sem Chart.js aqui)
function renderChart(canvasId, type, labels, dataSet, options) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (typeof window.Chart === 'undefined') {
        // Mensagem de erro se o Chart.js não estiver carregado
        ctx.parentNode.innerHTML = `<p class="text-sm text-red-500">ERRO: Chart.js não carregado. Gráfico indisponível. Adicione a CDN.</p>`;
        return;
    }
    
    new window.Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: dataSet,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: options.title, text: options.titleText || '' }
            },
            ...options
        }
    });
}


// Placeholder para dados mockados/simulados
function mockData() {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return {
        appointments: [120, 150, 180, 140, 160, 190, 200, 210, 230, 250, 260, 280],
        newUsers: [30, 45, 55, 40, 50, 60, 65, 70, 80, 85, 90, 100],
        months: months
    };
}


async function renderAdminContent() {
  const main = document.getElementById('admin-content');
  if (!main) return;
  
  if (currentAdminTab === 'dashboard') {
    main.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <!-- Cards de Métricas -->
        ${renderMetricCard('Total de Usuários', '2,450', 'bg-blue-500', 'Mês: +100')}
        ${renderMetricCard('Atendimentos Mês', '280', 'bg-green-500', 'Ano: +15%')}
        ${renderMetricCard('Psicólogos Ativos', '45', 'bg-yellow-500', 'Novos: 2')}
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Gráfico de Barras: Atendimentos por Mês -->
        <div class="lg:col-span-2 bg-white p-6 rounded-xl shadow h-96">
          <h2 class="text-xl font-semibold mb-4 text-gray-800">Volume de Atendimentos</h2>
          <div class="h-80">
            <canvas id="appointmentsChart"></canvas>
          </div>
        </div>
        
        <!-- Próximos Agendamentos -->
        <div class="lg:col-span-1 bg-white p-6 rounded-xl shadow h-96">
          <h2 class="text-xl font-semibold mb-4 text-gray-800">Próximos Agendamentos</h2>
          <div id="latest-appointments-list">
             <!-- Conteúdo injetado por fetchLatestAppointments -->
          </div>
        </div>

        <!-- Gráfico de Linha: Novos Usuários por Mês -->
        <div class="lg:col-span-3 bg-white p-6 rounded-xl shadow h-96">
          <h2 class="text-xl font-semibold mb-4 text-gray-800">Novos Cadastros</h2>
          <div class="h-80">
            <canvas id="newUsersChart"></canvas>
          </div>
        </div>
      </div>
    `;

    // Carrega dados e renderiza gráficos
    const data = mockData(); // Usando mockData por enquanto
    
    renderChart('appointmentsChart', 'bar', data.months, [{
      label: 'Atendimentos',
      data: data.appointments,
      backgroundColor: 'rgba(59, 130, 246, 0.6)', // Tailwind blue-500
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }], { scales: { y: { beginAtZero: true } } });

    renderChart('newUsersChart', 'line', data.months, [{
        label: 'Novos Usuários',
        data: data.newUsers,
        borderColor: 'rgba(16, 185, 129, 1)', // Tailwind green-500
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
    }], { scales: { y: { beginAtZero: true } } });
    
    // Carrega agendamentos em tempo real
    fetchLatestAppointments();
    
    return;
  }
  
  if (currentAdminTab === 'appointments') {
    main.innerHTML = `<div class="p-6 bg-white rounded-xl shadow">
        <h2 class="text-2xl font-bold mb-4 text-gray-700">Gestão de Agendamentos</h2>
        <p class="text-gray-600">Funcionalidade de Agendamentos ainda será implementada. Aqui você verá uma lista de todos os agendamentos, com opções para editar ou cancelar.</p>
    </div>`;
    return;
  }
  
  if (currentAdminTab === 'users') {
    main.innerHTML = `<div class="p-6 bg-white rounded-xl shadow">
        <h2 class="text-2xl font-bold mb-4 text-gray-700">Gestão de Usuários</h2>
        <p class="text-gray-600">Funcionalidade de Usuários ainda será implementada. Aqui você poderá ver e gerenciar a lista de pacientes e psicólogos.</p>
    </div>`;
    return;
  }
}

function renderMetricCard(title, value, bgColor, changeText) {
  return `
    <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 ${bgColor.replace('-500', '-600')} flex flex-col justify-between h-32">
      <p class="text-sm font-medium text-gray-500">${title}</p>
      <p class="text-4xl font-extrabold text-gray-900 mt-1">${value}</p>
      <p class="text-xs text-gray-500 mt-2">${changeText}</p>
    </div>
  `;
}

// Simula busca dos 5 próximos agendamentos com JOINs
async function fetchLatestAppointments() {
    const main = document.getElementById('latest-appointments-list');
    if (!main) return;

    try {
      main.innerHTML = `<div class="text-center p-4 text-gray-500"><div class="animate-pulse">Carregando...</div></div>`;
      
      const apps = await supabaseClient
        .from('appointments')
        .select(`
          scheduled_date,
          patient:patient_id(full_name),
          psychologist:psychologist_id(full_name)
        `)
        .order('scheduled_date', { ascending: true }) // Ordena pelo mais próximo
        .limit(5);

      if (apps.error) {
        throw new Error(apps.error.message || 'Erro ao buscar agendamentos.');
      }
      
      if (!apps.data || apps.data.length === 0) {
        main.innerHTML = `<li class="text-gray-600 list-none p-3">Nenhum agendamento encontrado.</li>`;
        return;
      }

      const list = apps.data.map(a => {
        // Garantia de que patient e psy são objetos, não arrays (para evitar erros de desestruturação)
        const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
        const psy = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
        
        // Formata a data (simplificado)
        const date = new Date(a.scheduled_date).toLocaleDateString('pt-BR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return `<li class="p-3 border rounded-lg mb-2 shadow-sm bg-gray-50 hover:bg-white transition duration-100">
                  <div class="font-semibold text-gray-800">${patient?.full_name || 'Paciente Desconhecido'}</div>
                  <div class="text-xs text-gray-600">${psy?.full_name || 'Psicólogo Desconhecido'} — <span class="font-medium text-indigo-600">${date || '-'}</span></div>
                </li>`;
      }).join('');
      
      main.innerHTML = `<ul class="space-y-2 list-none">${list}</ul>`;
      
    } catch (e) {
      main.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg border border-red-300 shadow">Erro ao carregar lista. (RLS?): ${e.message}</div>`;
    }
    return;
}

/* -------------------------
   Render principal
   ------------------------- */

// Array para armazenar referências de listeners para limpeza
const listeners = [];

function render() {
  const app = document.getElementById('app');
  if (!app) return console.error("#app não encontrado");
  
  // Limpa todos os listeners existentes antes de re-renderizar
  listeners.forEach(listener => listener.element.removeEventListener(listener.event, listener.handler));
  listeners.length = 0; // Limpa o array

  if (currentPage === 'login') { 
    app.innerHTML = renderLogin(); 
    attachLoginListeners(); 
    return; 
  }
  
  if (currentPage === 'admin') { 
    app.innerHTML = renderAdminShell(); 
    attachAdminListeners(); 
    renderAdminContent(); 
    return; 
  }
  
  app.innerHTML = "<p class='p-6 text-center text-red-500'>Página desconhecida</p>";
}

// Função utilitária para adicionar listener e armazenar para limpeza
function addListener(element, event, handler) {
    element.addEventListener(event, handler);
    listeners.push({ element, event, handler });
}

function initializeApp() {
  // Configura um listener para mudanças de estado de autenticação (login, logout, token inicial)
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Evento de Autenticação:', event);
      handleAuthChange(session);
    });
  } else {
    handleAuthChange(null); 
  }
  
  // A verificação do Chart.js é importante, mas não bloqueia a aplicação
  if (typeof window.Chart === 'undefined') {
      console.error("ERRO: Chart.js não está carregado. Gráficos não funcionarão.");
  }
}

// Inicia o processo de inicialização
window.onload = initializeApp;
