import { useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../firebase';
import { generateUUID } from '../../utils/uuid';
import { categoryCatalogFromPublicState, getGamePhaseLabel, resolveCategoryName } from 'shared';
import QuestionMediaView from '../../components/QuestionMediaView';

export default function PlayerGameView({ sessionId, publicData, players }: any) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionInFlight = useRef(false);
  const state = publicData.state;
  const duel = publicData.duel;
  const authenticatedPlayerId = auth.currentUser?.uid;
  const isActive = Boolean(authenticatedPlayerId && authenticatedPlayerId === publicData.activePlayerId);
  const challengeSelection = publicData.challengeSelection;
  const opponents = isActive && challengeSelection?.activePlayerId === authenticatedPlayerId
    && Array.isArray(challengeSelection.eligibleOpponents)
    ? challengeSelection.eligibleOpponents
    : [];
  const playerName = (id?: string) => id ? players[id]?.nickname || id : '—';
  const categoryName = resolveCategoryName(duel?.categoryId, categoryCatalogFromPublicState(publicData));

  const invoke = async (name: string, payload: Record<string, unknown> = {}) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await httpsCallable(functions, name)({ sessionId, commandId: generateUUID(), ...payload });
    } catch (actionError: any) {
      setError(actionError?.message || 'Nie udało się wykonać akcji.');
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  let title = 'Czekaj na hosta';
  let description = `Aktualny etap: ${getGamePhaseLabel(state)}`;
  if (state === 'PLAYER_DRAW') description = 'Trwa losowanie aktywnego gracza.';
  if (state === 'CHALLENGE_SELECTION') {
    title = isActive ? 'Wybierz przeciwnika' : 'Wybór przeciwnika';
    const continuing = duel?.result?.winnerId === publicData.activePlayerId;
    description = continuing
      ? isActive
        ? `${playerName(publicData.activePlayerId)} kontynuuje atak. Wybierz kolejnego przeciwnika.`
        : `${playerName(publicData.activePlayerId)} wybiera przeciwnika.`
      : isActive
        ? 'Wybierz sąsiadujące terytorium, które chcesz zaatakować.'
        : `${playerName(publicData.activePlayerId)} wybiera przeciwnika.`;
  }
  if (state === 'DUEL_PREPARATION') {
    title = duel?.attackerId === authenticatedPlayerId || duel?.defenderId === authenticatedPlayerId ? 'Przygotuj się do pojedynku' : 'Za chwilę pojedynek';
    description = `${playerName(duel?.attackerId)} kontra ${playerName(duel?.defenderId)} · Kategoria: ${categoryName}`;
  }
  if (state === 'DUEL_ACTIVE' || state === 'DUEL_PAUSED') {
    title = getGamePhaseLabel(state);
    description = state === 'DUEL_PAUSED'
      ? 'Pojedynek został zatrzymany przez prowadzącego.'
      : duel?.currentQuestion?.prompt || 'Czekamy na pytanie.';
  }
  if (state === 'DUEL_COMPLETE') {
    title = getGamePhaseLabel(state);
    description = `Zwycięzca: ${playerName(duel?.result?.winnerId)}`;
  }
  if (state === 'CONTINUE_DECISION') {
    title = getGamePhaseLabel(state);
    description = 'Czy zwycięzca chce zaatakować kolejne terytorium?';
  }
  if (state === 'GAME_COMPLETE') {
    title = 'Koniec gry';
    description = `Zwycięzca: ${playerName(publicData.winnerId)}.`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md bg-slate-800 rounded-xl border-t-4 border-cyan-500 p-7 text-center">
        <h1 className="text-3xl font-bold text-cyan-400 mb-4">{title}</h1>
        <p className="text-gray-200 text-lg mb-6">{description}</p>
        {(state === 'DUEL_ACTIVE' || state === 'DUEL_PAUSED') && (
          <QuestionMediaView media={duel?.currentQuestion?.media} variant="player" />
        )}

        {state === 'CHALLENGE_SELECTION' && isActive && (
          <div className="space-y-3">
            {opponents.map((opponent: any) => (
              <button
                key={`${opponent.playerId}:${opponent.territoryId}`}
                disabled={busy}
                onClick={() => invoke('selectChallengeOpponent', {
                  opponentId: opponent.playerId,
                  territoryId: opponent.territoryId,
                })}
                className="w-full px-5 py-3 bg-cyan-600 rounded disabled:opacity-50 text-left"
              >
                <span className="block font-bold">{opponent.nickname}</span>
                <span className="block text-sm">Kategoria: {opponent.categoryName}</span>
                {Number.isInteger(opponent.row) && Number.isInteger(opponent.col) && (
                  <span className="block text-xs text-cyan-100">Pole: {opponent.row + 1}, {opponent.col + 1}</span>
                )}
              </button>
            ))}
            {opponents.length === 0 && <p className="text-amber-300">Brak dostępnych przeciwników</p>}
          </div>
        )}

        {state === 'CONTINUE_DECISION' && isActive && (
          <div className="flex flex-col gap-3">
            <button disabled={busy} onClick={() => invoke('submitContinueDecision', { payload: { decision: 'CONTINUE' } })} className="px-5 py-3 bg-green-600 rounded font-bold">Kontynuuj atak</button>
            <button disabled={busy} onClick={() => invoke('submitContinueDecision', { payload: { decision: 'RETURN_TO_DRAW' } })} className="px-5 py-3 bg-slate-600 rounded font-bold">Zakończ serię i wróć do losowania</button>
          </div>
        )}

        {state === 'GAME_COMPLETE' && <a href={`/results/${sessionId}`} className="inline-block px-6 py-3 bg-cyan-600 rounded font-bold">Zobacz wyniki</a>}
        {error && <p role="alert" className="mt-5 text-red-300">{error}</p>}
      </div>
    </div>
  );
}
