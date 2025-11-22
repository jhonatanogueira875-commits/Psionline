/*
  app.js
  Lógica unificada para inicialização do Supabase, navegação e gestão de dados.
  Inclui a tela de Login/Cadastro de Paciente e a tela de Cadastro de Psicólogo.
*/

// ============================================================
// 1. CONFIGURAÇÃO SUPABASE E VARIÁVEIS GLOBAIS
// ============================================================

// **IMPORTANTE**: Chaves Supabase do seu projeto
const SUPABASE_URL = 'https://jhcylgeukoiomydgppxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A';

// inicializa o cliente
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!supabaseClient) {
    console.error("ERRO: O cliente Supabase não pôde ser inicializado. Verifique a chave ou o link CDN no index.html.");
} else {
    console.log("Supabase inicializado com sucesso.");
}

// Estado global da aplicação
let currentUser = null; // Objeto de usuário Supabase (inclui ID)
let userProfile = null; // Objeto de perfil do banco de dados (inclui role)
let currentPage = "login"; // Controla qual tela renderizar (login, admin, patient, psychologist_signup)
let currentAdminTab = "psychologists"; // Controla qual aba está ativa no painel do Admin

// ============================================================
// 2. LÓGICA SUPABASE (Adaptação/Inclusão de Métodos)
// ============================================================

/**
 * Função utilitária para pegar o perfil.
 * @param {string} uid ID do usuário.
 * @returns {Promise<object|null>} Perfil do usuário.
 */
async function getProfile(uid) {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", uid).single();
    if (error) {
        console.warn("Nenhum perfil encontrado para o usuário:", uid);
        return null;
    }
    return data;
}

/**
 * Registra um novo usuário E cria um perfil de paciente.
 * @param {string} email
 * @param {string} password
 * @param {string} full_name
 */
async function signUpPatient(email, password, full_name) {
    if (!supabaseClient) throw new Error("Supabase não inicializado");
    // 1. Cria o usuário Supabase
    const { data: userResponse, error: authError } = await supabaseClient.auth.signUp({ email, password });
    if (authError) throw authError;

    const user = userResponse.user;
    if (!user) return userResponse;

    // 2. Cria o registro de perfil na tabela 'profiles' (role: 'patient')
    const { error: profileError } = await supabaseClient
        .from("profiles")
        .insert([{ id: user.id, full_name, role: "patient" }]);
    if (profileError) {
        console.error("Erro ao criar perfil de paciente:", profileError);
        throw profileError;
    }

    return userResponse;
}

/**
 * Registra um novo usuário E cria um perfil de psicólogo, incluindo foto e preço da sessão.
 * @param {string} email
 * @param {string} password
 * @param {string} full_name
 * @param {File} photoFile
 * @param {number} session_price
 */
