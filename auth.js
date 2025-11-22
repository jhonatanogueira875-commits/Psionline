/*
  auth.js
  Supabase authentication helpers (no service_role here).
  Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project's values.
*/

// INSIRA SUA CHAVE AQUI
const SUPABASE_URL = "https://jhcylgeukoiomydgppxc.supabase.co"; 

// INSIRA SUA CHAVE AQUI
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lsZ2V1a29pb215ZGdwcHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDk3MzUsImV4cCI6MjA3OTE4NTczNX0.OGBU7RK2lwSZaS1xvxyngV8tgoi3M7o0kv_xCX0Ku5A

"; 

// initialize client (expects <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> in HTML)
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.warn("Supabase client not initialized. Check your script import and keys.");

// ... (rest of the code is fine)
  const user = res.data.user;
  if (!user) return res;

  // create profile record in 'profiles' table
  const { error: e2 } = await supabaseClient
    .from("profiles")
    .insert([{ id: user.id, full_name, role }]);
  if (e2) throw e2;
  return res;
}

async function signIn(email, password) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  await supabaseClient.auth.signOut();
}

async function getProfile(uid) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", uid).single();
  if (error) return null;
  return data;
}

function onAuthChange(cb) {
  if (!supabaseClient) return;
  supabaseClient.auth.onAuthStateChange((event, session) => {
    cb(event, session);
  });
}

// helper to get current session/user
async function currentSession() {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data?.session || null;
}

