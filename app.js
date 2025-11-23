async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginMessage = document.getElementById("loginMessage");

  try {
    // Tentar logar no Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("Erro de login/permissão:", authError);
      loginMessage.innerText = "⚠️ Credenciais inválidas.";
      return;
    }

    const userId = authData.user.id;

    // Buscar função do usuário de forma segura
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle(); // retorna null se não achar

    if (userError) {
      console.error("Erro ao buscar função do usuário:", userError);
      loginMessage.innerText = "⚠️ Erro ao verificar função do usuário.";
      return;
    }

    // Verificar se o usuário existe e é admin
    if (!userData) {
      loginMessage.innerText = "⚠️ Usuário não encontrado.";
      return;
    }

    if (userData.role !== "admin") {
      loginMessage.innerText = "⚠️ Acesso negado. Apenas administradores podem acessar este painel.";
      return;
    }

    // Login e permissão OK
    console.log("✔ Usuário admin logado com sucesso!");
    loginMessage.innerText = "✔ Login bem-sucedido!";
    // redirecionar ou inicializar painel...
    
  } catch (error) {
    console.error("Erro inesperado no login:", error);
    loginMessage.innerText = "⚠️ Ocorreu um erro inesperado. Tente novamente.";
  }
}
