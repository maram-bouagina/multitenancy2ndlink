import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildPaginationItems } from '@/lib/pagination';

interface StorePaginationProps {
  page: number;
  pageCount: number;
  summary?: string;
  buildHref: (page: number) => string;
  previousLabel?: string;
  nextLabel?: string;
}

const baseButtonClass =
  'flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors';

export function StorePagination({
  page,
  pageCount,
  summary,
  buildHref,
  previousLabel = 'Precedent',
  nextLabel = 'Suivant',
}: StorePaginationProps) {
  const items = buildPaginationItems(page, pageCount);

  if (pageCount <= 1) {
    return null;
  }

  const resolvedSummary = summary ?? `Page ${page} sur ${pageCount}`;

  return (
    <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm" style={{ color: 'var(--sf-text-secondary)' }}>
        {resolvedSummary}
      </p>

      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            className={`${baseButtonClass} gap-1`}
            style={{
              borderColor: 'var(--sf-border)',
              backgroundColor: 'var(--sf-surface)',
              color: 'var(--sf-text-primary)',
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            {previousLabel}
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${baseButtonClass} gap-1 opacity-40`}
            style={{
              borderColor: 'var(--sf-border)',
              backgroundColor: 'var(--sf-surface)',
              color: 'var(--sf-text-primary)',
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            {previousLabel}
          </span>
        )}

        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-sm"
              style={{ color: 'var(--sf-text-muted)' }}
            >
              ...
            </span>
          ) : (
            <Link
              key={item}
              href={buildHref(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`${baseButtonClass} px-0`}
              style={
                item === page
                  ? {
                      borderColor: 'var(--sf-primary)',
                      backgroundColor: 'var(--sf-primary)',
                      color: '#fff',
                      width: '2.25rem',
                    }
                  : {
                      borderColor: 'var(--sf-border)',
                      backgroundColor: 'var(--sf-surface)',
                      color: 'var(--sf-text-secondary)',
                      width: '2.25rem',
                    }
              }
            >
              {item}
            </Link>
          )
        )}

        {page < pageCount ? (
          <Link
            href={buildHref(page + 1)}
            className={`${baseButtonClass} gap-1`}
            style={{
              borderColor: 'var(--sf-border)',
              backgroundColor: 'var(--sf-surface)',
              color: 'var(--sf-text-primary)',
            }}
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${baseButtonClass} gap-1 opacity-40`}
            style={{
              borderColor: 'var(--sf-border)',
              backgroundColor: 'var(--sf-surface)',
              color: 'var(--sf-text-primary)',
            }}
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </nav>
    </div>
  );
}