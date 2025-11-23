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

// Certifica-se de que o cliente Supabase só é criado se a biblioteca estiver carregada
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.error("ERRO: Supabase não inicializado. Verifique a ordem dos scripts no index.html");

let currentPage = "login";
let currentAuthSession = null;
let currentAdminTab = "dashboard";
let charts = {}; // Objeto para armazenar instâncias de gráficos

/* ------------------------
   Funções de Autenticação
   ------------------------- */

// Função de inicialização
async function initApp() {
    // Escuta mudanças no estado de autenticação (login/logout)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentAuthSession = session;
        console.log(`Estado de Autenticação: ${event}`);
        
        if (session) {
            // Usuário logado
            checkUserRole(session.user);
        } else {
            // Usuário deslogado
            currentPage = 'login';
            render();
        }
    });

    // Tenta carregar a sessão atual ao iniciar
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentAuthSession = session;
        if (session) {
            await checkUserRole(session.user);
        } else {
            // Se não houver sessão, vai para a tela de login
            currentPage = 'login';
            render();
        }
    } catch (error) {
        console.error("Erro ao tentar obter sessão:", error);
        currentPage = 'login';
        render();
    }
}
// EXPOR initApp para o escopo global (window)
window.initApp = initApp;


// Verifica o papel do usuário (admin, psychologist, patient)
async function checkUserRole(user) {
    if (!user) return;
    
    // Consulta o perfil para pegar o 'role'
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (error) {
        console.error("ERRO: Não foi possível buscar o perfil.", error);
        // Em caso de erro, desloga para forçar um novo login
        await supabaseClient.auth.signOut();
        return;
    }

    if (data.role === 'admin') {
        console.log("PERFIL ENCONTRADO. Papel do usuário: admin");
        currentPage = 'admin';
        render();
    } else {
        console.error(`Acesso negado. Papel do usuário: ${data.role}`);
        alertUser("Acesso negado. Você não é um administrador.", "error");
        await supabaseClient.auth.signOut();
    }
}


// Função de Login
async function handleLogin(email, password) {
    console.log("TENTATIVA DE LOGIN:", email);
    try {
        // Loga o usuário
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            // Se o erro for 'Invalid login credentials', exibe uma mensagem amigável
            if (error.message.includes("Invalid login credentials")) {
                alertUser("Credenciais inválidas. Verifique seu email e senha.", "error");
            } else {
                alertUser(`Erro no Login: ${error.message}`, "error");
            }
            console.error("ERRO NO LOGIN:", error.message);
            return;
        }

        console.log("SUCESSO NO LOGIN. Buscando perfil...");
        // onAuthStateChange cuidará do resto (checkUserRole e renderização)

    } catch (e) {
        alertUser(`Erro inesperado: ${e.message}`, "error");
        console.error("ERRO INESPERADO NO LOGIN:", e);
    }
}

// Função de Cadastro de Novo Usuário (Admin/Psicólogo)
async function handleNewUserCreation(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const role = form.role.value;
    const full_name = form.full_name.value;

    try {
        // 1. Tenta criar o usuário no auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { role: role, full_name: full_name } }
        });

        if (authError) {
             // Tratamento específico para Rate Limit (o erro que você viu)
            if (authError.message.includes("email rate limit exceeded")) {
                 alertUser("ERRO NO CADASTRO: Limite de taxa de e-mail excedido. Tente novamente mais tarde.", "error");
            } else {
                // Outros erros de auth (usuário já existe, senha fraca, etc.)
                alertUser(`ERRO NO CADASTRO: ${authError.message}`, "error");
            }
            console.error("ERRO NO CADASTRO:", authError.message, authError);
            return;
        }

        const newUser = authData.user;
        
        // 2. Cria o perfil correspondente na tabela 'profiles'
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([
                { id: newUser.id, full_name: full_name, role: role, email: email }
            ]);

        if (profileError) {
            // Loga o erro, mas o usuário já foi criado no auth.
            // Aqui você deveria deslogar e/ou deletar o usuário criado, mas 
            // para simplificar, apenas alertamos.
            console.error("ERRO AO CRIAR PERFIL:", profileError);
            alertUser("Usuário de autenticação criado, mas falha ao criar o perfil.", "warning");
            return;
        }

        alertUser(`Usuário ${full_name} (${role}) cadastrado com sucesso! Um email de confirmação foi enviado.`, "success");
        form.reset();
        
    } catch (e) {
        console.error("ERRO INESPERADO NO CADASTRO:", e);
        alertUser(`Erro inesperado: ${e.message}`, "error");
    }
}

