import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { rtdb, functions } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { manageHostLease } from '../../services/hostService';
import { useStore } from '../../store/useStore';
import HostLobbyView from './HostLobbyView';
import HostCategorySelection from './HostCategorySelection';
import HostBoardReveal from './HostBoardReveal';
import HostGameControl from './HostGameControl';
import QuestionBankInfo from './QuestionBankInfo';
import { generateUUID } from '../../utils/uuid';
import HostDisplayControls from '../../components/HostDisplayControls';
import { storeHostDisplayToken } from '../../utils/displayUrl';

export default function HostPanel() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useStore();
  const [session, setSession] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [initialDisplayToken] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token'));

  useEffect(() => {
    if (!sessionId || !initialDisplayToken) return;
    storeHostDisplayToken(sessionId, initialDisplayToken);
    window.history.replaceState({}, document.title, `/host/${encodeURIComponent(sessionId)}`);
  }, [sessionId, initialDisplayToken]);

  useEffect(() => {
    if (!user || !sessionId) {
      navigate('/login');
      return;
    }

    const clientKey = `quiz_host_client_id_${sessionId}`;
    const clientId = localStorage.getItem(clientKey) || generateUUID();
    localStorage.setItem(clientKey, clientId);
    setLoadError(null);

    manageHostLease({ sessionId, action: 'ACQUIRE', clientId })
      .catch((error) => {
        console.error('Failed to acquire lease', error);
        setLoadError(error?.message || 'Nie udało się przejąć sterowania sesją.');
      });

    const interval = setInterval(() => {
      manageHostLease({ sessionId, action: 'RENEW', clientId })
        .catch(e => console.error('Failed to renew lease', e));
    }, 10000);

    const sessionRef = ref(rtdb, `liveSessions/${sessionId}`);
    const timeout = window.setTimeout(() => setLoadError('Serwer gry nie odpowiedział w ciągu 10 sekund.'), 10_000);
    const unsubscribe = onValue(
      sessionRef,
      (snap) => {
        window.clearTimeout(timeout);
        if (!snap.exists()) {
          setLoadError('Sesja nie istnieje.');
          return;
        }
        setSession(snap.val());
      },
      (error) => {
        window.clearTimeout(timeout);
        setLoadError(error.message || 'Nie udało się odczytać sesji hosta.');
      },
    );

    return () => {
      clearInterval(interval);
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [sessionId, user, navigate, retry]);

  if (loadError) {
    return <div className="min-h-screen flex flex-col gap-5 items-center justify-center"><p className="text-red-300" role="alert">{loadError}</p><button onClick={() => setRetry((value) => value + 1)} className="px-5 py-2 bg-cyan-600 rounded">Spróbuj ponownie</button></div>;
  }

  if (!session || !session.public) {
    return <div className="min-h-screen flex items-center justify-center">Wczytywanie panelu prowadzącego...</div>;
  }

  const publicData = session.public;
  const players = session.publicPlayers || {};
  const presence = session.presence || {};
  
  const playerList = Object.values(players) as any[];
  const approvedCount = playerList.filter(p => p.status === 'APPROVED').length;
  const canStart = approvedCount >= publicData.minPlayers;

  const handleSuspend = async () => {
    if (!window.confirm('Czy na pewno chcesz zapisać i zakończyć grę na teraz? Gra zostanie zawieszona.')) return;
    try {
      const suspendFn = httpsCallable(functions, 'suspendGameSession');
      await suspendFn({ sessionId });
      navigate('/admin');
    } catch (err) {
      console.error(err);
      alert('Błąd podczas zawieszania gry.');
    }
  };

  const renderTopBar = () => (
    <div className="bg-slate-900 border-b border-slate-700 p-4 flex flex-wrap gap-3 justify-between items-center">
      <div className="text-cyan-400 font-bold">Quiz Territory — prowadzący</div>
      <div className="flex flex-wrap items-center gap-3">
        <HostDisplayControls sessionId={sessionId!} initialToken={initialDisplayToken} compact />
        <button onClick={handleSuspend} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded text-sm text-white font-semibold transition-colors">Zapisz i zakończ na teraz</button>
      </div>
    </div>
  );

  if (publicData.state === 'LOBBY') {
    return (
      <div className="min-h-screen flex flex-col">
        {renderTopBar()}
        <HostLobbyView 
          sessionId={sessionId!} 
          publicData={publicData} 
          players={players} 
          presence={presence} 
          canStart={canStart} 
          approvedCount={approvedCount} 
        />
      </div>
    );
  }

  if (publicData.state === 'CATEGORY_SELECTION') {
    return (
      <div className="min-h-screen flex flex-col">
        {renderTopBar()}
        <HostCategorySelection sessionId={sessionId!} publicData={publicData} />
      </div>
    );
  }

  if (publicData.state === 'BOARD_REVEAL') {
    return (
      <div className="min-h-screen flex flex-col">
        {renderTopBar()}
        <HostBoardReveal sessionId={sessionId!} publicData={publicData} players={players} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {renderTopBar()}
      <QuestionBankInfo />
      <HostGameControl sessionId={sessionId!} session={session} hostUserId={user?.uid} />
    </div>
  );
}
