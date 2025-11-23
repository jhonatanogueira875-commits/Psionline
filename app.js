import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Settings, User, Briefcase, CheckCircle, AlertTriangle, Loader2, Home, Users, PlusCircle, Link } from 'lucide-react';

// --- CONFIGURAÇÃO DE VARIÁVEIS DO AMBIENTE ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- FIREBASE SETUP ---
let app, db, auth;
let isFirebaseInitialized = false;
if (Object.keys(firebaseConfig).length > 0) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        isFirebaseInitialized = true;
    } catch (e) {
        console.error("Erro ao inicializar o Firebase:", e);
    }
}

// Helpers
const getProfileDocRef = (userId) => {
    if (!db || !userId) return null;
    return doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
};
const getConnectionsCollectionRef = () => {
    if (!db) return null;
    return collection(db, 'artifacts', appId, 'public', 'data', 'connections');
};

const App = () => {
    // Estados
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(null);
    const [role, setRole] = useState('');
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [view, setView] = useState('profile');

    // --- Função de mensagens ---
    const showMessage = (message, type = 'info') => {
        const box = document.getElementById('notification-box');
        if (box) {
            box.textContent = message;
            box.className = `absolute top-4 right-4 p-3 rounded-lg text-sm transition-opacity duration-300 z-50 shadow-lg ${
                type === 'error' ? 'bg-red-500 text-white' : type === 'success' ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
            }`;
            box.classList.remove('hidden');
            setTimeout(() => box.classList.add('hidden'), 5000);
        }
    };

    // --- Carregar perfil ---
    const loadUserProfile = useCallback(async (userId) => {
        if (!userId || !db) return;
        try {
            const docRef = getProfileDocRef(userId);
            if (docRef) {
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
            }
        } catch (e) {
            console.error("Erro ao carregar perfil:", e);
            showMessage("Erro ao carregar perfil.", 'error');
            setView('profile');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Autenticação ---
    useEffect(() => {
        if (!isFirebaseInitialized) {
            setError("Firebase não está configurado.");
            setIsLoading(false);
            return;
        }

        const authenticate = async () => {
            try {
                if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                else await signInAnonymously(auth);
            } catch (e) {
                console.error("Erro na autenticação:", e);
                setError("Falha na autenticação.");
                setIsLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserId(user.uid);
                setIsAuthReady(true);
                loadUserProfile(user.uid);
            } else {
                if (!currentUserId && !error) authenticate();
                else {
                    setIsAuthReady(true);
                    setIsLoading(false);
                }
            }
        });
        return () => unsubscribe();
    }, [loadUserProfile, currentUserId, error]);

    // --- Salvar perfil ---
    const saveUserProfile = async (e) => {
        e.preventDefault();
        if (!currentUserId || !name.trim() || !role) {
            showMessage("Preencha o nome e selecione um papel.", 'error');
            return;
        }
        setIsSaving(true);
        try {
            const docRef = getProfileDocRef(currentUserId);
            if (docRef) {
                const profileData = {
                    userId: currentUserId,
                    name: name.trim(),
                    role: role,
                    updatedAt: serverTimestamp(),
                    createdAt: profile?.createdAt || serverTimestamp(),
                };
                await setDoc(docRef, profileData);
                setProfile(profileData);
                showMessage(`Perfil salvo como "${role}" com sucesso!`, 'success');
                setView(role === 'psicologo' ? 'dashboard' : 'patient_app');
            }
        } catch (e) {
            console.error("Erro ao salvar perfil:", e);
            showMessage("Erro ao salvar perfil.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Componentes ---
    const LoadingState = () => (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <p className="text-gray-600 font-semibold">Carregando autenticação...</p>
        </div>
    );

    const ErrorState = () => (
        <div className="flex flex-col items-center justify-center p-12 bg-red-50 rounded-xl shadow-2xl border-2 border-red-300">
            <AlertTriangle className="w-8 h-8 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Erro Crítico</h2>
            <p className="text-gray-600 text-center">{error}</p>
        </div>
    );

    const RoleOption = React.memo(({ icon: Icon, roleKey, label, selectedRole, onSelect, disabled }) => {
        const isSelected = selectedRole === roleKey;
        return (
            <button
                type="button"
                onClick={() => !disabled && onSelect(roleKey)}
                className={`flex-1 p-4 border-2 rounded-xl text-center transition duration-200 ${
                    isSelected
                        ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-200'
                        : 'border-gray-300 hover:border-indigo-400 bg-white hover:bg-gray-50'
                } disabled:opacity-60`}
                disabled={disabled}
            >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`} />
                <span className="font-semibold text-sm">{label}</span>
            </button>
        );
    });

    const DetailRow = ({ icon: Icon, label, value, isCode = false }) => {
        const handleCopy = () => {
            if (value) {
                const el = document.createElement('textarea');
                el.value = value;
                document.body.appendChild(el);
                el.select();
                try { document.execCommand('copy'); showMessage("ID copiado!", 'success'); } 
                catch { showMessage("Não foi possível copiar.", 'error'); }
                document.body.removeChild(el);
            }
        };
        return (
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Icon className="w-5 h-5 text-indigo-500 mr-3" />
                <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500">{label}</p>
                    {isCode ? <code className="text-sm text-gray-800 break-all">{value}</code> : <p className="text-sm font-medium text-gray-800">{value}</p>}
                </div>
                {isCode && (
                    <button onClick={handleCopy} className="p-1 ml-2 text-indigo-600 hover:bg-indigo-200 rounded-full transition duration-150" title="Copiar ID">
                        <PlusCircle className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    };

    // --- Telas ---
    const ProfileRegistrationForm = () => (
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-indigo-600">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Bem-vindo(a) ao PsicoConnect</h2>
            <p className="text-gray-500 mb-6">Complete seu perfil.</p>
            <form onSubmit={saveUserProfile}>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" 
                    className="w-full p-3 border border-gray-300 rounded-lg mb-4" required disabled={isSaving} />
                <div className="flex space-x-4 mb-4">
                    <RoleOption icon={Briefcase} roleKey="psicologo" label="Psicólogo(a)" selectedRole={role} onSelect={setRole} disabled={isSaving}/>
                    <RoleOption icon={User} roleKey="paciente" label="Paciente" selectedRole={role} onSelect={setRole} disabled={isSaving}/>
                </div>
                <button type="submit" disabled={isSaving || !name || !role} 
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg">{isSaving ? 'Salvando...' : 'Salvar e Continuar'}</button>
            </form>
        </div>
    );

    const ProfileView = () => (
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-green-600">
            <CheckCircle className="w-8 h-8 text-green-600 mb-4" />
            <p className="text-gray-600 mb-6">Você está registrado como <b>{profile.name}</b> ({profile.role})</p>
            <DetailRow icon={User} label="Nome" value={profile.name} />
            <DetailRow icon={Settings} label="Papel" value={profile.role} />
            <DetailRow icon={Briefcase} label="ID" value={profile.userId} isCode />
            <button onClick={() => setView(profile.role==='psicologo'?'dashboard':'patient_app')} 
                className="w-full mt-4 py-3 bg-indigo-600 text-white font-bold rounded-lg">Acessar Aplicativo</button>
            <button onClick={() => setProfile(null)} className="w-full mt-2 py-2 text-indigo-600 border border-indigo-600 rounded-lg">Mudar Papel</button>
        </div>
    );

    const PatientApp = () => (
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-blue-600 text-center">
            <h2 className="text-3xl font-extrabold text-blue-700 mb-4">Aplicativo do Paciente</h2>
            <p className="text-gray-600">Olá, {profile?.name}. Esta é sua tela de registro.</p>
            <button onClick={() => setView('profile')} className="mt-6 py-2 px-4 border border-blue-600 rounded-lg">Voltar</button>
        </div>
    );

    // --- Dashboard do Psicólogo ---
    const PsicologoDashboard = () => {
        const [patientIdInput, setPatientIdInput] = useState('');
        const [isConnecting, setIsConnecting] = useState(false);
        const [patients, setPatients] = useState([]);
        const trimmedId = patientIdInput.trim();
        const isValidId = trimmedId.length === 36 && trimmedId.includes('-');

        // Ouve conexões
        useEffect(() => {
            if (!currentUserId || !db) return;
            const q = query(getConnectionsCollectionRef(), where("psicologoId","==",currentUserId));
            const unsub = onSnapshot(q, async snap => {
                const conns = await Promise.all(snap.docs.map(async d => {
                    const pdata = await getDoc(getProfileDocRef(d.data().pacienteId));
                    return pdata.exists()? {...d.data(), id:d.id, name:pdata.data().name} : null;
                }));
                setPatients(conns.filter(c=>c!==null));
            });
            return ()=>unsub();
        }, [currentUserId]);

        const handleConnectPatient = async e => {
            e.preventDefault();
            if(!isValidId || trimmedId===currentUserId){showMessage("ID inválido", "error"); return;}
            setIsConnecting(true);
            try{
                const pSnap = await getDoc(getProfileDocRef(trimmedId));
                if(!pSnap.exists()){showMessage("Paciente não encontrado","error");return;}
                if(pSnap.data().role!=="paciente"){showMessage("O usuário não é paciente","error");return;}
                await setDoc(doc(getConnectionsCollectionRef(),`${currentUserId}_${trimmedId}`),{
                    psicologoId:currentUserId,
                    pacienteId:trimmedId,
                    pacienteName:pSnap.data().name,
                    createdAt:serverTimestamp()
                }, {merge:true});
                showMessage(`Paciente "${pSnap.data().name}" conectado!`,"success");
                setPatientIdInput('');
            }catch(e){console.error(e);showMessage("Falha ao conectar paciente","error");}
            finally{setIsConnecting(false);}
        };

        return (
            <div className="w-full min-h-screen p-8 max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-indigo-700 mb-6">Dashboard de {profile?.name}</h1>
                <form onSubmit={handleConnectPatient} className="mb-6">
                    <input type="text" placeholder="ID do paciente" value={patientIdInput} onChange={e=>setPatientIdInput(e.target.value)} 
                        className="border p-3 rounded w-full mb-2" disabled={isConnecting}/>
                    <button type="submit" disabled={!isValidId || isConnecting} className="bg-indigo-600 text-white py-2 px-4 rounded">
                        {isConnecting ? 'Conectando...' : 'Conectar Paciente'}
                    </button>
                </form>
                <div className="space-y-2">
                    {patients.map(p=>(
                        <div key={p.id} className="p-2 border rounded">{p.name} ({p.pacienteId})</div>
                    ))}
                </div>
            </div>
        );
    };

    // --- Renderização ---
    let content;
    let isCentered = true;
    if(error) content=<ErrorState />;
    else if(isLoading || !isAuthReady) content=<LoadingState />;
    else if(view==='profile' && !profile) content=<ProfileRegistrationForm />;
    else if(view==='profile' && profile) content=<ProfileView />;
    else if(profile?.role==='psicologo' && view==='dashboard'){content=<PsicologoDashboard />;isCentered=false;}
    else if(profile?.role==='paciente' && view==='patient_app') content=<PatientApp />;
    else content=<ProfileView />;

    return (
        <div className={`min-h-screen bg-gray-100 p-4 ${isCentered?'flex items-center justify-center':'pt-8'}`}>
            <div id="notification-box" className="absolute top-4 right-4 hidden"></div>
            {content}
        </div>
    );
};

export default App;