// Função de Logout
async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentPage = 'login';
    currentAuthSession = null;
    currentAdminTab = 'dashboard';
    render();
}

/* ------------------------
   Funções de Utilitário e UI
   ------------------------- */

// Função para exibir alertas (simples, sem alert() nativo)
function alertUser(message, type = "info") {
    // Mapeamento de classes de estilo
    const classes = {
        success: 'bg-[#ecfdf5] border-[#10b981] text-[#065f46]', // Green
        error: 'bg-[#fef2f2] border-[#f87171] text-[#991b1b]', // Red
        warning: 'bg-[#fffbeb] border-[#fcd34d] text-[#b45309]', // Yellow
        info: 'bg-[#eff6ff] border-[#60a5fa] text-[#1e40af]' // Blue
    };

    const alertArea = document.getElementById('alert-area') || document.body;
    const alertDiv = document.createElement('div');
    alertDiv.className = `p-3 rounded-lg border shadow-md fixed top-4 right-4 z-50 transition-opacity duration-300 ${classes[type]}`;
    alertDiv.innerHTML = `<p class="font-semibold">${message}</p>`;

    // Adiciona ao DOM
    alertArea.appendChild(alertDiv);

    // Remove automaticamente após 5 segundos
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}


/* ------------------------
   Renderização de Páginas
   ------------------------- */

// Renderização da Tela de Login
function renderLogin() {
    return `
        <div id="alert-area"></div>
        <div class="flex justify-center items-center h-screen bg-gray-50">
            <div class="card w-full max-w-md p-8">
                <h1 class="text-3xl font-bold text-center mb-6">Psionline Admin</h1>
                <form id="login-form">
                    <div class="form-group">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" id="email" name="email" class="form-input" placeholder="seu@email.com" required>
                    </div>
                    <div class="form-group">
                        <label for="password" class="form-label">Senha</label>
                        <input type="password" id="password" name="password" class="form-input" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn-primary">Entrar</button>
                </form>
            </div>
        </div>
    `;
}

// Configura os listeners de evento para a tela de login
function setupLoginListeners() {
    const form = document.getElementById('login-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            await handleLogin(email, password);
        };
    }
}


// Renderização do Shell do Painel Admin (estrutura de navegação)
function renderAdminShell() {
    const adminUser = currentAuthSession?.user?.user_metadata?.full_name || 'Admin';
    
    return `
        <div id="alert-area"></div>
        <div class="admin-layout">
            <!-- Sidebar -->
            <div class="sidebar">
                <h2 class="text-2xl font-bold mb-8 text-center" style="color: var(--primary-color);">Psionline</h2>
                <nav>
                    <a href="#" class="nav-link ${currentAdminTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">Dashboard</a>
                    <a href="#" class="nav-link ${currentAdminTab === 'users' ? 'active' : ''}" data-tab="users">Usuários</a>
                    <a href="#" class="nav-link ${currentAdminTab === 'new-user' ? 'active' : ''}" data-tab="new-user">Novo Cadastro</a>
                </nav>
            </div>

            <!-- Conteúdo Principal -->
            <div class="main-content-area">
                <header class="header">
                    <h1 class="text-2xl font-semibold">
                        ${currentAdminTab === 'dashboard' ? 'Dashboard' : ''}
                        ${currentAdminTab === 'users' ? 'Gestão de Usuários' : ''}
                        ${currentAdminTab === 'new-user' ? 'Novo Cadastro' : ''}
                    </h1>
                    <div class="flex items-center">
                        <span class="text-sm mr-4">Olá, ${adminUser}</span>
                        <button id="logout-btn" class="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-lg transition-colors">Sair</button>
                    </div>
                </header>
                <div id="admin-content-detail">
                    <!-- O conteúdo da aba selecionada será injetado aqui -->
                    <div class="text-center p-12 text-gray-500">Carregando conteúdo...</div>
                </div>
            </div>
        </div>
    `;
}

