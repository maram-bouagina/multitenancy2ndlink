'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { CategoryPublic } from '@/lib/types/storefront';

type ProductSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc';

interface ProductFiltersState {
  search: string;
  categoryId?: string;
  priceMin: string;
  priceMax: string;
  inStock: boolean;
  sort: ProductSort;
}

function buildProductsHref(slug: string, filters: ProductFiltersState) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.categoryId) params.set('category_id', filters.categoryId);
  if (filters.priceMin) params.set('price_min', filters.priceMin);
  if (filters.priceMax) params.set('price_max', filters.priceMax);
  if (filters.inStock) params.set('in_stock', 'true');
  if (filters.sort !== 'newest') params.set('sort', filters.sort);

  const query = params.toString();
  return query ? `/store/${slug}/products?${query}` : `/store/${slug}/products`;
}

function CategoryTree({
  categories,
  selectedId,
  onSelect,
  depth = 0,
}: {
  categories: CategoryPublic[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  depth?: number;
}) {
  return (
    <ul className={depth === 0 ? 'space-y-0.5 text-sm' : 'ml-4 mt-0.5 space-y-0.5'}>
      {depth === 0 ? (
        <li>
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${!selectedId ? 'font-medium' : ''}`}
            style={{ backgroundColor: !selectedId ? 'var(--sf-surface-alt)' : 'transparent', color: !selectedId ? 'var(--sf-text-primary)' : 'var(--sf-text-secondary)' }}
          >
            Toutes les catégories
          </button>
        </li>
      ) : null}
      {categories.map((cat) => {
        const isSelected = selectedId === cat.id;
        return (
          <li key={cat.id}>
            <button
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`w-full text-left rounded-md transition-colors ${depth === 0 ? 'px-3 py-2' : 'px-3 py-1.5 text-xs'} ${isSelected ? 'font-medium' : ''}`}
              style={{ backgroundColor: isSelected ? 'var(--sf-surface-alt)' : 'transparent', color: isSelected ? 'var(--sf-text-primary)' : 'var(--sf-text-secondary)' }}
            >
              {cat.name}
            </button>
            {cat.children && cat.children.length > 0 ? (
              <CategoryTree
                categories={cat.children}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function StorefrontProductsFiltersForm({
  slug,
  categories,
  initialFilters,
  onNavigate,
}: {
  slug: string;
  categories: CategoryPublic[];
  initialFilters: ProductFiltersState;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [categoryId, setCategoryId] = useState<string | undefined>(initialFilters.categoryId);
  const [priceMin, setPriceMin] = useState(initialFilters.priceMin);
  const [priceMax, setPriceMax] = useState(initialFilters.priceMax);
  const [inStock, setInStock] = useState(initialFilters.inStock);

  useEffect(() => {
    setSearch(initialFilters.search);
    setCategoryId(initialFilters.categoryId);
    setPriceMin(initialFilters.priceMin);
    setPriceMax(initialFilters.priceMax);
    setInStock(initialFilters.inStock);
  }, [initialFilters]);

  const activeFiltersCount = [search, categoryId, priceMin, priceMax, inStock].filter(Boolean).length;

  const navigate = (filters: ProductFiltersState) => {
    startTransition(() => {
      router.push(buildProductsHref(slug, filters), { scroll: false });
      onNavigate?.();
    });
  };

  const handleApply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ search, categoryId, priceMin, priceMax, inStock, sort: initialFilters.sort });
  };

  const handleReset = () => {
    const resetFilters: ProductFiltersState = {
      search: '',
      categoryId: undefined,
      priceMin: '',
      priceMax: '',
      inStock: false,
      sort: initialFilters.sort,
    };
    setSearch(resetFilters.search);
    setCategoryId(resetFilters.categoryId);
    setPriceMin(resetFilters.priceMin);
    setPriceMax(resetFilters.priceMax);
    setInStock(resetFilters.inStock);
    navigate(resetFilters);
  };

  return (
    <form onSubmit={handleApply} className="space-y-6">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--sf-text-muted)' }}>
          Rechercher
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sf-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Titre, slug, marque, sku…"
            className="w-full rounded-lg border pl-9 pr-10 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3" style={{ color: 'var(--sf-text-muted)' }} />
            </button>
          ) : null}
        </div>
      </div>

      {categories.length > 0 ? (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--sf-text-muted)' }}>
            Catégories
          </label>
          <CategoryTree
            categories={categories}
            selectedId={categoryId}
            onSelect={(id) => {
              setCategoryId(id);
              navigate({
                search,
                categoryId: id,
                priceMin,
                priceMax,
                inStock,
                sort: initialFilters.sort,
              });
            }}
          />
        </div>
      ) : null}

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--sf-text-muted)' }}>
          Prix (€)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={priceMin}
            onChange={(event) => setPriceMin(event.target.value)}
            placeholder="Min"
            min={0}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}
          />
          <input
            type="number"
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            placeholder="Max"
            min={0}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(event) => setInStock(event.target.checked)}
            className="rounded border-gray-300 w-4 h-4"
          />
          <span className="text-sm" style={{ color: 'var(--sf-text-secondary)' }}>En stock uniquement</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: 'var(--sf-primary)' }}
        >
          Appliquer
        </button>
        {activeFiltersCount > 0 ? (
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="rounded-lg border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)', backgroundColor: 'var(--sf-surface)' }}
          >
            Réinitialiser
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function StorefrontProductsSidebar(props: {
  slug: string;
  categories: CategoryPublic[];
  initialFilters: ProductFiltersState;
}) {
  return (
    <div className="w-64 shrink-0 hidden md:block">
      <StorefrontProductsFiltersForm {...props} />
    </div>
  );
}

export function StorefrontProductsToolbar(props: {
  slug: string;
  categories: CategoryPublic[];
  initialFilters: ProductFiltersState;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const activeFiltersCount = [
    props.initialFilters.search,
    props.initialFilters.categoryId,
    props.initialFilters.priceMin,
    props.initialFilters.priceMax,
    props.initialFilters.inStock,
  ].filter(Boolean).length;

  const navigateSort = (nextSort: ProductSort) => {
    router.push(
      buildProductsHref(props.slug, {
        ...props.initialFilters,
        sort: nextSort,
      }),
      { scroll: false },
    );
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <select
          value={props.initialFilters.sort}
          onChange={(event) => navigateSort(event.target.value as ProductSort)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}
        >
          <option value="newest">Les plus récents</option>
          <option value="oldest">Les plus anciens</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>

        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm md:hidden"
          style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-primary)' }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {activeFiltersCount > 0 ? (
            <span className="rounded-full text-white text-xs w-5 h-5 flex items-center justify-center" style={{ backgroundColor: 'var(--sf-primary)' }}>
              {activeFiltersCount}
            </span>
          ) : null}
        </button>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer les filtres"
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 p-6 overflow-y-auto shadow-xl" style={{ backgroundColor: 'var(--sf-surface)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold" style={{ color: 'var(--sf-text-primary)' }}>Filtres</h2>
              <button type="button" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--sf-text-secondary)' }} />
              </button>
            </div>
            <StorefrontProductsFiltersForm {...props} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}