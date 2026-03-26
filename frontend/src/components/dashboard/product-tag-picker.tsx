'use client';

import { useDeferredValue, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag } from '@/lib/types';

type ProductTagPickerProps = {
  tags: Tag[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  title: string;
  description: string;
  searchPlaceholder: string;
  selectedLabel: string;
  emptyState: string;
  noMatches: string;
};

export function ProductTagPicker({
  tags,
  selectedIds,
  onChange,
  title,
  description,
  searchPlaceholder,
  selectedLabel,
  emptyState,
  noMatches,
}: ProductTagPickerProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const selectedTags = tags.filter((tag) => selectedIds.includes(tag.id));
  const availableTags = tags.filter((tag) => !selectedIds.includes(tag.id));
  const filteredTags = deferredSearch
    ? availableTags.filter((tag) => tag.name.toLowerCase().includes(deferredSearch) || tag.slug.toLowerCase().includes(deferredSearch))
    : availableTags;

  const addTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      return;
    }
    onChange([...selectedIds, tagId]);
    setSearch('');
  };

  const removeTag = (tagId: string) => {
    onChange(selectedIds.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyState}</p>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{selectedLabel}</p>
            {selectedTags.length === 0 ? (
              <p className="text-sm text-gray-500">{noMatches}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="h-auto gap-2 px-2 py-1 text-xs">
                    <span>{tag.name}</span>
                    <button type="button" onClick={() => removeTag(tag.id)} className="rounded-full text-gray-500 hover:text-gray-900">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-gray-100 p-2">
            {filteredTags.length === 0 ? (
              <p className="px-2 py-3 text-sm text-gray-500">{noMatches}</p>
            ) : (
              filteredTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tag.name}</p>
                    <p className="text-xs text-gray-500">{tag.slug}</p>
                  </div>
                  <Button type="button" variant="outline" size="xs" onClick={() => addTag(tag.id)}>
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}