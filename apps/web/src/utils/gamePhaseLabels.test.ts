import { describe, expect, it } from 'vitest';
import { GAME_PHASE_LABELS, getGamePhaseLabel } from 'shared';

const EXPECTED_LABELS = {
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

describe('polskie etykiety etapów gry', () => {
  it('zawiera jedną polską etykietę dla każdej fazy', () => {
    expect(GAME_PHASE_LABELS).toEqual(EXPECTED_LABELS);
    for (const [phase, label] of Object.entries(EXPECTED_LABELS)) {
      expect(getGamePhaseLabel(phase)).toBe(label);
    }
  });

  it.each([undefined, null, '', 'UNKNOWN_PHASE'])(
    'nie ujawnia technicznej wartości dla braku lub nieznanej fazy: %s',
    (phase) => expect(getGamePhaseLabel(phase)).toBe('Nieznany etap gry'),
  );
});
