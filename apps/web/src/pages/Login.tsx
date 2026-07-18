import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../services/authService';
import { useStore } from '../store/useStore';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useStore();

  if (user) {
    navigate('/admin');
    return null;
  }

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/admin');
    } catch (e: any) {
      alert(`Logowanie nie powiodło się: ${e.message || 'Spróbuj ponownie.'}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-sm w-full text-center">
        <h2 className="text-3xl font-bold text-cyan-400 mb-6">Logowanie prowadzącego</h2>
        <button 
          onClick={handleLogin}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
        >
          Zaloguj się przez Google
        </button>
        <div className="mt-4 text-gray-400 text-sm">
          (W środowisku lokalnym używany jest emulator uwierzytelniania Firebase)
        </div>
      </div>
    </div>
  );
}
