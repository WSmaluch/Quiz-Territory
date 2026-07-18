import { useEffect, useRef, useState } from 'react';
import { callGameAction } from '../../services/hostService';
import { generateUUID } from '../../utils/uuid';
import { categoryCatalogFromPublicState, getGamePhaseLabel, resolveCategoryName } from 'shared';
import { duelActionErrorMessage } from './hostGameMessages';
import QuestionMediaView from '../../components/QuestionMediaView';

function remaining(timer: any, active: boolean, startedAt: number | null, now: number) {
  if (!timer) return 0;
  const duration = Number.isFinite(timer.configuredStartingDurationMs) ? timer.configuredStartingDurationMs : 0;
  const elapsed = Number.isFinite(timer.accumulatedElapsedMs) ? timer.accumulatedElapsedMs : 0;
  const safeStart = typeof startedAt === 'number' && Number.isFinite(startedAt) ? startedAt : now;
  const running = active ? Math.max(0, now - safeStart) : 0;
  return Math.max(0, duration - elapsed - running);
}

export default function HostGameControl({ sessionId, session, hostUserId }: any) {
  const publicData = session.public;
  const players = session.publicPlayers || {};
  const duel = publicData.duel;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [imageFailed, setImageFailed] = useState(false);
  const actionInFlight = useRef(false);
  const leaseHeartbeat = session.hostLease?.lastHeartbeat;
  const hasValidHostLease = Boolean(
    hostUserId
    && session.hostLease?.hostId === hostUserId
    && typeof leaseHeartbeat === 'number'
    && Number.isFinite(leaseHeartbeat)
    && now - leaseHeartbeat <= 15_000,
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => setImageFailed(false), [duel?.currentQuestion?.questionId]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 1_500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const invoke = async (name: string, payload: Record<string, unknown> = {}) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const commandId = generateUUID();
    console.info('[duel-action]', { action: name, sessionId, commandId });
    if (name === 'drawPlayer') {
      console.info('[draw-player]', { sessionId, commandId, phase: publicData.state });
    }
    if (name === 'markWrong') {
      console.info('[duel-action-call]', {
        action: name,
        sessionId,
        commandId,
        phase: publicData.state,
        questionId: duel?.currentQuestion?.questionId ?? null,
      });
    }
    try {
      await callGameAction(name, sessionId, payload, commandId);
      if (name === 'markWrong') {
        console.info('[duel-action-success]', { action: name, sessionId, commandId });
        setNotice('Odpowiedź błędna — gracz odpowiada dalej.');
      }
    } catch (actionError: any) {
      console.error(`[host-game] ${name} failed`, actionError);
      if (name === 'markWrong') {
        console.error('[duel-action-error]', {
          action: name,
          sessionId,
          commandId,
          code: actionError?.code ?? null,
          message: actionError?.message ?? String(actionError),
        });
      }
      setError(duelActionErrorMessage(actionError, name));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  const state = publicData.state;
  const playerName = (id?: string) => id ? players[id]?.nickname || id : '—';
  const categoryName = resolveCategoryName(duel?.categoryId, categoryCatalogFromPublicState(publicData));
  const attackerLeft = remaining(duel?.attackerTimer, duel?.activePlayerId === duel?.attackerId && duel?.status === 'ACTIVE', duel?.activeSegmentStartTimestamp, now);
  const defenderLeft = remaining(duel?.defenderTimer, duel?.activePlayerId === duel?.defenderId && duel?.status === 'ACTIVE', duel?.activeSegmentStartTimestamp, now);
  const eligibleOpponents = Array.isArray(publicData.challengeSelection?.eligibleOpponents)
    ? publicData.challengeSelection.eligibleOpponents
    : [];
  const isContinuingAttack = state === 'CHALLENGE_SELECTION'
    && duel?.result?.winnerId === publicData.activePlayerId;
  const canMarkWrong = state === 'DUEL_ACTIVE'
    && Boolean(duel?.currentQuestion)
    && hasValidHostLease
    && !busy;

  const handleMarkWrong = () => {
    console.info('[duel-action-click]', {
      action: 'markWrong',
      sessionId,
      phase: state,
      questionId: duel?.currentQuestion?.questionId ?? null,
      isSubmitting: busy || actionInFlight.current,
      hasHostLease: hasValidHostLease,
    });
    if (!canMarkWrong || actionInFlight.current) return;
    void invoke('markWrong');
  };

  return (
    <div className="flex-1 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-slate-800 border border-cyan-500/30 rounded-2xl p-8">
        <div className="text-sm uppercase tracking-widest text-cyan-400 mb-2">Etap gry</div>
        <h1 className="text-3xl font-bold mb-6">{getGamePhaseLabel(state)}</h1>

        {state === 'PLAYER_DRAW' && (
          <button disabled={busy} onClick={() => invoke('drawPlayer', { action: 'DRAW_RANDOM' })} className="px-6 py-3 bg-cyan-600 rounded font-bold disabled:opacity-50">
            Wylosuj gracza
          </button>
        )}

        {state === 'CHALLENGE_SELECTION' && (
          <div>
            <p className="mb-2"><strong>{playerName(publicData.activePlayerId)}</strong> wybiera przeciwnika</p>
            {isContinuingAttack && <p className="mb-2 text-slate-300">Ten sam gracz kontynuuje atak.</p>}
            <p className="mb-4 text-slate-300">Dostępne terytoria: {eligibleOpponents.length}</p>
            {eligibleOpponents.length === 0 && <p className="mb-4 text-amber-300">Brak dostępnych przeciwników</p>}
            <button disabled={busy} onClick={() => invoke('selectChallengeOpponent', { autoTimeout: true })} className="px-6 py-3 bg-cyan-600 rounded font-bold disabled:opacity-50">
              Wybierz automatycznie
            </button>
          </div>
        )}

        {state === 'DUEL_PREPARATION' && (
          <div>
            <p className="mb-4">{playerName(duel?.attackerId)} kontra {playerName(duel?.defenderId)}</p>
            <p className="mb-4 text-cyan-200">Kategoria: {categoryName}</p>
            <button disabled={busy} onClick={() => invoke('startDuel')} className="px-6 py-3 bg-red-600 rounded font-bold disabled:opacity-50">Rozpocznij pojedynek</button>
          </div>
        )}

        {(state === 'DUEL_ACTIVE' || state === 'DUEL_PAUSED') && duel && (
          <div className="space-y-6">
            {state === 'DUEL_PAUSED' && <p className="text-amber-200">Pojedynek został zatrzymany przez prowadzącego.</p>}
            <p className="text-center text-cyan-200">Kategoria: {categoryName}</p>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className={duel.activePlayerId === duel.attackerId ? 'text-cyan-300' : ''}><strong>{playerName(duel.attackerId)}</strong><div className="text-4xl font-mono">{Math.ceil(attackerLeft / 1000)}s</div></div>
              <div className={duel.activePlayerId === duel.defenderId ? 'text-cyan-300' : ''}><strong>{playerName(duel.defenderId)}</strong><div className="text-4xl font-mono">{Math.ceil(defenderLeft / 1000)}s</div></div>
            </div>
            <div className="bg-slate-900 p-5 rounded-xl">
              <div className="text-xl">{duel.currentQuestion?.prompt || 'Brak pytania'}</div>
              <QuestionMediaView media={duel.currentQuestion?.media} variant="host" onImageError={() => setImageFailed(true)} />
              {session.host?.duelPrivate?.currentAnswer && <div className="mt-3 text-green-300">Odpowiedź: {session.host.duelPrivate.currentAnswer}</div>}
              {Array.isArray(session.host?.duelPrivate?.answerAliases) && (
                <div className="mt-1 text-sm text-green-200">Akceptowane: {session.host.duelPrivate.answerAliases.join(', ')}</div>
              )}
              {session.host?.duelPrivate?.imageAttribution && (
                <div className="mt-2 text-xs text-slate-400">
                  Źródło ilustracji:{' '}
                  <a className="text-cyan-300 underline" href={session.host.duelPrivate.imageAttribution.sourceUrl} target="_blank" rel="noreferrer">
                    {session.host.duelPrivate.imageAttribution.title}
                  </a>{' '}
                  · {session.host.duelPrivate.imageAttribution.author} ·{' '}
                  <a className="text-cyan-300 underline" href={session.host.duelPrivate.imageAttribution.licenseUrl} target="_blank" rel="noreferrer">
                    {session.host.duelPrivate.imageAttribution.license}
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {state === 'DUEL_ACTIVE' ? <>
                <button type="button" disabled={busy} onClick={() => invoke('markCorrect')} className="px-4 py-2 bg-green-600 rounded">Poprawna</button>
                <button type="button" disabled={!canMarkWrong} onClick={handleMarkWrong} className="px-4 py-2 bg-red-700 rounded disabled:opacity-50">Błędna odpowiedź</button>
                <button type="button" disabled={busy} onClick={() => invoke('passQuestion')} className="px-4 py-2 bg-orange-600 rounded">Pas</button>
                <button type="button" disabled={busy} onClick={() => invoke('skipQuestionWithoutPenalty')} className="px-4 py-2 bg-slate-600 rounded">
                  {imageFailed ? 'Pomiń pytanie z powodu błędu obrazu' : 'Pomiń bez kary'}
                </button>
                <button disabled={busy} onClick={() => invoke('pauseDuel', { payload: { reason: 'HOST_MANUAL' } })} className="px-4 py-2 bg-yellow-700 rounded">Pauza</button>
              </> : <button disabled={busy} onClick={() => invoke('resumeDuel')} className="px-4 py-2 bg-green-600 rounded">Wznów</button>}
              <button disabled={busy} onClick={() => invoke('undoLastDuelAction')} className="px-4 py-2 bg-purple-700 rounded">Cofnij</button>
              <button disabled={busy} onClick={() => invoke('adjustPlayerTime', { payload: { playerId: duel.activePlayerId, deltaMs: 5000 } })} className="px-4 py-2 bg-blue-700 rounded">+5 s</button>
              <button disabled={busy} onClick={() => invoke('endDuelManually', { payload: { winnerId: duel.attackerId } })} className="px-4 py-2 bg-slate-700 rounded">Wygrywa {playerName(duel.attackerId)}</button>
              <button disabled={busy} onClick={() => invoke('endDuelManually', { payload: { winnerId: duel.defenderId } })} className="px-4 py-2 bg-slate-700 rounded">Wygrywa {playerName(duel.defenderId)}</button>
            </div>
          </div>
        )}

        {state === 'DUEL_COMPLETE' && (
          <div>
            <p className="mb-4">Zwycięzca: <strong>{playerName(duel?.result?.winnerId)}</strong></p>
            <button disabled={busy} onClick={() => invoke('transferTerritory')} className="px-6 py-3 bg-cyan-600 rounded font-bold">Przenieś terytorium</button>
          </div>
        )}

        {state === 'CONTINUE_DECISION' && (
          <div>
            <p className="mb-4">Czy zwycięzca chce zaatakować kolejne terytorium?</p>
            <div className="flex gap-3">
              <button disabled={busy} onClick={() => invoke('submitContinueDecision', { payload: { decision: 'CONTINUE' } })} className="px-6 py-3 bg-green-600 rounded">Kontynuuj atak</button>
              <button disabled={busy} onClick={() => invoke('submitContinueDecision', { payload: { decision: 'RETURN_TO_DRAW' } })} className="px-6 py-3 bg-slate-600 rounded">Zakończ serię i wróć do losowania</button>
            </div>
          </div>
        )}

        {state === 'GAME_COMPLETE' && (
          <div className="text-center"><div className="text-5xl mb-4">🏆</div><p className="text-2xl mb-6">Wygrywa {playerName(publicData.winnerId)}</p><a href={`/results/${sessionId}`} className="px-6 py-3 bg-cyan-600 rounded font-bold">Pokaż wyniki</a></div>
        )}

        {notice && <p className="mt-6 text-amber-200" role="status">{notice}</p>}
        {error && <p className="mt-6 text-red-300" role="alert">{error}</p>}
      </div>
    </div>
  );
}
