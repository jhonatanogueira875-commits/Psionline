/* app.js - Versão com Dashboard Admin completo
   Cards, gráfico de barras (atendimentos por mês),
   gráfico de linhas (novos usuários por mês) e
   lista de próximos agendamentos.
   REVISÃO 1: Corrigido o problema de evento do botão de login (prevenindo o refresh).
*/

// Configurações Supabase
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.error("ERRO: Supabase não inicializado");

// Estado da Aplicação
let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "dashboard";

/* ------------------------
   Utilitários e Estado de Erro
   ------------------------- */

// Exibe mensagens de erro na interface do login
function setErrorMessage(message) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
        errorEl.textContent = message;
        if (message) {
            errorEl.classList.remove('hidden');
        } else {
            errorEl.classList.add('hidden');
        }
    }
}

/* ------------------------
   Autenticação básica
   ------------------------- */

async function handleLogin(email, password) {
    setErrorMessage(''); // Limpa mensagens de erro anteriores

    if (!email || !password) {
        setErrorMessage('Por favor, preencha E-mail e Senha.');
        return;
    }

    // Gerenciamento do botão de login
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = 'Autenticando...';
    }

    try {
        // 1. Tenta fazer login
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Erro de login:", error.message);
            setErrorMessage('Falha no login. Verifique suas credenciais.');
        } else if (data.session) {
            currentAuthSession = data.session;
            
            // 2. Verifica se o usuário é um admin (buscando o perfil)
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('is_admin')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profileData || !profileData.is_admin) {
                // Se não for admin, desloga e mostra erro
                await supabaseClient.auth.signOut();
                setErrorMessage('Acesso negado. Usuário não é administrador.');
            } else {
                // Login de admin bem-sucedido
                currentPage = 'admin';
                render(); // Renderiza a página de administração
            }
        }
    } catch (e) {
        console.error("Erro inesperado durante o login:", e);
        setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
        // Reativa o botão e restaura o texto
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = 'Acessar Painel';
        }
    }
}

function handleLogout() {
    supabaseClient.auth.signOut().then(() => {
        currentPage = 'login';
        currentAuthSession = null;
        render();
    }).catch(e => {
        console.error("Erro ao fazer logout:", e);
        // Em caso de erro, tenta renderizar o login
        alert("Erro ao sair. Verifique o console.");
        currentPage = 'login';
        currentAuthSession = null;
        render();
    });
}

/* ------------------------
   Views: Login
   ------------------------- */

function renderLogin() {
    // Retorna a estrutura HTML do formulário de login
    return `
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl glass">
                <h1 class="text-3xl font-extrabold text-center text-indigo-700 mb-6">Psionline Admin</h1>
                
                <form id="login-form" class="space-y-4">
                    <!-- Área para mensagens de erro -->
                    <p id="login-error" class="hidden p-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded-lg"></p>
                    
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700">E-mail</label>
                        <input type="email" id="email" name="email" required placeholder="admin@psionline.com"
                               class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
                    </div>
                    
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700">Senha</label>
                        <input type="password" id="password" name="password" required placeholder="Sua senha secreta"
                               class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
                    </div>
                    
                    <button type="submit" id="login-button"
                            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out transform hover:scale-[1.01] active:scale-[0.99]">
                        Acessar Painel
                    </button>
                </form>
            </div>
        </div>
    `;
}

// NOVO: Função para anexar eventos APÓS o HTML ser inserido
function attachLoginEvents() {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // <--- CHAVE DA CORREÇÃO: Impede o refresh da página
            const email = e.target.elements.email.value;
            const password = e.target.elements.password.value;
            handleLogin(email, password);
        });
    }
}


/* ------------------------
   Views: Admin Shell e Eventos
   ------------------------- */

