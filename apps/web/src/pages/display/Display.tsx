import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { auth, rtdb } from '../../firebase';
import { loginAnonymously } from '../../services/authService';
import { authorizeDisplay, resolveRoomCode } from '../../services/sessionService';
import { buildDisplayUrl, isDisplayAuthorizationRestored, markDisplayAuthorized } from '../../utils/displayUrl';
import DisplayLobbyView from './DisplayLobbyView';
import DisplayCategorySelection from './DisplayCategorySelection';
import DisplayBoardReveal from './DisplayBoardReveal';
import DisplayGameView from './DisplayGameView';

const authorizationRequests = new Map<string, Promise<{ success: boolean }>>();
let displaySignInRequest: ReturnType<typeof loginAnonymously> | null = null;

function getDisplayUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (displaySignInRequest) return displaySignInRequest;

  const request = loginAnonymously();
  displaySignInRequest = request;
  request.then(
    () => { if (displaySignInRequest === request) displaySignInRequest = null; },
    () => { if (displaySignInRequest === request) displaySignInRequest = null; },
  );
  return request;
}

function authorizeDisplayOnce(sessionId: string, token: string) {
  const key = `${sessionId}:${token}`;
  const existing = authorizationRequests.get(key);
  if (existing) return existing;

  const request = authorizeDisplay(sessionId, token).catch((error) => {
    authorizationRequests.delete(key);
    throw error;
  });
  authorizationRequests.set(key, request);
  return request;
}

export type DisplayConnectionState =
  | 'MISSING_PARAMETERS'
  | 'AUTHORIZING'
  | 'CONNECTED'
  | 'INVALID_TOKEN'
  | 'SESSION_NOT_FOUND'
  | 'CONNECTION_ERROR';

function DisplayMessage({ title, message, action }: { title: string; message: string; action?: () => void }) {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
        <h1 className="mb-4 text-3xl font-bold text-cyan-300">{title}</h1>
        <p className="text-lg leading-relaxed text-slate-300" role="alert">{message}</p>
        {action && <button onClick={action} className="mt-7 rounded-lg bg-cyan-600 px-6 py-3 font-bold hover:bg-cyan-500">Spróbuj ponownie</button>}
      </div>
    </main>
  );
}

