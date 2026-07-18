import { categoryCatalogFromPublicState, resolveCategoryName } from 'shared';

export default function BoardCategorySummary({ publicData, players, ownerId }: {
  publicData: any;
  players: Record<string, any>;
  ownerId?: string;
}) {
  const catalog = categoryCatalogFromPublicState(publicData);
  const cells = Object.values(publicData?.board?.cells ?? {}) as any[];
  const seen = new Set<string>();
  const assignments = cells.filter((cell) => {
    if (!cell.currentOwnerId || (ownerId && cell.currentOwnerId !== ownerId)) return false;
    const key = `${cell.currentOwnerId}:${cell.categoryId ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (assignments.length === 0) return null;

  return (
    <div className="mt-6 grid gap-2" aria-label="Kategorie na planszy">
      {assignments.map((cell) => (
        <div key={`${cell.currentOwnerId}:${cell.categoryId ?? ''}`} className="rounded-lg bg-slate-900/70 px-4 py-3 text-gray-200">
          <strong>{players[cell.currentOwnerId]?.nickname ?? 'Gracz'}</strong>
          <span>: Kategoria: {resolveCategoryName(cell.categoryId, catalog)}</span>
        </div>
      ))}
    </div>
  );
}
