export type PaginationItem = number | 'ellipsis';

export function buildPaginationItems(
  currentPage: number,
  pageCount: number,
  siblingCount = 1
): PaginationItem[] {
  const safePageCount = Math.max(1, pageCount);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safePageCount);

  if (safePageCount <= 7) {
    return Array.from({ length: safePageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, safePageCount]);

  for (
    let page = safeCurrentPage - siblingCount;
    page <= safeCurrentPage + siblingCount;
    page += 1
  ) {
    if (page > 1 && page < safePageCount) {
      pages.add(page);
    }
  }

  if (safeCurrentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (safeCurrentPage >= safePageCount - 2) {
    pages.add(safePageCount - 1);
    pages.add(safePageCount - 2);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= safePageCount)
    .sort((left, right) => left - right);

  const items: PaginationItem[] = [];

  for (const page of sortedPages) {
    const previousPage = typeof items[items.length - 1] === 'number' ? items[items.length - 1] : undefined;

    if (typeof previousPage === 'number') {
      const gap = page - previousPage;
      if (gap === 2) {
        items.push(previousPage + 1);
      } else if (gap > 2) {
        items.push('ellipsis');
      }
    }

    items.push(page);
  }

  return items;
}