async function signUpPsychologist(email, password, full_name, photoFile, session_price) {
    if (!supabaseClient) throw new Error("Supabase não inicializado");

    // 1. Cria o usuário Supabase
    const { data: userResponse, error: authError } = await supabaseClient.auth.signUp({ email, password });
    if (authError) throw authError;

    const user = userResponse.user;
    if (!user) return userResponse;

    // 2. Faz o upload da foto para o storage
    let photo_url = null;
    if (photoFile) {
        const filePath = `${user.id}/${photoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('psychologist_photos') // Certifique-se de que este bucket existe!
            .upload(filePath, photoFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.warn("Erro no upload da foto. O perfil será criado sem foto.", uploadError);
            // Continua, mas sem a foto
        } else {
            // Obtém a URL pública da foto
            const { data: publicUrlData } = supabaseClient.storage
                .from('psychologist_photos')
                .getPublicUrl(filePath);

            photo_url = publicUrlData.publicUrl;
        }
    }


    // 3. Cria o registro de perfil na tabela 'profiles' (role: 'psychologist')
    const { error: profileError } = await supabaseClient
        .from("profiles")
        .insert([{ id: user.id, full_name, role: "psychologist" }]);
    if (profileError) {
        console.error("Erro ao criar perfil de psicólogo (profiles):", profileError);
        // Tenta reverter a criação do usuário (opcional, mas bom)
        // Note: Reverter a criação do usuário requer o service_role key, o que não fazemos aqui.
        // Iremos apenas lançar o erro.
        throw profileError;
    }

    // 4. Cria o registro na tabela 'psychologists'
    const { error: psyError } = await supabaseClient
        .from("psychologists")
        .insert([{
            user_id: user.id,
            session_price: session_price,
            photo_url: photo_url,
            status: "pending" // Começa como pendente para aprovação do Admin
        }]);

    if (psyError) {
        console.error("Erro ao criar registro na tabela psychologists:", psyError);
        throw psyError;
    }

    return userResponse;
}

/**
 * Faz login do usuário.
 * @param {string} email
 * @param {string} password
 */
async function signIn(email, password) {
    if (!supabaseClient) throw new Error("Supabase não inicializado");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

/**
 * Faz logout do usuário.
 */
async function signOut() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    currentUser = null;
    userProfile = null;
    currentPage = "login";
    render();
}

// -------------------
// Funções de Busca (Database) - Adaptadas
// -------------------

async function fetchPsychologists() {
    if (!supabaseClient) return [];
    // 1. Pega os dados da tabela psychologists
    const { data: psychologistsData, error: psyError } = await supabaseClient
        .from("psychologists")
        .select("*")
        .order("created_at", { ascending: false });

    if (psyError) {
        console.error("fetchPsychologists error:", psyError);
        return [];
    }

    // 2. Para cada psicólogo, pega o perfil (nome, etc.)
    const result = await Promise.all(psychologistsData.map(async (p) => {
        let profile = null;
        if (p.user_id) {
            profile = await getProfile(p.user_id);
        }
        return { ...p, profile };
    }));
    return result;
}

async function fetchPatients() {
    if (!supabaseClient) return [];
    // 1. Pega os dados da tabela profiles onde role é 'patient'
    const { data: patientProfiles, error: profileError } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("role", "patient")
        .order("created_at", { ascending: false });

    if (profileError) {
        console.error("fetchPatients error:", profileError);
        return [];
    }

    // Para esta versão, usaremos apenas os dados do perfil, mas num app real,
    // buscaríamos dados adicionais de uma tabela 'patients' se ela existisse.
    return patientProfiles;
}

async function fetchAppointments() {
    if (!supabaseClient) return [];
    const { data, error } = await supabaseClient
        .from("appointments")
        .select("*, patient_profile:patient_id(full_name), psychologist_profile:psychologist_id(full_name)")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("fetchAppointments error:", error);
        return [];
    }
    return data;
}

async function approvePsychologist(id) {
    if (!supabaseClient) throw new Error("Supabase não inicializado");
    const { error } = await supabaseClient.from("psychologists").update({ status: "approved" }).eq("user_id", id);
    if (error) throw error;
    return true;
}

async function loadDashboardData() {
    const psychologists = await fetchPsychologists();
    const patients = await fetchPatients();
    const appointments = await fetchAppointments();

    const totalRev = (appointments || []).reduce((sum, a) => sum + parseFloat(a.value || 0), 0);
    return {
        psychologists,
        patients,
        appointments,
        totalRevenue: totalRev.toFixed(2)
    };
}


// ============================================================
// 3. HANDLERS DE EVENTOS (Submissão de Formulários)
// ============================================================

/**
 * Lida com o login ou cadastro de paciente.
 * @param {'login' | 'signup'} type
 */
async function handleAuth(type) {
    const form = document.getElementById('auth-form');
    const email = form.email.value;
    const password = form.password.value;
    const full_name = form.full_name ? form.full_name.value : null;
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = "Processando...";
    messageEl.className = 'text-center text-sm p-2 text-purple-600';

    try {
        if (type === 'signup') {
            if (!full_name) throw new Error("Nome Completo é obrigatório para cadastro.");
            await signUpPatient(email, password, full_name);
            messageEl.textContent = "Cadastro de paciente efetuado com sucesso! Fazendo login...";
        } else {
            await signIn(email, password);
            messageEl.textContent = "Login efetuado com sucesso! Redirecionando...";
        }

        // A mudança de estado de autenticação será detectada pelo listener 'onAuthStateChange'
        // que chamará render().

    } catch (error) {
        console.error("Erro de autenticação:", error);
        messageEl.textContent = `Erro: ${error.message || error.toString()}`;
        messageEl.className = 'text-center text-sm p-2 text-red-500 font-semibold';
    }
}

/**
 * Lida com o cadastro de um novo psicólogo.
 */
async function handlePsychologistSignUp() {
    const form = document.getElementById('psy-signup-form');
    const email = form.email.value;
    const password = form.password.value;
    const full_name = form.full_name.value;
    const session_price = parseFloat(form.session_price.value);
    const photoFile = form.photo.files[0];
    const messageEl = document.getElementById('psy-message');
    
    messageEl.textContent = "Processando cadastro...";
    messageEl.className = 'text-center text-sm p-2 text-purple-600';

    try {
        if (!full_name || !email || !password || isNaN(session_price)) {
            throw new Error("Preencha todos os campos obrigatórios.");
        }
        
        await signUpPsychologist(email, password, full_name, photoFile, session_price);
        messageEl.textContent = "Cadastro de psicólogo efetuado com sucesso! Aguardando aprovação do Admin.";
        messageEl.className = 'text-center text-sm p-2 text-green-600 font-semibold';
        // Após o cadastro, retorna para a tela de login
        setTimeout(() => {
            currentPage = 'login';
            render();
        }, 3000);

    } catch (error) {
        console.error("Erro no cadastro de psicólogo:", error);
        messageEl.textContent = `Erro: ${error.message || error.toString()}`;
        messageEl.className = 'text-center text-sm p-2 text-red-500 font-semibold';
    }
}


/**
 * Lida com a aprovação de um psicólogo pelo Admin.
 * @param {string} userId
 */
async function handleApprovePsychologist(userId) {
    const button = document.querySelector(`#approve-btn-${userId}`);
    if (!button) return;

    button.textContent = 'Aprovando...';
    button.disabled = true;

    try {
        await approvePsychologist(userId);
        // Recarrega os dados do dashboard para atualizar a lista
        await renderAdminContent();
    } catch (error) {
        console.error("Erro ao aprovar psicólogo:", error);
        alert("Erro ao aprovar psicólogo. Verifique as regras de RLS.");
        button.textContent = 'Aprovar';
        button.disabled = false;
    }
}


// ============================================================
// 4. TEMPLATES DE RENDERIZAÇÃO
// ============================================================

/**
 * Renderiza a interface de login/cadastro de paciente.
 * @returns {string} HTML
 */
function renderLogin() {
    const isLogin = currentPage === 'login';

    const loginToggle = (
        `<div class="flex justify-center mb-6">
            <button onclick="currentPage='login'; render();" class="px-4 py-2 rounded-l-lg ${isLogin ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'} font-semibold transition duration-150">
                Login
            </button>
            <button onclick="currentPage='signup'; render();" class="px-4 py-2 rounded-r-lg ${!isLogin ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'} font-semibold transition duration-150">
                Cadastrar Paciente
            </button>
        </div>`
    );

    const full_name_input = !isLogin ? `
        <input type="text" id="full_name" name="full_name" placeholder="Nome Completo" required
            class="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
    ` : '';

    return `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
                <h1 class="text-3xl font-extrabold text-center text-purple-700 mb-6">PSI Online</h1>
                
                ${loginToggle}

                <form id="auth-form" onsubmit="event.preventDefault(); handleAuth('${isLogin ? 'login' : 'signup'}()')">
                    ${full_name_input}
                    <input type="email" id="email" name="email" placeholder="Email" required
                        class="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <input type="password" id="password" name="password" placeholder="Senha" required
                        class="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    
                    <button type="submit" class="w-full p-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition duration-150 shadow-md">
                        ${isLogin ? 'Entrar' : 'Cadastrar'}
                    </button>
                </form>

                <p id="auth-message" class="mt-4"></p>
                
                <div class="mt-6 text-center text-sm">
                    <a href="#" onclick="currentPage='psychologist_signup'; render();" class="text-purple-600 hover:text-purple-800 font-semibold transition duration-150">
                        Sou Psicólogo(a). Cadastrar-me agora.
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza a interface de cadastro de psicólogo.
 * @returns {string} HTML
 */
function renderPsychologistSignUp() {
    return `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div class="w-full max-w-lg bg-white p-8 rounded-xl shadow-2xl">
                <h1 class="text-3xl font-extrabold text-center text-purple-700 mb-4">Cadastro de Psicólogo(a)</h1>
                <p class="text-center text-gray-600 mb-6">Sua conta será criada e estará sujeita à aprovação do administrador.</p>

                <form id="psy-signup-form" onsubmit="event.preventDefault(); handlePsychologistSignUp()">
                    <input type="text" id="full_name" name="full_name" placeholder="Nome Completo (Conforme CRP)" required
                        class="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">

                    <input type="email" id="email" name="email" placeholder="Email (Será seu login)" required
                        class="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">

                    <input type="password" id="password" name="password" placeholder="Senha" required
                        class="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    
                    <label class="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil (Opcional, mas Recomendada)</label>
                    <input type="file" id="photo" name="photo" accept="image/*"
                        class="w-full p-3 mb-4 text-gray-700 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition duration-150">

                    <label class="block text-sm font-medium text-gray-700 mb-1">Valor da Sessão (R$)</label>
                    <input type="number" step="0.01" id="session_price" name="session_price" placeholder="Ex: 150.00" required
                        class="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    
                    <button type="submit" class="w-full p-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition duration-150 shadow-md">
                        Cadastrar Psicólogo(a)
                    </button>
                </form>

                <p id="psy-message" class="mt-4"></p>
                
                <div class="mt-6 text-center text-sm">
                    <a href="#" onclick="currentPage='login'; render();" class="text-purple-600 hover:text-purple-800 font-semibold transition duration-150">
                        Voltar para Login / Paciente
                    </a>
                </div>
            </div>
        </div>
    `;
}


// --- Funções de Renderização do Admin (Mantidas) ---

/**
 * Renderiza o shell do Admin com navegação e logout.
 * @returns {string} HTML
 */
function renderAdminShell() {
    // Código HTML do shell do Admin (Topo e abas de navegação)
    return `
        <div class="min-h-screen bg-gray-100">
            <header class="bg-purple-700 text-white p-4 shadow-md flex justify-between items-center">
                <h1 class="text-2xl font-bold">PSI Online - Admin (${userProfile?.full_name || 'Admin'})</h1>
                <button onclick="signOut()" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-lg transition duration-150">
                    Sair
                </button>
            </header>

            <div class="p-6">
                <div class="flex border-b border-gray-300 mb-6">
                    ${['psychologists', 'patients', 'appointments', 'overview'].map(tab => `
                        <button onclick="currentAdminTab='${tab}'; renderAdminContent();"
                            class="py-2 px-4 font-semibold transition duration-150
                            ${currentAdminTab === tab
                                ? 'border-b-4 border-purple-600 text-purple-700 bg-white'
                                : 'text-gray-500 hover:text-purple-600'
                            }">
                            ${tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    `).join('')}
                </div>

                <div id="admin-content" class="bg-white p-6 rounded-xl shadow-lg">
                    <p class="text-center text-gray-500">Carregando dados...</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza o conteúdo da aba "Psychologists".
 * @param {Array<object>} psychologists
 * @returns {string} HTML
 */
function renderPsychologistsTab(psychologists) {
    const pendingPsychologists = psychologists.filter(p => p.status !== 'approved');
    const approvedPsychologists = psychologists.filter(p => p.status === 'approved');

    const renderList = (title, list, showActions) => `
        <h3 class="text-xl font-bold text-purple-700 mb-3">${title} (${list.length})</h3>
        ${list.length === 0 
            ? `<p class="text-gray-500 mb-6">Nenhum ${title.toLowerCase()} encontrado.</p>`
            : `<div class="space-y-4 mb-8">
                ${list.map(p => `
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div class="flex items-center">
                            <img src="${p.photo_url || 'https://placehold.co/50x50/B5B5C3/white?text=PSI'}" 
                                 onerror="this.onerror=null; this.src='https://placehold.co/50x50/B5B5C3/white?text=PSI';"
                                 class="w-12 h-12 rounded-full object-cover mr-4 shadow">
                            <div>
                                <p class="font-semibold text-gray-800">${p.profile?.full_name || 'Nome Desconhecido'}</p>
                                <p class="text-sm text-gray-500">${p.profile?.email || 'Email Desconhecido'}</p>
                                <p class="text-xs text-purple-500">R$ ${p.session_price || 'N/A'}</p>
                            </div>
                        </div>
                        
                        ${showActions ? `
                            <button id="approve-btn-${p.user_id}" 
                                onclick="handleApprovePsychologist('${p.user_id}')"
                                class="mt-2 sm:mt-0 px-4 py-1 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition duration-150">
                                Aprovar
                            </button>` 
                            : `<span class="mt-2 sm:mt-0 text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">Aprovado</span>`
                        }
                    </div>
                `).join('')}
            </div>`
        }
    `;

    return `
        <h2 class="text-2xl font-extrabold text-purple-800 mb-6">Gestão de Psicólogos</h2>
        ${renderList("Novos Cadastros Pendentes", pendingPsychologists, true)}
        <hr class="my-6 border-gray-300">
        ${renderList("Psicólogos Aprovados", approvedPsychologists, false)}
    `;
}

/**
 * Renderiza o conteúdo da aba "Patients".
 * @param {Array<object>} patients
 * @returns {string} HTML
 */
function renderPatientsTab(patients) {
    // Função simples para mostrar a lista de pacientes (profiles com role 'patient')
    return `
        <h2 class="text-2xl font-extrabold text-purple-800 mb-6">Lista de Pacientes Cadastrados</h2>
        <p class="text-gray-600 mb-4">Total de Pacientes: ${patients.length}</p>
        
        ${patients.length === 0 
            ? `<p class="text-gray-500">Nenhum paciente cadastrado.</p>`
            : `<div class="space-y-3">
                ${patients.map(p => `
                    <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p class="font-semibold text-gray-800">${p.full_name}</p>
                        <p class="text-sm text-gray-500">ID: ${p.id}</p>
                        <p class="text-xs text-purple-500">${new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                `).join('')}
            </div>`
        }
    `;
}

/**
 * Renderiza o conteúdo da aba "Appointments".
 * @param {Array<object>} appointments
 * @returns {string} HTML
 */
function renderAppointmentsTab(appointments) {
    const statusColor = (status) => {
        if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
        if (status === 'confirmed') return 'bg-green-100 text-green-800';
        if (status === 'completed') return 'bg-blue-100 text-blue-800';
        return 'bg-gray-100 text-gray-800';
    };

    return `
        <h2 class="text-2xl font-extrabold text-purple-800 mb-6">Consultas Agendadas</h2>
        <p class="text-gray-600 mb-4">Total de Consultas: ${appointments.length}</p>

        ${appointments.length === 0
            ? `<p class="text-gray-500">Nenhuma consulta agendada.</p>`
            : `<div class="space-y-4">
                ${appointments.map(a => `
                    <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-800">
                                ${a.patient_profile?.full_name || 'Paciente Desconhecido'} 
                                <span class="text-sm font-normal text-gray-500">agendou com</span>
                                ${a.psychologist_profile?.full_name || 'Psicólogo Desconhecido'}
                            </p>
                            <p class="text-sm text-purple-600">
                                Data: ${a.scheduled_date} às ${a.scheduled_time} | R$ ${a.value ? parseFloat(a.value).toFixed(2) : '0.00'}
                            </p>
                        </div>
                        <span class="text-xs font-medium px-3 py-1 rounded-full ${statusColor(a.status)} capitalize">
                            ${a.status}
                        </span>
                    </div>
                `).join('')}
            </div>`
        }
    `;
}

/**
 * Renderiza o conteúdo da aba "Overview".
 * @param {object} data
 * @returns {string} HTML
 */
function renderOverviewTab(data) {
    const statCard = (title, value, color) => `
        <div class="bg-white p-6 rounded-xl shadow-lg border-b-4 ${color}">
            <p class="text-sm font-medium text-gray-500">${title}</p>
            <p class="text-3xl font-extrabold text-gray-900 mt-1">${value}</p>
        </div>
    `;

    return `
        <h2 class="text-2xl font-extrabold text-purple-800 mb-6">Visão Geral do Sistema</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${statCard("Psicólogos (Aprovados)", data.psychologists.filter(p => p.status === 'approved').length, 'border-purple-500')}
            ${statCard("Pacientes Registrados", data.patients.length, 'border-blue-500')}
            ${statCard("Total de Consultas", data.appointments.length, 'border-yellow-500')}
            ${statCard("Receita Total (Agendada)", `R$ ${data.totalRevenue}`, 'border-green-500')}
        </div>
        <div class="mt-8">
            <h3 class="text-xl font-bold text-gray-700 mb-3">Últimos Cadastros</h3>
            ${data.patients.slice(0, 5).map(p => `
                <p class="text-sm text-gray-600">${p.full_name} - Paciente</p>
            `).join('')}
            ${data.psychologists.slice(0, 5).map(p => `
                <p class="text-sm text-gray-600">${p.profile?.full_name || 'Psicólogo Desconhecido'} - Psicólogo (${p.status})</p>
            `).join('')}
        </div>
    `;
}

/**
 * Função assíncrona para carregar e renderizar o conteúdo da aba Admin.
 */
async function renderAdminContent() {
    const contentEl = document.getElementById("admin-content");
    if (!contentEl) return;
    
    // Mostra um estado de carregamento
    contentEl.innerHTML = `<p class="text-center text-purple-600 p-8"><i class="fas fa-spinner fa-spin mr-2"></i> Carregando dados do Dashboard...</p>`;
    
    try {
        const data = await loadDashboardData();
        
        let contentHtml = '';
        switch (currentAdminTab) {
            case 'psychologists':
                contentHtml = renderPsychologistsTab(data.psychologists);
                break;
            case 'patients':
                contentHtml = renderPatientsTab(data.patients);
                break;
            case 'appointments':
                contentHtml = renderAppointmentsTab(data.appointments);
                break;
            case 'overview':
                contentHtml = renderOverviewTab(data);
                break;
            default:
                contentHtml = `<p class="text-center text-gray-500 p-8">Selecione uma aba.</p>`;
        }

        contentEl.innerHTML = contentHtml;

    } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        contentEl.innerHTML = `
            <div class="text-center p-10 bg-red-50 rounded-lg">
                <p class="text-red-700 font-bold mb-3">ERRO ao Carregar Dados do Banco de Dados</p>
                <p class="text-sm text-red-600 mb-4">
                    <strong>Detalhe:</strong> ${error.message || 'Erro desconhecido.'}
                </p>
                <p class="text-sm text-red-600 mb-4">
                    <strong>Sugestão:</strong> Verifique se as tabelas <code>profiles</code> e <code>appointments</code> existem e se o RLS
                    permite a leitura (select) para a role <code>anon</code>.
                </p>
                <button onclick="renderAdminContent()" class="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition duration-150">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}


// ============================================================
// 5. FUNÇÃO MESTRE DE RENDERIZAÇÃO
// ============================================================

/**
 * Função principal que decide qual página renderizar.
 */
function render() {
    const app = document.getElementById("app");
    
    if (currentPage === "login" || currentPage === "signup") {
        app.innerHTML = renderLogin();
        return;
    }

    if (currentPage === "psychologist_signup") {
        app.innerHTML = renderPsychologistSignUp();
        return;
    }

    // A partir daqui, as páginas requerem um usuário logado
    if (!currentUser || !userProfile) {
        // Redireciona para o login se o usuário não estiver logado
        currentPage = "login";
        app.innerHTML = renderLogin();
        return;
    }

    if (userProfile.role === "admin") {
        // 1. Renderiza o esqueleto (shell) da página Admin
        app.innerHTML = renderAdminShell();
        
        // 2. Chama a função assíncrona para carregar o conteúdo da aba
        renderAdminContent();
        return;
    }

    if (userProfile.role === "patient") {
        app.innerHTML = `<div class="p-10 text-center bg-green-50 min-h-screen">
                            <h1 class="text-2xl font-bold text-green-700">Bem-vindo(a), Paciente ${userProfile.full_name}!</h1>
                            <p class="text-gray-600 mt-2">Sua role é: ${userProfile.role}</p>
                            <p class="text-gray-500 mt-4">Em breve, a tela de agendamento de consultas.</p>
                            <button onclick="signOut()" class="mt-6 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150">
                                Sair
                            </button>
                         </div>`;
        return;
    }

    if (userProfile.role === "psychologist") {
        app.innerHTML = `<div class="p-10 text-center bg-blue-50 min-h-screen">
                            <h1 class="text-2xl font-bold text-blue-700">Bem-vindo(a), Psicólogo(a) ${userProfile.full_name}!</h1>
                            <p class="text-gray-600 mt-2">Sua role é: ${userProfile.role}</p>
                            <p class="text-gray-500 mt-4">Em breve, o painel de consultas e perfil.</p>
                            <button onclick="signOut()" class="mt-6 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150">
                                Sair
                            </button>
                         </div>`;
        return;
    }


    app.innerHTML = `<p class='p-10 text-center'>Página desconhecida ou role não suportada (${userProfile.role}).</p>`;
}

// ============================================================
// 6. INICIALIZAÇÃO E LISTENER DE AUTENTICAÇÃO
// ============================================================

// A função de listener de autenticação é o coração da navegação.
// Ela verifica se o usuário está logado e carrega o perfil (role) para decidir qual tela renderizar.
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Evento de Autenticação:", event);

    // 1. Atualiza o estado global de autenticação
    currentUser = session?.user || null;

    if (currentUser) {
        // 2. Carrega o perfil do usuário (para obter a role)
        userProfile = await getProfile(currentUser.id);
        
        if (userProfile && userProfile.role === 'admin') {
            currentPage = 'admin';
        } else if (userProfile && userProfile.role === 'patient') {
            currentPage = 'patient';
        } else if (userProfile && userProfile.role === 'psychologist') {
            currentPage = 'psychologist';
        } else {
            // Se não tem perfil ou a role é desconhecida, faz logout e volta ao login
            console.error("Perfil ou Role desconhecida. Redirecionando para login.");
            await supabaseClient.auth.signOut();
            currentPage = 'login';
        }
    } else {
        // 3. Se não houver usuário logado, vai para a tela de login
        currentPage = 'login';
    }

    // 4. Renderiza a aplicação com base no novo estado
    render();
});

// Inicializa a renderização na primeira carga (o listener de auth fará a renderização final)
render();

// Inicia a aplicação após o carregamento do script
init();

