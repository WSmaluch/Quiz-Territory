export const GAME_PHASE_LABELS: Readonly<Record<string, string>> = {
  DRAFT: 'Przygotowanie gry',
  LOBBY: 'Poczekalnia',
  LOBBY_CLOSED: 'Poczekalnia zamknięta',
  CATEGORY_SELECTION: 'Wybór kategorii',
  BOARD_REVEAL: 'Prezentacja planszy',
  PLAYER_DRAW: 'Losowanie gracza',
  CHALLENGE_SELECTION: 'Wybór przeciwnika',
  DUEL_PREPARATION: 'Przygotowanie pojedynku',
  DUEL_ACTIVE: 'Pojedynek w toku',
  DUEL_PAUSED: 'Pojedynek wstrzymany',
  DUEL_COMPLETE: 'Pojedynek zakończony',
  TERRITORY_TRANSFER: 'Przejęcie terytorium',
  CONTINUE_DECISION: 'Decyzja zwycięzcy',
  GAME_COMPLETE: 'Koniec gry',
  GAME_SUSPENDED: 'Gra wstrzymana',
  ABORTED: 'Gra przerwana',
};

export function getGamePhaseLabel(phase: string | null | undefined): string {
  if (!phase) return 'Nieznany etap gry';
  return GAME_PHASE_LABELS[phase] ?? 'Nieznany etap gry';
}