function renderAdminShell() {
    // Retorna a estrutura principal do painel (Sidebar e Header)
    return `
        <div class="min-h-screen bg-gray-50 flex">
            <!-- Sidebar -->
            <div class="w-64 bg-white shadow-xl flex flex-col">
                <div class="p-6 border-b">
                    <h1 class="text-2xl font-bold text-indigo-600">Psionline Admin</h1>
                </div>
                <nav class="flex-1 p-4 space-y-2">
                    ${renderAdminNavLink('dashboard', 'Início', 'M12 4.5V2.25C12 1.83 11.67 1.5 11.25 1.5H8.25C7.83 1.5 7.5 1.83 7.5 2.25V4.5M15.75 6.75V4.5C15.75 4.08 15.42 3.75 15 3.75H12M18.75 6.75V9H15V6.75C15 6.33 14.67 6 14.25 6H12M4.5 10.5V9C4.5 8.58 4.83 8.25 5.25 8.25H7.5V10.5M7.5 13.5V15H4.5V13.5C4.5 13.08 4.83 12.75 5.25 12.75H7.5M15 13.5V15H17.25C17.67 15 18 14.67 18 14.25V12M12 18.75V16.5C12 16.08 11.67 15.75 11.25 15.75H8.25C7.83 15.75 7.5 16.08 7.5 16.5V18.75M18 18.75V15H15V18.75M18.75 21V18.75M12 21V18.75M7.5 21V18.75M2.25 12C2.25 6.48 6.78 2.25 12 2.25C17.22 2.25 21.75 6.48 21.75 12C21.75 17.52 17.22 21.75 12 21.75C6.78 21.75 2.25 17.52 2.25 12Z')}
                    ${renderAdminNavLink('users', 'Usuários', 'M17.982 18.725A7.488 7.488 0 0012 15.75a7.491 7.491 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z')}
                    ${renderAdminNavLink('appointments', 'Agendamentos', 'M12 7.5H15M12 12H18M12 16.5H18M17.25 6H6.75C5.78 6 5 6.78 5 7.75V16.25C5 17.22 5.78 18 6.75 18H17.25C18.22 18 19 17.22 19 16.25V7.75C19 6.78 18.22 6 17.25 6Z')}
                    ${renderAdminNavLink('reports', 'Relatórios', 'M9 13.5H12M9 10.5H15M21.75 9V15C21.75 16.38 20.63 17.5 19.25 17.5H4.75C3.37 17.5 2.25 16.38 2.25 15V9C2.25 7.62 3.37 6.5 4.75 6.5H19.25C20.63 6.5 21.75 7.62 21.75 9ZM12 4.5V6.5M12 17.5V19.5M19.25 9V7.5M4.75 9V7.5M19.25 15V16.5M4.75 15V16.5')}
                </nav>
                <div class="p-4 border-t">
                    <!-- Botão de Logout -->
                    <button id="logout-button" class="w-full text-left flex items-center p-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition duration-150">
                        <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        Sair
                    </button>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="flex-1 overflow-y-auto">
                <header class="p-4 bg-white shadow-md flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-gray-800">${currentAdminTab.charAt(0).toUpperCase() + currentAdminTab.slice(1)}</h2>
                    <div class="text-gray-600 text-sm">Bem-vindo, Admin!</div>
                </header>
                <main id="admin-main-content" class="p-6">
                    <!-- Conteúdo dinâmico será injetado aqui por renderAdminContent() -->
                    <div class="text-center p-10 text-gray-500">Carregando conteúdo...</div>
                </main>
            </div>
        </div>
    `;
}

function attachAdminEvents() {
    // Adiciona o listener para o botão de Logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Adiciona listeners para os links de navegação
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const newTab = e.currentTarget.dataset.tab;
            if (currentAdminTab !== newTab) {
                currentAdminTab = newTab;
                render(); // Força o re-render de toda a shell para destacar o link
                renderAdminContent(); // Apenas atualiza o conteúdo principal
            }
        });
    });
}


