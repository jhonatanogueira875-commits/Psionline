// app.js

document.addEventListener("DOMContentLoaded", async () => {
  console.log("✔ DOM Carregado e app.js inicializado");

  try {
    const user = await getUser();
    if (!user) {
      console.warn("Nenhum usuário logado.");
      return;
    }

    console.log("Usuário logado:", user);

    // Verifica se o usuário é admin
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      console.error("Acesso negado. Apenas administradores podem acessar este painel.");
      // Exibir mensagem na tela em vez de travar
      document.getElementById("alerta-permissao").textContent =
        "Acesso negado: apenas administradores podem acessar este painel.";
      return;
    }

    console.log("Acesso admin autorizado!");
    // Inicializa funções do painel aqui
    initDashboard();

  } catch (err) {
    console.error("Erro ao buscar função do usuário:", err);
    document.getElementById("alerta-permissao").textContent =
      "Erro ao verificar login/permissão. Confira o console.";
  }
});

// Função simulada para pegar usuário logado
async function getUser() {
  // Aqui você chama a Supabase ou seu backend
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Erro ao buscar usuário:", error);
    return null;
  }
  return data.user;
}

// Função para verificar role admin
async function checkAdminRole(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Erro ao buscar role do usuário:", error);
    return false;
  }

  console.log("Role do usuário:", data.role);
  return data.role === "admin";
}

// Inicialização do painel
function initDashboard() {
  console.log("Painel carregado com sucesso!");
  // Coloque aqui suas funções de dashboard
}
