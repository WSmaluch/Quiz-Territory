export type PublicCategoryMetadata = {
  id: string;
  name: string;
};

export type PublicCategoryCatalog = Record<string, PublicCategoryMetadata>;

export function buildPublicCategoryCatalog(
  categories: ReadonlyArray<{ id: string; name: string }>,
): PublicCategoryCatalog {
  return Object.fromEntries(
    categories.map(({ id, name }) => [id, { id, name }]),
  );
}

export function resolveCategoryName(
  categoryId: string | null | undefined,
  catalog: Record<string, { name: string }> | null | undefined,
): string {
  if (!categoryId) return 'Brak kategorii';
  return catalog?.[categoryId]?.name ?? 'Nieznana kategoria';
}

export function categoryCatalogFromPublicState(publicState: {
  categoryCatalog?: PublicCategoryCatalog | null;
  categorySelection?: {
    availableCategories?: Array<{ id: string; name: string }> | null;
  } | null;
} | null | undefined): PublicCategoryCatalog {
  if (publicState?.categoryCatalog) return publicState.categoryCatalog;
  return buildPublicCategoryCatalog(publicState?.categorySelection?.availableCategories ?? []);
}