export function DisplayConnectionRequired() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [displayToken, setDisplayToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const legacySessionId = searchParams.get('sessionId');
  const queryToken = searchParams.get('token');

  useEffect(() => {
    if (legacySessionId && queryToken) {
      const canonical = buildDisplayUrl(legacySessionId, queryToken, window.location.origin);
      navigate(`${new URL(canonical).pathname}${new URL(canonical).search}`, { replace: true });
    } else if (legacySessionId || queryToken) {
      setError(legacySessionId ? 'Brakuje tokenu ekranu TV.' : 'Brakuje identyfikatora sesji.');
    }
  }, [legacySessionId, queryToken, navigate]);

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const resolved = await resolveRoomCode(roomCode);
      const canonical = buildDisplayUrl(resolved.sessionId, displayToken, window.location.origin);
      const url = new URL(canonical);
      navigate(`${url.pathname}${url.search}`);
    } catch (connectError: any) {
      setError(connectError?.message || 'Nie udało się odnaleźć pokoju.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <h1 className="mb-4 text-center text-3xl font-bold text-cyan-300">Ekran TV nie jest jeszcze połączony</h1>
        <p className="mb-7 text-center text-lg leading-relaxed text-slate-300">Otwórz panel prowadzącego, utwórz grę i kliknij „Ekran TV”, aby otrzymać bezpieczny link do tego ekranu.</p>
        <form onSubmit={connect} className="space-y-4">
          <label className="block text-sm text-slate-300">Kod pokoju
            <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-center font-mono text-2xl tracking-widest" required />
          </label>
          <label className="block text-sm text-slate-300">Jednorazowy token ekranu
            <input type="password" value={displayToken} onChange={(event) => setDisplayToken(event.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3" required />
          </label>
          {error && <p className="text-red-300" role="alert">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-purple-600 px-5 py-3 font-bold hover:bg-purple-500 disabled:opacity-50">{busy ? 'Łączenie…' : 'Połącz ekran'}</button>
        </form>
      </div>
    </main>
  );
}

function classifySetupError(error: any): DisplayConnectionState {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  if (code.includes('permission-denied') || code.includes('unauthenticated') || message.includes('token') || message.includes('permission')) return 'INVALID_TOKEN';
  if (code.includes('not-found') || message.includes('not found')) return 'SESSION_NOT_FOUND';
  return 'CONNECTION_ERROR';
}

export default function Display() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<DisplayConnectionState>(sessionId ? 'AUTHORIZING' : 'MISSING_PARAMETERS');
  const [publicData, setPublicData] = useState<any>(null);
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus('MISSING_PARAMETERS');
      return;
    }

    let active = true;
    const unsubscribers: Array<() => void> = [];
    let firstSnapshotTimeout: number | undefined;
    setStatus('AUTHORIZING');
    setPublicData(null);

    const setup = async () => {
      try {
        const user = await getDisplayUser();
        if (!token && !isDisplayAuthorizationRestored(sessionId, user.uid)) {
          if (active) setStatus('MISSING_PARAMETERS');
          return;
        }

        if (token) {
          await authorizeDisplayOnce(sessionId, token);
          markDisplayAuthorized(sessionId, user.uid);
          window.history.replaceState({}, document.title, `/display/${encodeURIComponent(sessionId)}`);
        }
        if (!active) return;

        firstSnapshotTimeout = window.setTimeout(() => active && setStatus('CONNECTION_ERROR'), 10_000);
        const fail = (subscriptionError: Error) => {
          console.error('[display] subscription failed', subscriptionError);
          if (active) setStatus(classifySetupError(subscriptionError));
        };

        unsubscribers.push(onValue(ref(rtdb, `liveSessions/${sessionId}/public`), (snapshot) => {
          if (!active) return;
          if (!snapshot.exists()) {
            setStatus('SESSION_NOT_FOUND');
            return;
          }
          window.clearTimeout(firstSnapshotTimeout);
          setPublicData(snapshot.val());
          setStatus('CONNECTED');
        }, fail));
        unsubscribers.push(onValue(ref(rtdb, `liveSessions/${sessionId}/publicPlayers`), (snapshot) => {
          if (active) setPlayers(snapshot.val() || {});
        }, fail));
      } catch (setupError: any) {
        console.error('[display] setup failed', { code: setupError?.code, message: setupError?.message });
        if (active) setStatus(classifySetupError(setupError));
      }
    };

    setup();
    return () => {
      active = false;
      window.clearTimeout(firstSnapshotTimeout);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [sessionId, token, retry]);

  if (!sessionId) return <DisplayConnectionRequired />;
  if (status === 'MISSING_PARAMETERS') return <DisplayMessage title="Brakuje danych połączenia" message="Link do ekranu TV nie zawiera jednorazowego tokenu. Wygeneruj nowy link w panelu hosta." />;
  if (status === 'INVALID_TOKEN') return <DisplayMessage title="Nie można autoryzować ekranu" message="Link do ekranu TV jest nieprawidłowy lub wygasł. Wygeneruj nowy link w panelu hosta." />;
  if (status === 'SESSION_NOT_FOUND') return <DisplayMessage title="Nie znaleziono sesji" message="Ta sesja gry nie istnieje lub została zakończona." />;
  if (status === 'CONNECTION_ERROR') return <DisplayMessage title="Brak połączenia" message="Nie udało się połączyć z lokalnym serwerem gry. Sprawdź, czy telewizor i komputer są w tej samej sieci Wi-Fi." action={() => setRetry((value) => value + 1)} />;
  if (status === 'AUTHORIZING' || !publicData) return <DisplayMessage title="Łączenie ekranu TV" message="Trwa bezpieczna autoryzacja i pobieranie stanu gry…" />;

  const approvedPlayers = Object.values(players).filter((player: any) => player.status === 'APPROVED');
  if (publicData.state === 'LOBBY') return <DisplayLobbyView publicData={publicData} approvedPlayers={approvedPlayers} />;
  if (publicData.state === 'CATEGORY_SELECTION') return <DisplayCategorySelection publicData={publicData} />;
  if (publicData.state === 'BOARD_REVEAL') return <DisplayBoardReveal publicData={publicData} players={players} />;
  return <DisplayGameView publicData={publicData} players={players} />;
}