function renderAdminNavLink(tab, label, svgPath) {
    const isActive = currentAdminTab === tab;
    const baseClasses = "admin-nav-link flex items-center p-3 rounded-lg transition duration-150 cursor-pointer";
    const activeClasses = "bg-indigo-100 text-indigo-700 font-semibold";
    const inactiveClasses = "text-gray-600 hover:bg-gray-100";
    
    return `
        <a href="#" data-tab="${tab}" class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${svgPath}"></path>
            </svg>
            ${label}
        </a>
    `;
}

/* -------------------------
   Conteúdo do Painel Admin (Funções de carregamento de dados e conteúdo)
   ------------------------- */

function renderAdminContent() {
    const main = document.getElementById('admin-main-content');
    if (!main) return;

    main.innerHTML = `<div class="p-10 text-center text-gray-500">Carregando ${currentAdminTab}...</div>`;

    if (currentAdminTab === 'dashboard') {
        loadDashboardData(main);
    } else if (currentAdminTab === 'users') {
        loadUsers(main);
    } else if (currentAdminTab === 'appointments') {
        loadAppointments(main);
    } else if (currentAdminTab === 'reports') {
        main.innerHTML = `<div class="p-6 bg-yellow-50 rounded-xl shadow">
            <h2 class="text-2xl mb-4 text-yellow-800">Relatórios</h2>
            <p class="text-gray-600">Funcionalidade de Relatórios ainda será implementada.</p>
        </div>`;
    }
}

