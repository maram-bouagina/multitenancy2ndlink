'use client';

import { useDeferredValue, useState } from 'react';
import { ArrowDown, ArrowUp, Link2, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Product, ProductRelation, ProductRelationType } from '@/lib/types';
import { useProducts } from '@/lib/hooks/use-api';

type ProductRelationEditorProps = {
  storeId: string;
  currentProductId: string;
  relationType: ProductRelationType;
  title: string;
  description: string;
  searchPlaceholder: string;
  emptyState: string;
  noMatches: string;
  relations: ProductRelation[];
  onChange: (relations: ProductRelation[]) => void;
};

export function ProductRelationEditor({
  storeId,
  currentProductId,
  relationType,
  title,
  description,
  searchPlaceholder,
  emptyState,
  noMatches,
  relations,
  onChange,
}: ProductRelationEditorProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const { data: productResults } = useProducts(storeId, {
    search: deferredSearch || undefined,
    limit: 12,
    sort_by: 'newest',
  });

  const selectedIds = new Set(relations.map((relation) => relation.related_product_id));
  const availableProducts = (productResults?.data ?? []).filter(
    (product) => product.id !== currentProductId && !selectedIds.has(product.id)
  );

  const syncPositions = (items: ProductRelation[]) => items.map((item, index) => ({ ...item, position: index }));

  const addProduct = (product: Product) => {
    onChange(syncPositions([
      ...relations,
      {
        related_product_id: product.id,
        related_product: product,
        relation_type: relationType,
        position: relations.length,
      },
    ]));
    setSearch('');
  };

  const removeProduct = (relatedProductId: string) => {
    onChange(syncPositions(relations.filter((relation) => relation.related_product_id !== relatedProductId)));
  };

  const moveProduct = (relatedProductId: string, direction: 'up' | 'down') => {
    const currentIndex = relations.findIndex((relation) => relation.related_product_id === relatedProductId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= relations.length) {
      return;
    }

    const next = [...relations];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(syncPositions(next));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-4 w-4" />
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="pl-9" />
        </div>

        <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-gray-100 p-2">
          {availableProducts.length === 0 ? (
            <p className="px-2 py-3 text-sm text-gray-500">{noMatches}</p>
          ) : (
            availableProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.title}</p>
                  <p className="text-xs text-gray-500">/{product.slug}</p>
                </div>
                <Button type="button" variant="outline" size="xs" onClick={() => addProduct(product)}>
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            ))
          )}
        </div>

        {relations.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyState}</p>
        ) : (
          <div className="space-y-2">
            {relations.map((relation, index) => (
              <div key={`${relation.related_product_id}-${relation.relation_type}`} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{relation.related_product?.title ?? relation.related_product_id}</p>
                  <p className="text-xs text-gray-500">/{relation.related_product?.slug ?? relation.related_product_id}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => moveProduct(relation.related_product_id, 'up')}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" disabled={index === relations.length - 1} onClick={() => moveProduct(relation.related_product_id, 'down')}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeProduct(relation.related_product_id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}