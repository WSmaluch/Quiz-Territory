import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

export default function HostIndex() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkHost() {
      try {
        if (!user) {
          if (import.meta.env.VITE_LOCAL_PARTY_HOST) {
            console.log('Local Party Mode detected. Attempting to auto-login local admin...');
            const auth = getAuth();
            try {
              await signInWithEmailAndPassword(auth, 'admin@local.party', 'password123');
              // The auth state listener in App.tsx will update the store
              // We just return, since the user object update will re-trigger the effect
              return;
            } catch (e: any) {
              console.log('Local admin auto-login failed. Diagnostic:', e.message);
              setError('Lokalny administrator nie istnieje. Sprawdź, czy uruchomiono skrypt inicjalizacyjny.');
              setLoading(false);
              return;
            }
          } else {
            console.log('No user and not local party mode. Redirecting to login.');
            navigate('/login');
            return;
          }
        } else {
          // Verify it's not just an anonymous player user
          if (user.isAnonymous) {
             setError('Jesteś zalogowany jako gracz, nie jako host. Rozłącz się i zaloguj ponownie.');
             setLoading(false);
             return;
          }
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error in HostIndex auth check:', err);
        setError('Błąd weryfikacji hosta: ' + err.message);
        setLoading(false);
      }
    }
    checkHost();
  }, [user, navigate]);

  if (loading) return <div className="p-8 text-center text-gray-300">Ładowanie sesji hosta...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Witaj w Panelu Hosta</h1>
      <p className="text-gray-400 mb-8 max-w-md text-center">
        Aktualnie nie ma aktywnej sesji gry. Możesz utworzyć nową grę lub zarządzać systemem.
      </p>
      <div className="flex gap-4">
        <button 
          onClick={() => navigate('/admin/sessions/new')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors shadow-lg shadow-blue-500/20"
        >
          Nowa Gra
        </button>
        <button 
          onClick={() => navigate('/admin')}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          Panel Zarządzania
        </button>
      </div>
    </div>
  );
}
