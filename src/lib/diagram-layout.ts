export const CIRCUITS_PER_DIAGRAM_PAGE = 10;

/** Keep each circuit sheet within its page capacity; an empty panel still gets one sheet. */
export function paginateCircuitPages<T>(
  items: readonly T[],
  pageSize = CIRCUITS_PER_DIAGRAM_PAGE,
): T[][] {
  const size = Math.max(1, Math.floor(pageSize) || CIRCUITS_PER_DIAGRAM_PAGE);
  if (items.length === 0) return [[]];
  return Array.from({ length: Math.ceil(items.length / size) }, (_, page) =>
    items.slice(page * size, (page + 1) * size),
  );
}
