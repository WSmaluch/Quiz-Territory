import { categoryCatalogFromPublicState, getGamePhaseLabel, resolveCategoryName } from 'shared';
import QuestionMediaView from '../../components/QuestionMediaView';

export default function DisplayGameView({ publicData, players }: any) {
  const state = publicData.state;
  const duel = publicData.duel;
  const playerName = (id?: string) => id ? players[id]?.nickname || id : '—';
  const categoryName = resolveCategoryName(duel?.categoryId, categoryCatalogFromPublicState(publicData));

  let title = getGamePhaseLabel(state);
  let description = 'Gra trwa.';
  if (state === 'PLAYER_DRAW') { title = 'Losowanie gracza'; description = 'Za chwilę poznamy atakującego.'; }
  if (state === 'CHALLENGE_SELECTION') { title = 'Wybór przeciwnika'; description = `${playerName(publicData.activePlayerId)} wybiera sąsiednie terytorium.`; }
  if (state === 'DUEL_PREPARATION') { title = 'Przygotowanie pojedynku'; description = `${playerName(duel?.attackerId)} kontra ${playerName(duel?.defenderId)} · Kategoria: ${categoryName}`; }
  if (state === 'DUEL_ACTIVE' || state === 'DUEL_PAUSED') { title = getGamePhaseLabel(state); description = state === 'DUEL_PAUSED' ? 'Pojedynek został zatrzymany przez prowadzącego.' : duel?.currentQuestion?.prompt || 'Czekamy na pytanie.'; }
  if (state === 'DUEL_COMPLETE') { title = getGamePhaseLabel(state); description = `Zwycięzca: ${playerName(duel?.result?.winnerId)}`; }
  if (state === 'CONTINUE_DECISION') { title = getGamePhaseLabel(state); description = 'Czy zwycięzca chce zaatakować kolejne terytorium?'; }
  if (state === 'GAME_COMPLETE') { title = 'Koniec gry'; description = `Zwycięzca: ${playerName(publicData.winnerId)}.`; }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-10 text-center">
      <div className="text-cyan-400 uppercase tracking-[0.3em] mb-5">Etap gry</div>
      <h1 className="text-7xl font-bold mb-10">{title}</h1>
      <div className="text-4xl max-w-5xl">{description}</div>
      {(state === 'DUEL_ACTIVE' || state === 'DUEL_PAUSED') && (
        <div className="w-full max-w-6xl"><QuestionMediaView media={duel?.currentQuestion?.media} variant="display" /></div>
      )}
      {state === 'GAME_COMPLETE' && <div className="text-9xl mt-10">🏆</div>}
    </div>
  );
}
