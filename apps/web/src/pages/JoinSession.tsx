import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resolveRoomCode, joinGameSession, getClientId } from '../services/sessionService';
import { loginAnonymously } from '../services/authService';
import { auth } from '../firebase';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, stage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Przekroczono czas oczekiwania: ${stage}`));
    }, timeoutMs);
    promise.then((res) => {
      clearTimeout(timer);
      resolve(res);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function getReadableError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('Timeout') || msg.includes('Failed to fetch') || msg.includes('network') || msg.includes('permission_denied')) {
    return 'Brak dostępu do stanu gry. Sprawdź konfigurację uprawnień lokalnego serwera.';
  }
  return msg;
}

export default function JoinSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoomCode = searchParams.get('code') || '';
  
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState<'CODE' | 'NICKNAME'>('CODE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoomCode) {
      handleResolveCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  const handleResolveCode = async (code: string) => {
    if (!code || code.length !== 4) {
      setError('Kod pokoju musi mieć 4 znaki.');
      return;
    }
    
    console.info("[join] 01 submit", { roomCode: code });
    setLoading(true);
    setError(null);
    
    try {
      console.info("[join] 02 before resolveRoomCode");
      const res = await withTimeout(resolveRoomCode(code), 15000, "resolveRoomCode");
      
      if (!res || typeof res !== "object" || typeof res.sessionId !== "string") {
        throw new Error('Serwer zwrócił nieprawidłową odpowiedź podczas wyszukiwania pokoju.');
      }
      
      console.info("[join] 03 resolved room", { sessionId: res.sessionId });
      
      if (!res.joinOpen || res.state !== 'LOBBY') {
        setError('Dołączanie do tego pokoju jest obecnie zamknięte.');
        return;
      }
      setResolvedSessionId(res.sessionId);
      setStep('NICKNAME');
    } catch (e: any) {
      console.error("[join] failed", e);
      setError(getReadableError(e) || 'Nie znaleziono pokoju.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedNickname = nickname.trim();
    if (normalizedNickname.length < 2 || normalizedNickname.length > 15) {
      setError('Pseudonim musi mieć od 2 do 15 znaków.');
      return;
    }
    if (!resolvedSessionId) return;
    
    setLoading(true);
    setError(null);
    try {
      console.info("[join] 04 before anonymous auth");
      if (!auth.currentUser) {
        await withTimeout(loginAnonymously(), 15000, "anonymous auth");
      }
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Brak uwierzytelnienia gracza.');
      }
      await user.getIdToken();
      const uid = user.uid;
      const clientId = getClientId();
      console.info("[join] 05 authenticated", { uid, clientId, sessionId: resolvedSessionId });
      
      console.info("[join] 06 before joinGameSession");
      const result = await withTimeout(
        joinGameSession(resolvedSessionId, normalizedNickname),
        15000,
        "joinGameSession"
      );
      
      const payload = result as any;
      console.info("[join] 07 join response", payload);

      if (
        !payload ||
        typeof payload !== "object" ||
        typeof payload.sessionId !== "string" ||
        typeof payload.playerId !== "string" ||
        typeof payload.phase !== "string"
      ) {
        throw new Error('Serwer zwrócił nieprawidłową odpowiedź podczas dołączania.');
      }
      
      console.info("[join] 08 before initial session read");
      console.info("[join] 09 initial session received (skipped via callable response)");
      
      console.info("[join] 10 navigating to player lobby");
      navigate(`/play/${payload.sessionId}`, {
        replace: true,
      });
    } catch (e: any) {
      console.error("[join] failed", e);
      setError(getReadableError(e) || 'Nie udało się dołączyć do gry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-xl max-w-sm w-full shadow-[0_0_15px_rgba(45,212,191,0.2)]">
        <h1 className="text-3xl font-bold text-center text-teal-400 mb-6">Dołącz do gry</h1>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm whitespace-pre-line">
            {error}
          </div>
        )}

        {step === 'CODE' && (
          <form onSubmit={(e) => { e.preventDefault(); handleResolveCode(roomCode); }}>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Wpisz 4-znakowy kod pokoju</label>
              <input 
                type="text" 
                maxLength={4}
                value={roomCode}
                onChange={(e) => {
                  const cleaned = e.target.value.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '');
                  setRoomCode(cleaned);
                }}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono uppercase tracking-widest focus:outline-none focus:border-teal-400"
                placeholder="ABCD"
                autoComplete="off"
                spellCheck="false"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
            >
              {loading ? 'Wyszukiwanie pokoju...' : 'Dalej'}
            </button>
          </form>
        )}

        {step === 'NICKNAME' && (
          <form onSubmit={handleJoin}>
             <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Wybierz pseudonim</label>
              <input 
                type="text" 
                maxLength={15}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-teal-400"
                placeholder="np. MistrzQuizu"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 flex justify-center bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
            >
              {loading ? 'Dołączanie...' : 'Dołącz do gry'}
            </button>
            
            {error && error.includes('Spróbuj ponownie') && (
              <button 
                type="button" 
                onClick={handleJoin}
                disabled={loading}
                className="w-full mt-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
              >
                Ponów połączenie
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
