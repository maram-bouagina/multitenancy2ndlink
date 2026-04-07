'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildPaginationItems } from '@/lib/pagination';

interface ListPaginationProps {
  page: number;
  pageCount: number;
  summary: string;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  disabled?: boolean;
}

export function ListPagination({
  page,
  pageCount,
  summary,
  onPageChange,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  disabled = false,
}: ListPaginationProps) {
  const items = buildPaginationItems(page, pageCount);

  return (
    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-gray-500">{summary}</p>
      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          className="gap-1"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          {previousLabel}
        </Button>

        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-gray-400">
              ...
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'default' : 'outline'}
              size="sm"
              className="min-w-9 px-3"
              disabled={disabled || item === page}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= pageCount}
          className="gap-1"
          onClick={() => onPageChange(page + 1)}
        >
          {nextLabel}
          <ChevronRight className="h-4 w-4" />
        </Button>
        </nav>
      ) : null}
    </div>
  );
}