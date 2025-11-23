// app.js

document.addEventListener('DOMContentLoaded', () => {
  console.log("✔ DOM Carregado e app.js inicializado");

  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage'); // div para mensagens de erro

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleLogin();
    });
  }
});

// Função de login
async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Limpa mensagens anteriores
  const loginMessage = document.getElementById('loginMessage');
  loginMessage.innerText = '';

  try {
    // Tenta logar no Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Erro de login/permissão:", error);
      loginMessage.innerText = "⚠️ Login inválido. Verifique email e senha.";
      return;
    }

    console.log("Login realizado:", data);

    // Verifica se é admin (pode comentar para teste)
    const isAdmin = data.user?.role === 'admin'; // ajuste conforme seu schema
    if (!isAdmin) {
      console.warn("Acesso restrito a administradores. Permitido apenas para teste.");
      loginMessage.innerText = "⚠️ Você não é admin. Acesso restrito, mas permitindo teste.";
      // Comente esta linha se quiser bloquear realmente:
      // return;
    }

    // Redireciona ou inicializa painel
    loginMessage.innerText = "✅ Login bem-sucedido!";
    // iniciarPainel(); // função que carrega o painel

  } catch (err) {
    console.error("Erro inesperado:", err);
    loginMessage.innerText = "⚠️ Erro inesperado. Veja console para detalhes.";
  }
}