// Configura os listeners para o Shell Admin
function setupAdminListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = handleLogout;
    }

    // Listener para troca de abas
    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const tab = e.target.getAttribute('data-tab');
            if (tab && tab !== currentAdminTab) {
                currentAdminTab = tab;
                // Re-renderiza o shell para atualizar o estado ativo da aba
                document.getElementById('app').innerHTML = renderAdminShell();
                setupAdminListeners(); // Re-seta listeners após re-renderização
                renderAdminContent(); // Carrega o novo conteúdo da aba
            }
        };
    });
}


/* ------------------------
   Renderização do Conteúdo Admin (por aba)
   ------------------------- */

// Renderiza o conteúdo específico da aba selecionada
function renderAdminContent() {
    const main = document.getElementById('admin-content-detail');
    if (!main) return;

    // Limpa gráficos anteriores para evitar vazamento de memória
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};

    switch (currentAdminTab) {
        case 'dashboard':
            main.innerHTML = renderDashboardContent();
            // Após a injeção do HTML, carrega os dados e renderiza os gráficos
            loadDashboardData(); 
            break;
        case 'users':
            main.innerHTML = renderUsersContent();
            loadUsersList();
            break;
        case 'new-user':
            main.innerHTML = renderNewUserContent();
            setupNewUserListeners();
            break;
        default:
            main.innerHTML = `<div class="p-6 bg-white rounded-xl shadow"><p class="text-gray-500">Selecione uma aba.</p></div>`;
    }
}

// --- Conteúdo da Aba Dashboard ---
function renderDashboardContent() {
    return `
        <div class="grid-3 mb-6">
            <div id="card-total-users" class="card">
                <p class="text-sm font-semibold text-gray-500">Usuários Totais</p>
                <p class="text-3xl font-bold mt-1">...</p>
            </div>
            <div id="card-total-psychologists" class="card">
                <p class="text-sm font-semibold text-gray-500">Psicólogos Ativos</p>
                <p class="text-3xl font-bold mt-1">...</p>
            </div>
            <div id="card-pending-appointments" class="card">
                <p class="text-sm font-semibold text-gray-500">Agendamentos Pendentes</p>
                <p class="text-3xl font-bold mt-1">...</p>
            </div>
        </div>

        <div class="grid-2-1">
            <!-- Gráficos de Atendimentos e Novos Usuários -->
            <div>
                <div class="card mb-6">
                    <h2 class="text-xl font-semibold mb-3">Atendimentos por Mês</h2>
                    <canvas id="appointments-chart" style="max-height: 400px;"></canvas>
                </div>
                <div class="card">
                    <h2 class="text-xl font-semibold mb-3">Novos Usuários por Mês</h2>
                    <canvas id="new-users-chart" style="max-height: 400px;"></canvas>
                </div>
            </div>

            <!-- Próximos Agendamentos -->
            <div id="upcoming-appointments-card" class="card">
                <h2 class="text-xl font-semibold mb-3">Próximos Agendamentos</h2>
                <!-- Lista será injetada aqui -->
            </div>
        </div>
    `;
}

