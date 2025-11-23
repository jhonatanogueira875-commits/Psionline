import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Settings, User, Briefcase, Loader2, Home, Users, PlusCircle, Copy, AlertTriangle, CheckCircle, Link } from 'lucide-react';
import { firebaseConfig } from './firebaseConfig'; // Crie este arquivo conforme explicado

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helpers
const getProfileDocRef = (userId) => doc(db, 'users', userId);
const getConnectionsCollectionRef = () => collection(db, 'connections');

// App Principal
const App = () => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [view, setView] = useState('profile');
  const [notification, setNotification] = useState({ message: '', type: 'info' });

  // Toast
  const showMessage = (msg, type = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification({ message: '', type: 'info' }), 5000);
  };

  // Carrega perfil
  const loadUserProfile = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const docRef = getProfileDocRef(userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setRole(data.role || '');
        setName(data.name || '');
        setView(data.role === 'psicologo' ? 'dashboard' : 'patient_app');
      } else {
        setProfile(null);
        setView('profile');
      }
    } catch (e) {
      console.error("Erro ao carregar perfil:", e);
      showMessage("Erro ao carregar perfil.", 'error');
      setView('profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        setIsAuthReady(true);
        loadUserProfile(user.uid);
      } else {
        signInAnonymously(auth).catch((e) => {
          console.error("Falha na autenticação:", e);
          setError("Falha na autenticação.");
          setIsLoading(false);
        });
      }
    });
    return () => unsubscribe();
  }, [loadUserProfile]);

  // Salvar perfil
  const saveUserProfile = async (e) => {
    e.preventDefault();
    if (!currentUserId || !name.trim() || !role) {
      showMessage("Preencha o nome e selecione um papel.", 'error');
      return;
    }
    setIsSaving(true);
    try {
      const docRef = getProfileDocRef(currentUserId);
      await setDoc(docRef, {
        userId: currentUserId,
        name: name.trim(),
        role,
        createdAt: profile?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProfile({ userId: currentUserId, name: name.trim(), role });
      showMessage("Perfil salvo com sucesso!", "success");
      setView(role === 'psicologo' ? 'dashboard' : 'patient_app');
    } catch (e) {
      console.error(e);
      showMessage("Erro ao salvar perfil.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Componentes de Tela ---

  const ProfileRegistrationForm = () => (
    <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-indigo-600">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Bem-vindo(a)!</h2>
      <p className="text-gray-500 mb-6">Complete seu perfil para continuar.</p>

      <form onSubmit={saveUserProfile}>
        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 border rounded"
          required
        />
        <div className="flex space-x-4 mb-4">
          <button
            type="button"
            onClick={() => setRole('psicologo')}
            className={`flex-1 p-3 rounded ${role === 'psicologo' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
          >
            Psicólogo(a)
          </button>
          <button
            type="button"
            onClick={() => setRole('paciente')}
            className={`flex-1 p-3 rounded ${role === 'paciente' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
          >
            Paciente
          </button>
        </div>
        <button type="submit" className="w-full p-3 bg-indigo-600 text-white rounded" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar e Continuar"}
        </button>
      </form>
    </div>
  );

  const ProfileView = () => (
    <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-green-600">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Perfil Registrado</h2>
      <p>{profile?.name} ({profile?.role})</p>
      <button onClick={() => setView(profile.role === 'psicologo' ? 'dashboard' : 'patient_app')} className="mt-4 p-3 bg-indigo-600 text-white rounded">
        Acessar Aplicativo
      </button>
    </div>
  );

  const PatientApp = () => (
    <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-2xl text-center">
      <h2 className="text-3xl font-bold mb-4">Aplicativo do Paciente</h2>
      <p>Olá {profile?.name}, aqui você verá suas tarefas e progresso.</p>
      <button onClick={() => setView('profile')} className="mt-4 p-2 border rounded">
        Voltar para Perfil
      </button>
    </div>
  );

  const PsicologoDashboard = () => {
    const [patientIdInput, setPatientIdInput] = useState('');
    const [patients, setPatients] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);

    const trimmedId = patientIdInput.trim();
    const isValidId = trimmedId.length === 36 && trimmedId.includes('-');

    useEffect(() => {
      if (!currentUserId) return;
      const connectionsRef = getConnectionsCollectionRef();
      const q = query(connectionsRef, where("psicologoId", "==", currentUserId));
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const connectedPatientIds = querySnapshot.docs.map(doc => ({ id: doc.id, pacienteId: doc.data().pacienteId }));
        const patientProfiles = await Promise.all(
          connectedPatientIds.map(async (conn) => {
            const snap = await getDoc(getProfileDocRef(conn.pacienteId));
            return snap.exists() ? { ...conn, ...snap.data() } : null;
          })
        );
        setPatients(patientProfiles.filter(p => p));
      });
      return () => unsubscribe();
    }, [currentUserId]);

    const handleConnectPatient = async (e) => {
      e.preventDefault();
      if (!isValidId || trimmedId === currentUserId) {
        showMessage("ID inválido.", "error");
        return;
      }
      setIsConnecting(true);
      try {
        const snap = await getDoc(getProfileDocRef(trimmedId));
        if (!snap.exists() || snap.data().role !== 'paciente') {
          showMessage("Paciente não encontrado.", "error");
          return;
        }
        const connectionRef = doc(getConnectionsCollectionRef(), `${currentUserId}_${trimmedId}`);
        await setDoc(connectionRef, {
          psicologoId: currentUserId,
          pacienteId: trimmedId,
          createdAt: serverTimestamp(),
          pacienteName: snap.data().name
        }, { merge: true });
        showMessage("Paciente conectado com sucesso!", "success");
        setPatientIdInput('');
      } catch (e) {
        console.error(e);
        showMessage("Erro ao conectar paciente.", "error");
      } finally {
        setIsConnecting(false);
      }
    };

    return (
      <div className="w-full min-h-screen bg-white p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">Dashboard {profile?.name}</h2>

        <form onSubmit={handleConnectPatient} className="mb-6">
          <input
            type="text"
            placeholder="ID do paciente"
            value={patientIdInput}
            onChange={(e) => setPatientIdInput(e.target.value)}
            className="p-3 border rounded w-full mb-2"
          />
          <button type="submit" disabled={!isValidId || isConnecting} className="p-3 bg-indigo-600 text-white rounded">
            {isConnecting ? "Conectando..." : "Conectar Paciente"}
          </button>
        </form>

        <div>
          <h3 className="font-bold mb-2">Pacientes Conectados ({patients.length})</h3>
          {patients.map(p => (
            <div key={p.id} className="p-2 border rounded mb-1 flex justify-between">
              <span>{p.name}</span>
              <code>{p.pacienteId}</code>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Renderização ---
  let content;
  if (error) content = <div>{error}</div>;
  else if (isLoading || !isAuthReady) content = <Loader2 className="animate-spin w-10 h-10 mx-auto" />;
  else if (!profile) content = <ProfileRegistrationForm />;
  else if (view === 'profile') content = <ProfileView />;
  else if (view === 'patient_app') content = <PatientApp />;
  else if (view === 'dashboard') content = <PsicologoDashboard />;

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center relative">
      {notification.message && (
        <div className={`absolute top-4 right-4 p-3 rounded-lg text-white ${notification.type === 'error' ? 'bg-red-500' : notification.type === 'success' ? 'bg-green-500' : 'bg-indigo-500'}`}>
          {notification.message}
        </div>
      )}
      {content}
    </div>
  );
};

export default App;
