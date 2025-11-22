/*
  auth.js
  Supabase authentication helpers (no service_role here).
  Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project's values.
*/

const SUPABASE_URL = "REPLACE_WITH_YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "REPLACE_WITH_YOUR_SUPABASE_ANON_KEY";

// initialize client (expects <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> in HTML)
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
if (!supabaseClient) console.warn("Supabase client not initialized. Check your script import and keys.");

async function signUp(email, password, full_name, role = "patient") {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  const res = await supabaseClient.auth.signUp({ email, password });
  if (res.error) throw res.error;

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