async function loadDashboardData(main) {
    try {
        const [
            { count: totalUsers },
            { count: totalAppointments },
        ] = await Promise.all([
            supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
            supabaseClient.from('appointments').select('*', { count: 'exact', head: true }),
        ]);

        const totalClients = totalUsers || 0;
        const totalSessions = totalAppointments || 0;

        main.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                ${renderStatCard('Pacientes Totais', totalClients, 'M17.982 18.725A7.488 7.488 0 0012 15.75a7.491 7.491 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z', 'bg-indigo-600')}
                ${renderStatCard('Sessões Agendadas', totalSessions, 'M6.75 3V12M6.75 3C6.75 1.76 5.74 0.75 4.5 0.75S2.25 1.76 2.25 3V12M6.75 3H10.5C11.53 3 12.38 3.85 12.38 4.88V6.75M10.5 3H15.75C16.78 3 17.63 3.85 17.63 4.88V12M17.63 12V6.75M17.63 12H12.38C11.35 12 10.5 11.15 10.5 10.12V8.25M12.38 12H17.63', 'bg-green-500')}
                ${renderStatCard('Psicólogos Ativos', 1, 'M12 21v-8.25m0 0v-2.25m0 2.25l3 3m-3-3l-3 3m-3-4.5h18A2.25 2.25 0 0021.75 14.25v2.25a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 16.5v-2.25a2.25 2.25 0 012.25-2.25z', 'bg-yellow-500')}
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <h3 class="text-xl font-semibold mb-4">Atendimentos por Mês</h3>
                    <canvas id="appointmentsChart"></canvas>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <h3 class="text-xl font-semibold mb-4">Novos Usuários por Mês</h3>
                    <canvas id="usersChart"></canvas>
                </div>
            </div>
            <div class="mt-8">
                <div id="appointments-list-container">
                    <!-- Lista de Agendamentos será carregada aqui -->
                    <div class="p-6 bg-white rounded-xl shadow">Carregando agendamentos...</div>
                </div>
            </div>
        `;

        // Mock data for charts
        const monthlyLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        const monthlyAppointments = [12, 19, 3, 5, 2, 3];
        const newUsers = [5, 15, 10, 8, 12, 18];

        renderChart('appointmentsChart', 'bar', monthlyLabels, monthlyAppointments, 'Atendimentos', 'rgba(79, 70, 229, 0.8)');
        renderChart('usersChart', 'line', monthlyLabels, newUsers, 'Novos Usuários', 'rgba(16, 185, 129, 0.8)');
        
        loadNextAppointments();

    } catch (e) {
        main.innerHTML = `<div class="p-6 bg-red-50 rounded-xl text-red-700 shadow">Erro ao carregar dados do Dashboard: ${e.message}</div>`;
        console.error("Dashboard Load Error:", e);
    }
}

function renderStatCard(title, value, svgPath, bgColorClass) {
    return `
        <div class="p-6 ${bgColorClass} rounded-xl shadow-md flex items-center justify-between text-white transform hover:scale-[1.02] transition duration-300 ease-in-out">
            <div>
                <p class="text-3xl font-bold">${value}</p>
                <p class="text-sm opacity-90 mt-1">${title}</p>
            </div>
            <svg class="w-10 h-10 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${svgPath}"></path>
            </svg>
        </div>
    `;
}

function renderChart(canvasId, type, labels, data, label, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof window.Chart === 'undefined') return;

    new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: color.replace('0.8', '0.6'),
                borderColor: color.replace('0.8', '1'),
                borderWidth: type === 'line' ? 3 : 1,
                fill: type === 'line',
                tension: 0.4,
            }]
        },
        options: {
            responsive: true,
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

async function loadUsers(main) {
    try {
        const users = await supabaseClient
            .from('profiles')
            .select('*');
        
        if (users.error) throw new Error(users.error.message);

        const list = users.data.map(u => `
            <li class="p-4 border border-gray-200 rounded-lg mb-2 flex justify-between items-center bg-white hover:bg-gray-50 transition duration-150">
                <div>
                    <div class="font-semibold text-gray-800">${u.full_name || 'Nome Desconhecido'}</div>
                    <div class="text-sm text-gray-500">${u.email || 'E-mail não disponível'}</div>
                </div>
                <span class="text-xs font-medium px-3 py-1 rounded-full ${u.is_admin ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}">
                    ${u.is_admin ? 'Admin' : 'Usuário'}
                </span>
            </li>
        `).join('');

        main.innerHTML = `
            <div class="p-6 bg-white rounded-xl shadow-lg">
                <h2 class="text-2xl font-bold mb-6 text-gray-700">Gestão de Usuários (${users.data.length})</h2>
                <ul class="space-y-3">
                    ${list || '<li class="text-gray-500 p-4">Nenhum usuário encontrado.</li>'}
                </ul>
            </div>
        `;
    } catch (e) {
        main.innerHTML = `<div class="p-6 bg-red-50 rounded-xl text-red-700 shadow">Erro ao carregar Usuários: ${e.message}</div>`;
    }
}

async function loadAppointments(main) {
    try {
        // Exemplo: Carrega os 100 próximos agendamentos.
        const apps = await supabaseClient
            .from('appointments')
            .select('*, patient:patient_id(full_name), psychologist:psychologist_id(full_name)')
            .order('scheduled_date', { ascending: true })
            .limit(100);

        if (apps.error) throw new Error(apps.error.message);

        const list = apps.data.map(a => {
            // Garante que é um objeto, mesmo se a relação retornar um array
            const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
            const psy = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
            const date = new Date(a.scheduled_date).toLocaleDateString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

            return `
                <li class="p-4 border border-gray-200 rounded-lg mb-2 flex justify-between items-center bg-white hover:bg-gray-50 transition duration-150">
                    <div>
                        <div class="font-semibold text-gray-800">${patient?.full_name || 'Paciente Desconhecido'}</div>
                        <div class="text-sm text-indigo-600">${psy?.full_name || 'Psicólogo Desconhecido'}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-medium text-gray-700">${date}</div>
                        <div class="text-xs text-gray-500">${a.status || 'Pendente'}</div>
                    </div>
                </li>
            `;
        }).join('');

        main.innerHTML = `
            <div class="p-6 bg-white rounded-xl shadow-lg">
                <h2 class="text-2xl font-bold mb-6 text-gray-700">Próximos Agendamentos (${apps.data.length})</h2>
                <ul class="space-y-3">
                    ${list || '<li class="text-gray-500 p-4">Nenhum agendamento futuro encontrado.</li>'}
                </ul>
            </div>
        `;
    } catch (e) {
        main.innerHTML = `<div class="p-6 bg-red-50 rounded-xl text-red-700 shadow">Erro ao carregar Agendamentos: ${e.message}</div>`;
    }
}

async function loadNextAppointments() {
    const main = document.getElementById('appointments-list-container');
    if (!main) return;
    try {
      const apps = await supabaseClient
      .from('appointments')
      .select('scheduled_date, patient:patient_id(full_name), psychologist:psychologist_id(full_name)')
      .order('scheduled_date', { ascending: true })
      .limit(5);

      if (apps.error) throw new Error(apps.error.message);

      const list = apps.data.map(a => {
        const date = new Date(a.scheduled_date).toLocaleDateString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
        // Garante que é um objeto, mesmo se a relação retornar um array
        const patient = Array.isArray(a.patient)?a.patient[0]:a.patient;
        const psy = Array.isArray(a.psychologist)?a.psychologist[0]:a.psychologist;
        
        return `
            <li class="p-3 border border-gray-200 rounded-lg mb-2 flex justify-between items-center bg-white hover:bg-gray-50 transition duration-150">
                <div>
                    <div class="font-semibold text-gray-800">${patient?.full_name || 'Paciente'}</div>
                    <div class="text-sm text-gray-500">${psy?.full_name || 'Psicólogo'}</div>
                </div>
                <div class="text-sm font-medium text-indigo-600">${date}</div>
            </li>
        `;
      }).join('');
      
      main.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow-lg">
            <h2 class="text-xl font-semibold mb-4 text-gray-700">Próximos 5 Agendamentos</h2>
            <ul class="space-y-2">${list || '<li class="text-gray-500 p-3">Nenhum agendamento futuro.</li>'}</ul>
        </div>
        `;
    } catch (e) {
      main.innerHTML = `<div class="p-6 bg-red-50 rounded-xl text-red-700 shadow">Erro ao carregar lista de agendamentos: ${e.message}</div>`;
    }
}


