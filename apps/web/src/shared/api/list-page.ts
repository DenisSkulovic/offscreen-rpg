/** Flatten infinite pages in order, dropping duplicate ids (stable first-seen). */
export function flattenUniqueById<T extends { id: string }>(
  pages: ReadonlyArray<{ items: readonly T[] }> | undefined,
): T[] {
  if (!pages || pages.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const items: T[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}
