/*
  app.js
  Lógica principal da aplicação: Inicialização Supabase, Gestão de Estado, Navegação e Renderização da UI.
  Este arquivo depende das funções globais expostas em auth.js e database.js.
*/

// ===========================================================
// 1. GESTÃO DE ESTADO GLOBAL
// ===========================================================

let currentUser = null; // Informações do usuário logado (auth)
let currentProfile = null; // Informações do perfil (tabela profiles/psychologists)
let currentPage = "login"; // Página atual
let currentAdminTab = "dashboard"; // Aba atual no painel de administração

// ===========================================================
// 2. LISTENERS DE AUTENTICAÇÃO (onAuthChangeCallback)
// ===========================================================

/**
 * Função de callback chamada quando o estado de autenticação muda.
 * @param {Object} event - O evento (p.ex., 'SIGNED_IN').
 * @param {Object} session - A sessão atual.
 */
async function onAuthChangeCallback(event, session) {
    console.log("Auth Event:", event);
    if (session) {
        currentUser = session.user;
        // Tenta carregar o profile
        try {
            const profile = await getProfile(currentUser.id); // Função de auth.js
            
            // Carrega dados específicos do psicólogo se a role for 'psychologist'
            if (profile?.role === 'psychologist') {
                const { data: psyData, error } = await supabaseClient
                    .from('psychologists')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .single();
                
                if (error && error.code !== 'PGRST116') { // PGRST116 = linha não encontrada
                    throw error;
                }
                profile.psychologist_data = psyData; // Adiciona os dados do psicólogo ao profile
            }


            currentProfile = profile;
            
            // Navegação baseada na role
            if (profile?.role === 'admin') {
                currentPage = "admin";
                currentAdminTab = "dashboard";
            } else if (profile?.role === 'psychologist') {
                // Psicólogo vai direto para a aba Perfil
                currentPage = "admin";
                currentAdminTab = "profile"; 
            } else {
                currentPage = "patient"; // Em desenvolvimento
            }

        } catch (e) {
            console.error("Erro ao carregar perfil:", e);
            currentPage = "error";
        }
    } else {
        currentUser = null;
        currentProfile = null;
        currentPage = "login";
    }
    render();
}

if (window.onAuthChange) {
    window.onAuthChange(onAuthChangeCallback); // Chama a função de listener do auth.js
} else {
    console.error("ERRO: window.onAuthChange não está disponível. Verifique o arquivo auth.js.");
}


// ===========================================================
// 3. FUNÇÕES DE RENDERIZAÇÃO DE PÁGINAS/TABS
// ===========================================================

/**
 * Renderiza a página de login/registro. (Mantido inalterado)
 */
function renderLogin() {
    return `
        <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
                <h1 class="text-3xl font-extrabold text-purple-700 mb-6 text-center">Clínica Psicologia</h1>
                <p id="auth-message" class="text-red-500 text-center mb-4"></p>
                
                <div id="login-form">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Entrar</h2>
                    <input type="email" id="login-email" placeholder="Email" class="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" required>
                    <input type="password" id="login-password" placeholder="Senha" class="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" required>
                    <button onclick="handleSignIn()" class="w-full p-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition duration-150">
                        Entrar
                    </button>
                    <p class="mt-4 text-center text-gray-600">
                        Não tem conta? <a href="#" onclick="showRegisterForm()" class="text-purple-600 hover:text-purple-800 font-semibold">Registre-se</a>
                    </p>
                </div>

                <div id="register-form" style="display:none;">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Novo Usuário</h2>
                    <input type="text" id="reg-name" placeholder="Nome Completo" class="w-full p-3 mb-4 border border-gray-300 rounded-lg" required>
                    <input type="email" id="reg-email" placeholder="Email" class="w-full p-3 mb-4 border border-gray-300 rounded-lg" required>
                    <input type="password" id="reg-password" placeholder="Senha (mín. 6 caracteres)" class="w-full p-3 mb-4 border border-gray-300 rounded-lg" required>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Eu sou:</label>
                        <select id="reg-role" class="w-full p-3 border border-gray-300 rounded-lg">
                            <option value="patient">Paciente</option>
                            <option value="psychologist">Psicólogo</option>
                        </select>
                    </div>

                    <div id="psychologist-fields" style="display:none;">
                        <input type="text" id="reg-license" placeholder="Nº de Licença (CRP)" class="w-full p-3 mb-4 border border-gray-300 rounded-lg">
                        <input type="number" id="reg-price" placeholder="Preço da Sessão (R$)" value="150" class="w-full p-3 mb-4 border border-gray-300 rounded-lg">
                    </div>

                    <button onclick="handleSignUp()" class="w-full p-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition duration-150">
                        Registrar
                    </button>
                    <p class="mt-4 text-center text-gray-600">
                        Já tem conta? <a href="#" onclick="showLoginForm()" class="text-purple-600 hover:text-purple-800 font-semibold">Entrar</a>
                    </p>
                </div>
            </div>
        </div>
        <script>
            document.getElementById('reg-role').addEventListener('change', (e) => {
                const fields = document.getElementById('psychologist-fields');
                fields.style.display = e.target.value === 'psychologist' ? 'block' : 'none';
            });
        </script>
    `;
}

