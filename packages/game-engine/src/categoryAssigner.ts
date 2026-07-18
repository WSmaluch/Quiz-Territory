import seedrandom from 'seedrandom';
import { Category, CategoryOffer } from 'shared';

export function generateCategoryOffers(
  playerIds: string[],
  categories: Category[],
  seed: string
): Record<string, CategoryOffer[]> {
  const rng = seedrandom(seed);
  const offers: Record<string, CategoryOffer[]> = {};

  if (categories.length < 3) {
    throw new Error('Not enough categories available to generate offers. Minimum 3 required.');
  }

  // Shuffle categories deterministically
  const shuffledCategories = [...categories];
  for (let i = shuffledCategories.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledCategories[i], shuffledCategories[j]] = [shuffledCategories[j]!, shuffledCategories[i]!];
  }

  // Assign 3 unique categories to each player.
  // We try to give distinct categories to different players.
  // If we run out of unique categories, we just wrap around.
  let catIndex = 0;

  for (const playerId of playerIds) {
    const playerOffers: CategoryOffer[] = [];
    for (let i = 0; i < 3; i++) {
      const cat = shuffledCategories[catIndex % shuffledCategories.length]!;
      playerOffers.push({
        categoryId: cat.id,
        name: cat.name,
        description: cat.description,
        type: cat.type,
        difficulty: cat.difficulty,
      });
      catIndex++;
    }
    offers[playerId] = playerOffers;
  }

  return offers;
}
