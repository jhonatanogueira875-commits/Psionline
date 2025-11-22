function renderAdminShell() {
    return `
    <div class="min-h-screen flex bg-gray-100">

        <!-- SIDEBAR MODERNA -->
        <aside class="sidebar-glass w-64 p-6 fixed h-full shadow-xl fade-in">
            <h1 class="text-2xl font-extrabold text-purple-700 mb-8 tracking-tight">
                PSI<span class="text-gray-800">online</span>
            </h1>

            <nav class="space-y-2">

                <!-- DASHBOARD -->
                <button 
                    onclick="currentAdminTab='dashboard'; renderAdminContent();" 
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition
                    ${currentAdminTab==='dashboard' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-purple-100'}">
                    <span>📊</span> Dashboard
                </button>

                <!-- PERFIS -->
                <button 
                    onclick="currentAdminTab='profiles'; renderAdminContent();" 
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition
                    ${currentAdminTab==='profiles' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-purple-100'}">
                    <span>👤</span> Perfis
                </button>

                <!-- AGENDAMENTOS -->
                <button 
                    onclick="currentAdminTab='appointments'; renderAdminContent();" 
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition
                    ${currentAdminTab==='appointments' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-purple-100'}">
                    <span>📅</span> Agendamentos
                </button>

                <!-- FINANCEIRO -->
                <button 
                    onclick="currentAdminTab='finance'; renderAdminContent();" 
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition
                    ${currentAdminTab==='finance' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-purple-100'}">
                    <span>💰</span> Financeiro
                </button>

                <!-- CONFIGURAÇÕES -->
                <button 
                    onclick="currentAdminTab='settings'; renderAdminContent();" 
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition
                    ${currentAdminTab==='settings' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-purple-100'}">
                    <span>⚙️</span> Configurações
                </button>

            </nav>

            <!-- LOGOUT -->
            <div class="absolute bottom-6 left-6 right-6">
                <button onclick="handleLogout()" 
                    class="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold shadow-md transition">
                    <span>🚪</span> Sair
                </button>
            </div>
        </aside>

        <!-- MAIN CONTENT -->
        <main class="flex-1 ml-64 p-10 fade-in">
            <div id="admin-content"></div>
        </main>
    </div>
    `;
}
