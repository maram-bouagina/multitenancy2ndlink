'use client';

import { Button } from '@/components/ui/button';

interface ListPaginationProps {
  page: number;
  pageCount: number;
  summary: string;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
}

export function ListPagination({
  page,
  pageCount,
  summary,
  onPageChange,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: ListPaginationProps) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-gray-500">{summary}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {previousLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}