// Carrega os dados e renderiza os gráficos
async function loadDashboardData() {
    const currentYear = new Date().getFullYear();
    
    // --- Card Data ---
    const [
        totalUsersRes, 
        totalPsyRes, 
        pendingAppsRes
    ] = await Promise.all([
        supabaseClient.from('profiles').select('id', { count: 'exact' }),
        supabaseClient.from('profiles').select('id', { count: 'exact' }).eq('role', 'psychologist'),
        supabaseClient.from('appointments').select('id', { count: 'exact' }).eq('status', 'pending')
    ]);

    document.getElementById('card-total-users').querySelector('p:nth-child(2)').textContent = totalUsersRes.count || '0';
    document.getElementById('card-total-psychologists').querySelector('p:nth-child(2)').textContent = totalPsyRes.count || '0';
    document.getElementById('card-pending-appointments').querySelector('p:nth-child(2)').textContent = pendingAppsRes.count || '0';

    // --- Chart Data ---
    // 1. Agendamentos por mês (fictício, pois a query real é complexa para o escopo)
    const monthlyAppointmentsData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        datasets: [{
            label: 'Atendimentos Realizados',
            data: [15, 20, 35, 40, 50, 45, 60, 55, 70, 80, 75, 90], // Dados de exemplo
            backgroundColor: 'rgba(79, 70, 229, 0.7)', // Cor primária
            borderColor: 'rgb(79, 70, 229)',
            borderWidth: 1
        }]
    };
    
    // 2. Novos Usuários por mês (fictício)
    const newUsersData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        datasets: [{
            label: 'Novos Cadastros',
            data: [5, 10, 8, 15, 12, 20, 18, 25, 22, 30, 28, 35], // Dados de exemplo
            borderColor: 'rgb(20, 184, 166)', // Teal 500
            tension: 0.1,
            fill: false
        }]
    };

    // Renderiza o Gráfico de Barras (Atendimentos)
    const ctxAppointments = document.getElementById('appointments-chart').getContext('2d');
    charts.appointments = new Chart(ctxAppointments, {
        type: 'bar',
        data: monthlyAppointmentsData,
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    // Renderiza o Gráfico de Linhas (Novos Usuários)
    const ctxNewUsers = document.getElementById('new-users-chart').getContext('2d');
    charts.newUsers = new Chart(ctxNewUsers, {
        type: 'line',
        data: newUsersData,
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    // --- Próximos Agendamentos ---
    loadUpcomingAppointments();
}

async function loadUpcomingAppointments() {
    const main = document.getElementById('upcoming-appointments-card');
    if (!main) return;
    
    main.innerHTML = `<h2 class="text-xl font-semibold mb-3">Próximos Agendamentos</h2><div class="text-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-indigo-500 mx-auto"></div></div>`;

    try {
        // Busca 5 agendamentos futuros
        const apps = await supabaseClient
            .from('appointments')
            .select('scheduled_date, patient_id, psychologist_id, patient(full_name), psychologist(full_name)') // Junta as tabelas
            .order('scheduled_date', { ascending: true })
            .limit(5);

        if (apps.error) throw new Error(apps.error.message);

        // Formata a lista para exibição
        const list = apps.data.map(a => {
            // A notação `[0]` é necessária porque o join com array retorna um array
            const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
            const psy = Array.isArray(a.psychologist) ? a.psychologist[0] : a.psychologist;
            
            // Formatando a data
            const dateStr = a.scheduled_date ? new Date(a.scheduled_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

            return `<li class="p-3 border rounded-lg mb-2 bg-gray-50">
                        <div class="font-semibold text-sm">${patient?.full_name || 'Paciente Não Encontrado'}</div>
                        <div class="text-xs text-gray-600">${psy?.full_name || 'Psicólogo Não Encontrado'} — ${dateStr}</div>
                    </li>`;
        }).join('');

        main.innerHTML = `
            <h2 class="text-xl font-semibold mb-3">Próximos Agendamentos (${apps.data.length})</h2>
            <ul class="space-y-2">
                ${list || '<li class="text-gray-600 p-3 bg-gray-50 rounded-lg">Nenhum agendamento futuro encontrado.</li>'}
            </ul>
        `;
    } catch (e) {
        main.innerHTML = `
            <h2 class="text-xl font-semibold mb-3">Próximos Agendamentos</h2>
            <div class="p-6 bg-red-50 rounded-xl text-red-800 border border-red-400">
                Erro ao carregar agendamentos: ${e.message}
            </div>
        `;
    }
}


// --- Conteúdo da Aba Gestão de Usuários ---
function renderUsersContent() {
    return `
        <div class="card p-6">
            <h2 class="text-2xl font-semibold mb-4">Lista de Usuários</h2>
            <div id="users-list-container" class="space-y-3">
                <p class="text-center text-gray-500">Carregando usuários...</p>
            </div>
        </div>
    `;
}

async function loadUsersList() {
    const container = document.getElementById('users-list-container');
    if (!container) return;
    
    try {
        // Busca todos os usuários e ordena pelo nome
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw new Error(error.error.message);

        if (users.length === 0) {
            container.innerHTML = '<p class="text-gray-500">Nenhum usuário encontrado.</p>';
            return;
        }

        const listHtml = users.map(user => `
            <div class="p-4 bg-gray-50 rounded-lg shadow-sm border flex justify-between items-center">
                <div>
                    <p class="font-semibold">${user.full_name}</p>
                    <p class="text-sm text-gray-600">${user.email}</p>
                </div>
                <span class="text-xs font-bold px-3 py-1 rounded-full 
                    ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 
                      user.role === 'psychologist' ? 'bg-green-100 text-green-700' : 
                      'bg-blue-100 text-blue-700'}">
                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
            </div>
        `).join('');
        
        container.innerHTML = listHtml;

    } catch (e) {
        container.innerHTML = `<div class="p-4 bg-red-50 rounded-lg text-red-800 border border-red-400">Erro ao carregar lista de usuários: ${e.message}</div>`;
    }
}


// --- Conteúdo da Aba Novo Cadastro ---
function renderNewUserContent() {
    return `
        <div class="card w-full max-w-lg mx-auto p-8">
            <h2 class="text-2xl font-semibold mb-6 text-center">Cadastrar Novo Usuário</h2>
            <form id="new-user-form">
                <div class="form-group">
                    <label for="full_name" class="form-label">Nome Completo</label>
                    <input type="text" id="full_name" name="full_name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label for="email_new" class="form-label">Email</label>
                    <input type="email" id="email_new" name="email" class="form-input" placeholder="novo@usuario.com" required>
                </div>
                <div class="form-group">
                    <label for="password_new" class="form-label">Senha Inicial</label>
                    <input type="password" id="password_new" name="password" class="form-input" placeholder="Mínimo 6 caracteres" required>
                </div>
                <div class="form-group">
                    <label for="role" class="form-label">Papel (Role)</label>
                    <select id="role" name="role" class="form-input" required>
                        <option value="psychologist">Psicólogo</option>
                        <option value="admin">Admin</option>
                        <!-- Pacientes devem se cadastrar sozinhos -->
                    </select>
                </div>
                <button type="submit" class="btn-primary mt-4">Cadastrar Usuário</button>
                <p class="text-xs text-gray-500 mt-3 text-center">O usuário receberá um e-mail para confirmar a conta.</p>
            </form>
        </div>
    `;
}

function setupNewUserListeners() {
    const form = document.getElementById('new-user-form');
    if (form) {
        // O evento de submit chama a função de tratamento
        form.onsubmit = handleNewUserCreation;
    }
}


/* ------------------------
   Render principal
   ------------------------- */

// Função principal que decide e executa a renderização
function render() {
    const app = document.getElementById('app');
    if (!app) return console.error("#app não encontrado");
    
    if (currentPage === 'login') { 
        app.innerHTML = renderLogin(); 
        setupLoginListeners();
        return; 
    }
    
    if (currentPage === 'admin') { 
        app.innerHTML = renderAdminShell(); 
        setupAdminListeners(); // Configura os listeners do Shell antes de injetar o conteúdo
        renderAdminContent();  // Injeta o conteúdo específico da aba
        return; 
    }
    
    app.innerHTML = "<p>Página desconhecida</p>";
}
// EXPOR render para o escopo global (window)
window.render = render;
// EXPOR initApp para o escopo global (window)
window.initApp = initApp;