/**
 * Renderiza o esqueleto (shell) do painel de administração.
 */
function renderAdminShell() {
    const isAdmin = currentProfile?.role === 'admin';
    const tabClass = (tab) => currentAdminTab === tab 
        ? 'bg-purple-700 text-white font-bold' 
        : 'text-purple-200 hover:bg-purple-600';
        
    return `
        <div class="min-h-screen bg-gray-50 flex">
            <!-- Sidebar/Navegação -->
            <div class="w-64 bg-purple-800 text-white flex flex-col p-4 shadow-xl">
                <div class="text-2xl font-extrabold mb-8 mt-4">Psicologia Admin</div>
                
                <!-- Nome e Função do Usuário -->
                <div class="mb-8 p-3 bg-purple-700 rounded-lg">
                    <p class="font-semibold">${currentProfile?.full_name || 'Usuário'}</p>
                    <p class="text-sm text-purple-300">${currentProfile?.role === 'admin' ? 'Administrador' : 'Psicólogo'}</p>
                </div>

                <!-- Tabs de Navegação -->
                <nav class="flex-1 space-y-2">
                    ${isAdmin ? `
                        <button onclick="switchAdminTab('dashboard')" class="w-full text-left p-3 rounded-lg transition duration-150 ${tabClass('dashboard')}">
                            Dashboard
                        </button>
                        <button onclick="switchAdminTab('psychologists')" class="w-full text-left p-3 rounded-lg transition duration-150 ${tabClass('psychologists')}">
                            Psicólogos
                        </button>
                        <button onclick="switchAdminTab('patients')" class="w-full text-left p-3 rounded-lg transition duration-150 ${tabClass('patients')}">
                            Pacientes
                        </button>
                        <button onclick="switchAdminTab('appointments')" class="w-full text-left p-3 rounded-lg transition duration-150 ${tabClass('appointments')}">
                            Consultas
                        </button>
                    ` : ''}
                    <button onclick="switchAdminTab('profile')" class="w-full text-left p-3 rounded-lg transition duration-150 ${tabClass('profile')}">
                        Meu Perfil
                    </button>
                </nav>

                <!-- Logout -->
                <button onclick="handleSignOut()" class="w-full p-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition duration-150 mt-auto">
                    Sair
                </button>
            </div>

            <!-- Conteúdo Principal -->
            <main class="flex-1 p-8 overflow-y-auto">
                <h1 class="text-3xl font-bold text-gray-800 mb-6 capitalize">${currentAdminTab === 'profile' ? 'Meu Perfil' : currentAdminTab}</h1>
                <div id="admin-content-area" class="bg-white p-6 rounded-xl shadow-lg">
                    <!-- Conteúdo dinâmico será carregado aqui -->
                    <div class="text-center p-10 text-gray-500">
                        <div class="animate-spin inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                        <p class="mt-4">Carregando dados...</p>
                    </div>
                </div>
            </main>
        </div>
    `;
}

/**
 * Renderiza o conteúdo da aba "Meu Perfil" (Psicólogo).
 */
