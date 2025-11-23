// ============================
// app.js - Versão organizada
// ============================

// 1️⃣ Inicializar Supabase - apenas uma instância global
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://SEU_SUPABASE_URL.supabase.co";
const SUPABASE_KEY = "SUA_SUPABASE_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================
// 2️⃣ Funções de Autenticação
// ============================

// Login de usuário
async function handleLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro no login:", error.message);
    return null;
  }

  return data.user;
}

// Verifica se usuário é admin
async function checkAdminRole(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Erro ao verificar role:", error.message);
    return null;
  }

  return data.role === "admin";
}

// ============================
// 3️⃣ Funções de Dashboard
// ============================

// Contagem total de usuários (RLS precisa permitir leitura para admin)
async function fetchUserCount() {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Erro ao buscar usuários:", error.message);
    return 0;
  }

  return count;
}

// Últimos usuários cadastrados
async function fetchRecentUsers(limit = 5) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Erro ao buscar usuários recentes:", error.message);
    return [];
  }

  return data;
}

// Contagem total de agendamentos
async function fetchAppointmentCount() {
  const { count, error } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Erro ao buscar agendamentos:", error.message);
    return 0;
  }

  return count;
}

// Últimos agendamentos
async function fetchRecentAppointments(limit = 5) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Erro ao buscar agendamentos recentes:", error.message);
    return [];
  }

  return data;
}

// ============================
// 4️⃣ Função de envio de email via Brevo
// ============================

async function sendEmail(toEmail, subject, htmlContent) {
  const BREVO_API_KEY = "SUA_API_KEY_BREVO";

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "PsiOnline", email: "noreply@psionline.com" },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
      }),
    });

    const result = await res.json();
    console.log("Email enviado:", result);
    return result;
  } catch (err) {
    console.error("Erro ao enviar email:", err);
    return null;
  }
}

// ============================
// 5️⃣ Exemplo de uso
// ============================

async function initDashboard() {
  const user = await handleLogin("admin@psionline.com", "SENHA");

  if (!user) return;

  const isAdmin = await checkAdminRole(user.id);
  if (!isAdmin) {
    alert("Você não tem permissão para acessar o dashboard!");
    return;
  }

  // Exibir contagens
  const userCount = await fetchUserCount();
  const appointmentCount = await fetchAppointmentCount();
  console.log("Usuários:", userCount);
  console.log("Agendamentos:", appointmentCount);

  // Exibir últimos registros
  const recentUsers = await fetchRecentUsers();
  const recentAppointments = await fetchRecentAppointments();
  console.log("Últimos usuários:", recentUsers);
  console.log("Últimos agendamentos:", recentAppointments);

  // Teste de envio de email
  await sendEmail(
    "teste@dominio.com",
    "Bem-vindo ao PsiOnline!",
    "<p>Seu cadastro foi realizado com sucesso.</p>"
  );
}

// Inicializa dashboard
initDashboard();
