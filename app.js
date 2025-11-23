import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Settings, User, Briefcase, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

// --- CONFIGURAÇÃO DE VARIÁVEIS DO AMBIENTE ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// ----------------------
// FIREBASE & AUTH SETUP
// ----------------------
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

// Helper para construir o caminho do documento do perfil (Coleção pública para perfis)
const getProfileDocRef = (userId) => {
    if (!db || !userId) return null;
    // Caminho público para Perfis: /artifacts/{appId}/public/data/users/{userId}
    return doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
};

// ----------------------
// COMPONENTE PRINCIPAL (App)
// ----------------------

const App = () => {
    // Estados de controle de autenticação e carregamento
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados de dados do perfil
    const [profile, setProfile] = useState(null);
    const [role, setRole] = useState(''); // 'psicologo' ou 'paciente'
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Função de utilidade para mostrar notificações
    const showMessage = (message, type = 'info') => {
        const box = document.getElementById('notification-box');
        if (box) {
            box.textContent = message;
            box.className = `absolute top-4 right-4 p-3 rounded-lg text-sm transition-opacity duration-300 z-50 shadow-lg ${
                type === 'error' ? 'bg-red-500 text-white' : type === 'success' ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
            }`;
            box.classList.remove('hidden');
            setTimeout(() => {
                box.classList.add('hidden');
            }, 5000);
        }
    };

    // 2. Carregar o perfil do Firestore
    const loadUserProfile = useCallback(async (userId) => {
        if (!userId || !db) return;
        try {
            const docRef = getProfileDocRef(userId);
            if (docRef) {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfile(docSnap.data());
                    setRole(docSnap.data().role || '');
                    setName(docSnap.data().name || '');
                } else {
                    setProfile(null);
                }
            }
        } catch (e) {
            console.error("Erro ao carregar perfil:", e);
            showMessage("Erro ao carregar perfil.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 1. EFEITO DE AUTENTICAÇÃO: Realiza o login e configura o ouvinte.
    useEffect(() => {
        if (!isFirebaseInitialized) {
            setError("Firebase não está configurado. Verifique a configuração.");
            setIsLoading(false);
            return;
        }

        const authenticate = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (e) {
                console.error("Erro na autenticação:", e);
                setError("Falha na autenticação. Tente recarregar.");
                setIsLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserId(user.uid);
                setIsAuthReady(true);
                loadUserProfile(user.uid);
            } else {
                // Tenta autenticar se não houver usuário logado
                if (!currentUserId && !error) {
                    authenticate();
                } else {
                    setIsAuthReady(true);
                    setIsLoading(false);
                }
            }
        });

        return () => unsubscribe();
    }, [loadUserProfile, currentUserId, error]);

    // 3. Salvar o perfil no Firestore
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
                    createdAt: profile?.createdAt || serverTimestamp(), // Mantém o original se existir
                };

                await setDoc(docRef, profileData);
                setProfile(profileData);
                showMessage(`Perfil salvo como "${role}" com sucesso!`, 'success');
            }
        } catch (e) {
            console.error("Erro ao salvar perfil:", e);
            showMessage("Erro ao salvar perfil. Tente novamente.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Componentes de UI ---

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

    const ProfileRegistrationForm = () => (
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-indigo-600">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Bem-vindo(a) ao PsicoConnect</h2>
            <p className="text-gray-500 mb-6">Por favor, complete seu perfil para continuar.</p>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Seu ID Único de Usuário (Importante!)</label>
                <code className="text-sm text-indigo-700 break-all p-1 bg-white rounded shadow-inner inline-block">
                    {currentUserId || 'Aguardando ID...'}
                </code>
            </div>

            <form onSubmit={saveUserProfile}>
                <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Seu Nome / Nome de Usuário</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Dra. Ana Silva ou João da Silva"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        required
                        disabled={isSaving}
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Qual é o seu papel?</label>
                    <div className="flex space-x-4">
                        <RoleOption
                            icon={Briefcase}
                            roleKey="psicologo"
                            label="Psicólogo(a)"
                            selectedRole={role}
                            onSelect={setRole}
                            disabled={isSaving}
                        />
                        <RoleOption
                            icon={User}
                            roleKey="paciente"
                            label="Paciente"
                            selectedRole={role}
                            onSelect={setRole}
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center justify-center disabled:bg-indigo-400"
                    disabled={isSaving || !currentUserId || !role || !name.trim()}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Salvando Perfil...
                        </>
                    ) : (
                        'Salvar e Continuar'
                    )}
                </button>
            </form>
        </div>
    );

    const RoleOption = ({ icon: Icon, roleKey, label, selectedRole, onSelect, disabled }) => {
        const isSelected = selectedRole === roleKey;
        return (
            <button
                type="button"
                onClick={() => onSelect(roleKey)}
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
    };

    const ProfileView = () => (
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-green-600">
            <div className="flex items-center mb-6">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <h2 className="text-3xl font-extrabold text-gray-900">Perfil Registrado!</h2>
            </div>
            <p className="text-gray-600 mb-6">
                Você já está registrado como **{profile.role === 'psicologo' ? 'Psicólogo(a)' : 'Paciente'}** e pronto para usar o PsicoConnect.
            </p>

            <div className="space-y-4">
                <DetailRow icon={User} label="Nome" value={profile.name} />
                <DetailRow icon={Settings} label="Papel" value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} />
                <DetailRow icon={Briefcase} label="Seu ID" value={profile.userId} isCode={true} />
            </div>

            <p className="mt-8 text-sm text-gray-500 border-t pt-4">
                {profile.role === 'psicologo'
                    ? "Compartilhe seu ID com pacientes para que eles possam se conectar com você no aplicativo do paciente."
                    : "Compartilhe este ID com seu psicólogo para que ele possa acompanhar seu progresso no dashboard."
                }
            </p>
            <button
                onClick={() => setProfile(null)}
                className="w-full mt-4 py-2 text-indigo-600 font-semibold border border-indigo-600 rounded-lg hover:bg-indigo-50 transition duration-300"
            >
                Mudar Perfil
            </button>
        </div>
    );

    const DetailRow = ({ icon: Icon, label, value, isCode = false }) => (
        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <Icon className="w-5 h-5 text-indigo-500 mr-3" />
            <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                {isCode ? (
                    <code className="text-sm text-gray-800 break-all">{value}</code>
                ) : (
                    <p className="text-sm font-medium text-gray-800">{value}</p>
                )}
            </div>
        </div>
    );

    // --- Renderização Principal ---
    let content;

    if (error) {
        content = <ErrorState />;
    } else if (isLoading || !isAuthReady) {
        content = <LoadingState />;
    } else if (profile && profile.role) {
        content = <ProfileView />;
    } else {
        content = <ProfileRegistrationForm />;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            {/* Notificação de Status (Toast) */}
            <div id="notification-box" className="hidden"></div>
            
            {content}
        </div>
    );
};

export default App;