/* -------------------------
   Render principal e Inicialização
   ------------------------- */

function render() {
  const app = document.getElementById('app');
  if (!app) return console.error("#app não encontrado");

  if (currentPage === 'login') { 
    app.innerHTML = renderLogin(); 
    // CHAVE: Anexa os ouvintes de eventos APÓS o HTML ser inserido
    attachLoginEvents(); 
    return; 
  }

  if (currentPage === 'admin') { 
    app.innerHTML = renderAdminShell(); 
    // Anexa os ouvintes de eventos para navegação e logout APÓS a shell ser inserida
    attachAdminEvents(); 
    renderAdminContent(); 
    return; 
  }
  
  app.innerHTML = "<p class='p-6 text-center text-red-500'>Página desconhecida</p>";
}

// Verifica e carrega o Chart.js dinamicamente (para garantir o funcionamento dos gráficos)
if (typeof window.Chart === 'undefined') {
    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js';
    chartScript.onload = () => {
        console.log("Chart.js carregado dinamicamente.");
        // Se o admin estava tentando carregar, tenta renderizar o conteúdo novamente
        if (currentPage === 'admin') {
            renderAdminContent();
        }
    };
    document.head.appendChild(chartScript);
}

// Inicialização: Tenta restaurar a sessão ou define o estado inicial como 'login'
supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        currentAuthSession = session;
        // Se há sessão, assume admin (para esta simplificação)
        currentPage = 'admin'; 
    } else {
        currentPage = 'login';
    }
    console.log("Estado de autenticação inicializado. Página:", currentPage);
    render();
}).catch(e => {
    console.error("Erro ao carregar sessão inicial do Supabase:", e);
    currentPage = 'login';
    render();
});