function renderPsychologistProfileContent() {
    const isPsychologist = currentProfile?.role === 'psychologist';
    const psychologistData = currentProfile?.psychologist_data; 
    // Usa a URL do psicólogo se existir, senão usa o avatar_url do profiles, senão placeholder
    const avatarUrl = psychologistData?.avatar_url || currentProfile?.avatar_url || 'https://placehold.co/150x150/8b5cf6/ffffff?text=Sem+Foto';

    return `
        <div class="max-w-3xl mx-auto">
            <h2 class="text-2xl font-bold mb-6 text-purple-700">Detalhes do Perfil e Foto</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Seção de Dados do Perfil -->
                <div class="bg-gray-50 p-6 rounded-xl shadow-inner">
                    <h3 class="text-xl font-semibold mb-4 border-b pb-2 text-gray-700">Informações Básicas</h3>
                    <p class="mb-2"><span class="font-medium text-gray-600">Nome:</span> ${currentProfile?.full_name}</p>
                    <p class="mb-2"><span class="font-medium text-gray-600">Email:</span> ${currentUser?.email}</p>
                    <p class="mb-2 text-xs"><span class="font-medium text-gray-600">ID de Usuário:</span> ${currentUser?.id}</p>
                    ${isPsychologist && psychologistData ? `
                        <h3 class="text-xl font-semibold mt-6 mb-4 border-b pb-2 text-gray-700">Informações Profissionais</h3>
                        <p class="mb-2"><span class="font-medium text-gray-600">Status:</span> 
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${psychologistData?.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${psychologistData?.status || 'Pendente'}
                            </span>
                        </p>
                        <p class="mb-2"><span class="font-medium text-gray-600">Licença (CRP):</span> ${psychologistData?.license_number || 'N/A'}</p>
                        <p class="mb-2"><span class="font-medium text-gray-600">Preço da Sessão:</span> R$ ${psychologistData?.session_price?.toFixed(2) || '150.00'}</p>
                    ` : isPsychologist ? `
                        <p class="mt-4 text-orange-600 font-semibold">
                            Complete o processo de registro na tabela 'psychologists'.
                        </p>
                    ` : ''}
                </div>

                <!-- Seção de Foto de Perfil (Avatar) -->
                <div class="bg-white p-6 rounded-xl shadow-md">
                    <h3 class="text-xl font-semibold mb-4 text-purple-700">Foto de Perfil</h3>
                    <div class="flex flex-col items-center">
                        <!-- Imagem Atual -->
                        <img id="profile-avatar" src="${avatarUrl}" alt="Foto de Perfil" class="w-32 h-32 rounded-full object-cover border-4 border-purple-300 shadow-lg mb-4">
                        <p class="text-sm text-gray-500 mb-4">Máximo: 5MB (JPG, PNG)</p>

                        <!-- Formulário de Upload -->
                        <input type="file" id="photo-upload-input" accept="image/png, image/jpeg, image/jpg" class="hidden" onchange="previewImage(event)">
                        
                        <button onclick="document.getElementById('photo-upload-input').click()" class="bg-blue-500 text-white font-semibold py-2 px-4 rounded-full hover:bg-blue-600 transition duration-150 mb-4">
                            Escolher Foto
                        </button>
                        
                        <button id="upload-button" onclick="handlePhotoUpload()" 
                                class="w-full p-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition duration-150 disabled:opacity-50"
                                disabled>
                            Enviar e Salvar Foto
                        </button>

                        <p id="upload-message" class="mt-4 text-sm font-medium"></p>
                    </div>
                </div>
            </div>
        </div>
        <script>
            // Funções de suporte para o formulário de upload
            function previewImage(event) {
                const file = event.target.files[0];
                const avatar = document.getElementById('profile-avatar');
                const uploadButton = document.getElementById('upload-button');
                const message = document.getElementById('upload-message');

                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        avatar.src = e.target.result;
                        uploadButton.disabled = false;
                        message.textContent = 'Nova foto pronta para envio.';
                        message.className = 'mt-4 text-sm font-medium text-blue-600';
                    };
                    reader.readAsDataURL(file);
                } else {
                    uploadButton.disabled = true;
                    message.textContent = '';
                }
            }

            async function handlePhotoUpload() {
                const input = document.getElementById('photo-upload-input');
                const uploadButton = document.getElementById('upload-button');
                const message = document.getElementById('upload-message');
                const file = input.files[0];

                if (!file || !currentUser) {
                    message.textContent = 'Erro: Selecione uma foto e faça login novamente.';
                    message.className = 'mt-4 text-sm font-medium text-red-500';
                    return;
                }

                // Verifica se a função de upload está disponível (deve vir do database.js)
                if (typeof uploadPsychologistPhoto !== 'function') {
                    message.textContent = 'Erro: Função uploadPsychologistPhoto não carregada. Verifique database.js.';
                    message.className = 'mt-4 text-sm font-medium text-red-500';
                    return;
                }

                uploadButton.disabled = true;
                uploadButton.textContent = 'Enviando...';
                message.textContent = 'Iniciando upload...';
                message.className = 'mt-4 text-sm font-medium text-purple-600';

                try {
                    // Chama a função global do database.js
                    const newUrl = await uploadPsychologistPhoto(file, currentUser.id);
                    
                    message.textContent = 'Sucesso! Foto atualizada.';
                    message.className = 'mt-4 text-sm font-medium text-green-600';
                    
                    // Atualiza a URL do perfil localmente 
                    if (currentProfile && currentProfile.psychologist_data) {
                        currentProfile.psychologist_data.avatar_url = newUrl;
                    }
                    // Força a atualização da imagem do avatar com a nova URL pública
                    document.getElementById('profile-avatar').src = newUrl;

                } catch (error) {
                    console.error("Erro no upload:", error);
                    message.textContent = \`Erro: \${error.message || 'Falha desconhecida.'}\`;
                    message.className = 'mt-4 text-sm font-medium text-red-500';
                } finally {
                    uploadButton.textContent = 'Enviar e Salvar Foto';
                    input.value = ''; // Limpa o input file
                    // O botão só é reativado se houver um novo arquivo selecionado
                    uploadButton.disabled = true; 
                }
            }
        </script>
    `;
}

/**
 * Função assíncrona para carregar e renderizar o conteúdo da aba de Admin.
 */
async function renderAdminContent() {
    const contentArea = document.getElementById("admin-content-area");
    if (!contentArea) return;

    // Se for a aba de perfil, carrega e renderiza o conteúdo do psicólogo
    if (currentAdminTab === 'profile') {
        contentArea.innerHTML = renderPsychologistProfileContent();
        return;
    }

    // Carrega e renderiza o Dashboard (mantido como exemplo)
    if (currentAdminTab === 'dashboard') {
        try {
            const data = await loadDashboardData(); // Função de agregação do database.js
            // Simplesmente mostra a contagem (substituir por dashboard real)
            contentArea.innerHTML = `
                <h2 class="text-xl font-semibold mb-4 text-gray-700">Estatísticas Rápidas</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-blue-100 p-4 rounded-xl shadow-inner">
                        <p class="text-sm text-blue-700 font-medium">Psicólogos Registrados</p>
                        <p class="text-3xl font-bold text-blue-900">${data.psychologists.length}</p>
                    </div>
                    <div class="bg-green-100 p-4 rounded-xl shadow-inner">
                        <p class="text-sm text-green-700 font-medium">Consultas Totais</p>
                        <p class="text-3xl font-bold text-green-900">${data.appointments.length}</p>
                    </div>
                    <div class="bg-purple-100 p-4 rounded-xl shadow-inner">
                        <p class="text-sm text-purple-700 font-medium">Receita Total</p>
                        <p class="text-3xl font-bold text-purple-900">R$ ${data.totalRevenue}</p>
                    </div>
                </div>
                <h2 class="text-xl font-semibold mt-8 mb-4 text-gray-700">Visão Geral de Dados</h2>
                <!-- Conteúdo das outras abas (Psicólogos, Pacientes, Consultas) seria listado aqui -->
            `;
        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
            contentArea.innerHTML = `
                <div class="text-center p-10 bg-red-50 rounded-lg">
                    <p class="text-red-700 font-semibold mb-4">
                        ⚠️ Erro ao carregar dados.
                    </p>
                    <p class="text-sm text-red-600 mb-6">
                        <strong>Motivo:</strong> Verifique se todas as tabelas e o RLS permitem a leitura (select).
                    </p>
                    <button onclick="renderAdminContent()" class="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition duration-150">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}


// ===========================================================
// 4. FUNÇÕES DE SUPORTE E NAVEGAÇÃO
// ===========================================================

/**
 * Alterna entre as abas do painel de administração e força a renderização do conteúdo.
 */
function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    document.getElementById("app").innerHTML = renderAdminShell();
    renderAdminContent();
}

/**
 * Alterna para o formulário de registro.
 */
function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('auth-message').textContent = '';
}

/**
 * Alterna para o formulário de login.
 */
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-message').textContent = '';
}

/**
 * Lida com o processo de login.
 */
async function handleSignIn() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const message = document.getElementById('auth-message');
    message.textContent = '';
    
    try {
        await signIn(email, password); // Função de auth.js
        // O onAuthChangeCallback cuidará da navegação
    } catch (error) {
        message.textContent = `Erro ao entrar: ${error.message}`;
        console.error("Erro no Login:", error);
    }
}

/**
 * Lida com o processo de registro.
 */
async function handleSignUp() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const license = document.getElementById('reg-license').value;
    const price = document.getElementById('reg-price').value;
    const message = document.getElementById('auth-message');
    message.textContent = '';

    if (role === 'psychologist' && (!license || !price)) {
        message.textContent = 'Psicólogos devem fornecer o número de licença e o preço da sessão.';
        return;
    }

    try {
        // 1. Cria o usuário e o perfil básico
        const { user } = await signUp(email, password, name, role); // Função de auth.js

        // 2. Se for psicólogo, cria o registro na tabela 'psychologists'
        if (role === 'psychologist' && user) {
            await createPsychologistProfile(user.id, parseFloat(price), license); // Função de database.js
        }

        message.textContent = 'Registro bem-sucedido! Você será redirecionado em breve.';
        message.className = 'text-green-600 font-semibold text-center mb-4';
        // A navegação real é feita pelo onAuthChangeCallback

    } catch (error) {
        message.textContent = `Erro no registro: ${error.message}`;
        message.className = 'text-red-500 font-semibold text-center mb-4';
        console.error("Erro no Registro:", error);
    }
}

/**
 * Lida com o processo de logout.
 */
async function handleSignOut() {
    try {
        await signOut(); // Função de auth.js
        // O onAuthChangeCallback cuidará da navegação
    } catch (error) {
        console.error("Erro no Logout:", error);
        // Continua a renderização para a página de login
        onAuthChangeCallback('SIGNED_OUT', null);
    }
}


// ===========================================================
// 5. FUNÇÃO MESTRE DE RENDERIZAÇÃO
// ===========================================================

/**
 * Função principal que decide qual página renderizar.
 */
function render() {
    const app = document.getElementById("app");
    
    if (currentPage === "login") {
        app.innerHTML = renderLogin();
        return;
    }

    if (currentPage === "admin") {
        // 1. Renderiza o esqueleto (shell) da página Admin
        app.innerHTML = renderAdminShell();
        
        // 2. Chama a função assíncrona para carregar o conteúdo da aba
        renderAdminContent();
        return;
    }

    if (currentPage === "patient") {
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-blue-100 p-4">
                <div class="text-center p-10 bg-white rounded-xl shadow-lg">
                    <h1 class="text-3xl font-bold text-blue-700 mb-4">Painel do Paciente em Desenvolvimento</h1>
                    <p class="text-gray-600 mb-6">Em breve, o paciente poderá buscar e agendar consultas.</p>
                    <button onclick="handleSignOut()" class="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition duration-150">
                        Sair
                    </button>
                </div>
            </div>
        `;
        return;
    }


    if (currentPage === "error") {
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-red-100 p-4">
                <div class="text-center p-10 bg-white rounded-xl shadow-lg">
                    <h1 class="text-3xl font-bold text-red-700 mb-4">Erro Crítico</h1>
                    <p class="text-gray-600 mb-6">Ocorreu um erro ao carregar seus dados de perfil. Por favor, tente sair e entrar novamente.</p>
                    <button onclick="handleSignOut()" class="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition duration-150">
                        Sair
                    </button>
                </div>
            </div>
        `;
        return;
    }

    app.innerHTML = "<p class='p-10 text-center'>Página desconhecida.</p>";
}

// ===========================================================
// 6. INICIALIZAÇÃO
// ===========================================================
// A função de inicialização é o onAuthStateChangeCallback, que é chamada
// automaticamente pelo listener do Supabase após o carregamento da página (via auth.js).


