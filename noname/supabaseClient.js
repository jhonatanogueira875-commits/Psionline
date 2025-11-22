// supabaseClient.js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SEU-ANON-KEY-AQUI';

const supabase = supabaseJs.createClient
  ? supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) // se usar import
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// se no seu index você já importou via <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// então use:
const supa = supabase; // ou window.supabase
