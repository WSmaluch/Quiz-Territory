import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAnonymously } from '../services/authService';
import { createDemoSession } from '../services/sessionService';
import { useStore } from '../store/useStore';

export default function Demo() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string; raw?: string } | null>(null);

  const setupAttempted = useRef(false);

  useEffect(() => {
    if (setupAttempted.current) return;
    setupAttempted.current = true;
    
    const setupDemo = async () => {
      try {
        if (!user) {
          try {
            await loginAnonymously();
          } catch (e: any) {
            const isNetwork = e.message?.includes('network-request-failed') || e.code === 'auth/network-request-failed';
            throw {
              title: isNetwork ? 'Auth Emulator Unavailable' : 'Anonymous Authentication Failed',
              message: isNetwork 
                ? 'The application could not connect to the local Firebase Authentication Emulator on port 9099. Ensure the emulators are running with "npm run dev:all".'
                : 'Could not sign in anonymously.',
              raw: e.message
            };
          }
        }
        
        try {
          const result = await createDemoSession({
            gameName: 'Quiz demonstracyjny',
          });

          if (result.sessionId) {
            navigate(`/host/${result.sessionId}#token=${result.displayToken}`, { replace: true });
          }
        } catch (e: any) {
          const isNetwork = e.message?.includes('fetch') || e.message?.includes('network');
          throw {
            title: isNetwork ? 'Functions Emulator Unavailable' : 'Callable Function Failed',
            message: isNetwork
              ? 'Could not reach the Cloud Functions Emulator on port 5001. Check the emulator logs.'
              : 'The createDemoSession function returned an error.',
            raw: e.message
          };
        }
      } catch (e: any) {
        if (e.title) {
          setErrorDetails(e);
        } else {
          setErrorDetails({
            title: 'Firebase Configuration Failure',
            message: 'An unexpected error occurred during demo setup.',
            raw: e.message || String(e)
          });
        }
      }
    };

    setupDemo();
  }, [user, navigate]);

  if (errorDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-slate-900 border border-red-500/30 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-red-500/10 text-red-500 flex items-center justify-center rounded-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-400">{errorDetails.title}</h2>
          </div>
          <p className="text-gray-300 text-lg mb-4">{errorDetails.message}</p>
          {errorDetails.raw && (
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-red-300/80 break-all overflow-auto">
              {errorDetails.raw}
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700 hover:border-slate-600"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Przygotowywanie wersji demonstracyjnej...</h2>
        <p className="text-gray-400">Tworzenie oddzielnej sesji</p>
      </div>
    </div>
  );
}
