import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, rtdb } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { useStore } from '../../store/useStore';
import { setupPresence } from '../../services/presenceService';
import type { PlayerApprovalStatus } from 'shared';
import PlayerLobbyView from './PlayerLobbyView';
import PlayerCategorySelection from './PlayerCategorySelection';
import PlayerBoardReveal from './PlayerBoardReveal';
import PlayerGameView from './PlayerGameView';
import { getPlayerSubscriptionPath } from './playerSubscription';

type PlayerLoadState =
  | 'LOADING_PLAYER'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVED'
  | 'ERROR';

const PLAYER_LOAD_ERROR = 'Nie udało się pobrać statusu gracza. Sprawdź połączenie i spróbuj ponownie.';

export default function PlayerPanel() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useStore();
  const [publicData, setPublicData] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [privateData, setPrivateData] = useState<any>(null);
  const [loadState, setLoadState] = useState<PlayerLoadState>('LOADING_PLAYER');
  const [error, setError] = useState<string | null>(null);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);

  const authUid = auth.currentUser?.uid ?? user?.uid;

  useEffect(() => {
    if (!authUid || !sessionId) {
      navigate('/join');
      return;
    }

    const storedPlayerId = localStorage.getItem(`quiz_player_id_${sessionId}`);
    const playerId = authUid;
    const playerPath = getPlayerSubscriptionPath(sessionId, playerId);

    if (storedPlayerId !== playerId) {
      localStorage.setItem(`quiz_player_id_${sessionId}`, playerId);
    }

    console.info('[player] subscription start', {
      sessionId,
      authUid,
      storedPlayerId,
      path: playerPath,
    });

    setLoadState('LOADING_PLAYER');
    setError(null);

    const cleanupPresence = setupPresence(sessionId, playerId, (presenceError) => {
      console.error('[player] presence failed', presenceError);
    });
    let publicReceived = false;
    let playerReceived = false;

    const timeout = window.setTimeout(() => {
      if (!publicReceived || !playerReceived) {
        setError(PLAYER_LOAD_ERROR);
        setLoadState('ERROR');
      }
    }, 10_000);

    const failSubscription = (subscriptionError: Error) => {
      console.error('[player] subscription failed', subscriptionError);
      window.clearTimeout(timeout);
      setError(PLAYER_LOAD_ERROR);
      setLoadState('ERROR');
    };

    const publicRef = ref(rtdb, `liveSessions/${sessionId}/public`);
    const unsubscribePublic = onValue(
      publicRef,
      (snapshot) => {
        publicReceived = true;
        if (!snapshot.exists()) {
          failSubscription(new Error('Session public data not found.'));
          return;
        }
        const value = snapshot.val();
        console.info('[player-phase] public snapshot', {
          sessionId,
          phase: value?.state,
          hasCategorySelection: Boolean(value?.categorySelection),
          categoryCount: value?.categorySelection?.availableCategories?.length ?? 0,
        });
        setPublicData(value);
        if (playerReceived) window.clearTimeout(timeout);
      },
      failSubscription,
    );

    const playerRef = ref(rtdb, playerPath);
    const unsubscribePlayer = onValue(
      playerRef,
      (snapshot) => {
        playerReceived = true;
        const value = snapshot.val();
        console.info('[player] snapshot', {
          playerId,
          exists: snapshot.exists(),
          status: value?.status,
        });

        if (!snapshot.exists()) {
          failSubscription(new Error('Player record not found.'));
          return;
        }

        setPlayer(value);
        const status = value.status as PlayerApprovalStatus;
        setLoadState(status === 'APPROVED' ? 'APPROVED' : 'WAITING_FOR_APPROVAL');
        if (publicReceived) window.clearTimeout(timeout);
      },
      failSubscription,
    );

    const playersRef = ref(rtdb, `liveSessions/${sessionId}/publicPlayers`);
    const unsubscribePlayers = onValue(
      playersRef,
      (snapshot) => setPlayers(snapshot.val() || {}),
      failSubscription,
    );

    const privateRef = ref(rtdb, `liveSessions/${sessionId}/playerPrivate/${playerId}`);
    const unsubscribePrivate = onValue(
      privateRef,
      (snapshot) => {
        setPrivateData(snapshot.val());
      },
      failSubscription,
    );

    return () => {
      window.clearTimeout(timeout);
      cleanupPresence();
      unsubscribePublic();
      unsubscribePlayer();
      unsubscribePlayers();
      unsubscribePrivate();
    };
  }, [sessionId, authUid, navigate, subscriptionAttempt]);

  if (loadState === 'ERROR') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-900/50 p-8 rounded-xl border border-red-500 max-w-sm w-full text-center">
          <p className="text-red-100 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => setSubscriptionAttempt((attempt) => attempt + 1)}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-500 rounded text-white font-bold"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  if (loadState === 'LOADING_PLAYER') {
    return <div className="min-h-screen flex items-center justify-center">Wczytywanie danych gracza...</div>;
  }

  if (publicData?.state === 'LOBBY' || !publicData) {
    return <PlayerLobbyView publicData={publicData || {}} me={player} />;
  }

  if (publicData.state === 'CATEGORY_SELECTION') {
    return <PlayerCategorySelection sessionId={sessionId} privateData={privateData} />;
  }

  if (publicData.state === 'BOARD_REVEAL') {
    return <PlayerBoardReveal publicData={publicData} players={players} playerId={authUid} />;
  }

  return <PlayerGameView sessionId={sessionId} publicData={publicData} players={players} playerId={authUid} />;
}
