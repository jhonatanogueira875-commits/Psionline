/*
  database.js
  Simple database helpers that use supabaseClient from auth.js
  These functions are intentionally simple and make extra requests
  so they work with common Supabase schemas (profiles + content tables).
*/

async function fetchPsychologists() {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  const { data, error } = await supabaseClient.from("psychologists").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("fetchPsychologists error", error);
    return [];
  }
  // for each psychologist, try to load profile name
  const result = await Promise.all(data.map(async (p) => {
    let profile = null;
    if (p.user_id) {
      profile = await getProfile(p.user_id);
    }
    return { ...p, profile };
  }));
  return result;
}

async function fetchPatients() {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  const { data, error } = await supabaseClient.from("patients").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("fetchPatients error", error);
    return [];
  }
  const result = await Promise.all(data.map(async (p) => {
    let profile = null;
    if (p.user_id) profile = await getProfile(p.user_id);
    return { ...p, profile };
  }));
  return result;
}

async function fetchAppointments() {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  const { data, error } = await supabaseClient.from("appointments").select("*").order("scheduled_date", { ascending: true });
  if (error) {
    console.error("fetchAppointments error", error);
    return [];
  }
  return data;
}

async function bookAppointment(psychologistId, date, time) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  // assume user is authenticated
  const session = await currentSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  // get patient record
  const { data: patientData, error: e1 } = await supabaseClient.from("patients").select("id").eq("user_id", uid).single();
  if (e1 || !patientData) throw new Error("Paciente não encontrado. Cadastre-se como paciente primeiro.");

  // get psychologist price
  const { data: psyData } = await supabaseClient.from("psychologists").select("session_price").eq("id", psychologistId).single();

  const { error } = await supabaseClient.from("appointments").insert({
    patient_id: patientData.id,
    psychologist_id: psychologistId,
    scheduled_date: date,
    scheduled_time: time,
    value: psyData?.session_price || 150,
    status: "pending"
  });

  if (error) throw error;
  return true;
}

async function updateAppointmentStatus(appointmentId, status) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  const { error } = await supabaseClient.from("appointments").update({ status }).eq("id", appointmentId);
  if (error) throw error;
  return true;
}

async function approvePsychologist(id) {
  if (!supabaseClient) throw new Error("Supabase not initialized");
  const { error } = await supabaseClient.from("psychologists").update({ status: "approved" }).eq("id", id);
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
    stats: {
      totalPsychologists: psychologists.length,
      totalPatients: patients.length,
      totalAppointments: appointments.length,
      totalRevenue: totalRev
    }
  };
}
