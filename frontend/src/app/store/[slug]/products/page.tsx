'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, SlidersHorizontal, X, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts, getCategories } from '@/lib/api/storefront-client';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { ProductPublic, CategoryPublic, PaginatedProducts } from '@/lib/types/storefront';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
}

/* ── Product card ────────────────────────────────────────────────────────── */

function ProductCard({ product, slug }: { product: ProductPublic; slug: string }) {
  const image = product.images?.[0];
  return (
    <Link
      href={`/store/${slug}/products/${product.slug}`}
      className="group flex flex-col rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {image ? (
          <Image
            src={resolveMediaUrl(image.url_medium || image.url)}
            alt={image.alt_text || product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <Tag className="w-10 h-10" />
          </div>
        )}
        {product.is_on_sale && (
          <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            Promo
          </span>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white">
              Épuisé
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        {product.brand && (
          <p className="text-xs text-gray-400 uppercase tracking-wide">{product.brand}</p>
        )}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{product.title}</h3>
        {product.category && (
          <p className="text-xs text-gray-400">{product.category.name}</p>
        )}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-base font-bold text-gray-900">
            {formatPrice(product.effective_price, product.currency)}
          </span>
          {product.is_on_sale && (
            <span className="text-sm line-through text-gray-400">
              {formatPrice(product.price, product.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Category tree ───────────────────────────────────────────────────────── */

function CategoryTree({
  categories,
  selectedId,
  onSelect,
}: {
  categories: CategoryPublic[];
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <ul className="space-y-0.5 text-sm">
      <li>
        <button
          onClick={() => onSelect(undefined)}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
            !selectedId ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Toutes les catégories
        </button>
      </li>
      {categories.map((cat) => (
        <li key={cat.id}>
          <button
            onClick={() => onSelect(cat.id)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              selectedId === cat.id
                ? 'bg-gray-100 font-medium text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
          {cat.children && cat.children.length > 0 && (
            <ul className="ml-4 mt-0.5 space-y-0.5">
              {cat.children.map((child) => (
                <li key={child.id}>
                  <button
                    onClick={() => onSelect(child.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-md transition-colors text-xs ${
                      selectedId === child.id
                        ? 'bg-gray-100 font-medium text-gray-900'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {child.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function ProductsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug;

  // Filter state from URL
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(
    searchParams.get('category_id') ?? undefined,
  );
  const [priceMin, setPriceMin] = useState(searchParams.get('price_min') ?? '');
  const [priceMax, setPriceMax] = useState(searchParams.get('price_max') ?? '');
  const [inStock, setInStock] = useState(searchParams.get('in_stock') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [categories, setCategories] = useState<CategoryPublic[]>([]);
  const [result, setResult] = useState<PaginatedProducts | null | undefined>(undefined);

  // Fetch categories once
  useEffect(() => {
    getCategories(slug).then(setCategories).catch(() => {});
  }, [slug]);

  // Fetch products whenever filters change
  useEffect(() => {
    let cancelled = false;
    getProducts(slug, {
      search: search || undefined,
      category_id: categoryId,
      price_min: priceMin ? Number(priceMin) : undefined,
      price_max: priceMax ? Number(priceMax) : undefined,
      in_stock: inStock || undefined,
      sort: sort as 'newest' | 'oldest' | 'price_asc' | 'price_desc',
      page,
      limit: 20,
    })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch(() => { if (!cancelled) setResult(null); });
    return () => { cancelled = true; };
  }, [slug, search, categoryId, priceMin, priceMax, inStock, sort, page]);

  // Sync URL with filters
  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (categoryId) p.set('category_id', categoryId);
    if (priceMin) p.set('price_min', priceMin);
    if (priceMax) p.set('price_max', priceMax);
    if (inStock) p.set('in_stock', 'true');
    if (sort !== 'newest') p.set('sort', sort);
    if (page > 1) p.set('page', String(page));
    router.replace(`/store/${slug}/products?${p.toString()}`, { scroll: false });
  }, [slug, search, categoryId, priceMin, priceMax, inStock, sort, page, router]);

  const resetFilters = () => {
    setSearch('');
    setCategoryId(undefined);
    setPriceMin('');
    setPriceMax('');
    setInStock(false);
    setSort('newest');
    setPage(1);
  };

  const activeFiltersCount = [
    search,
    categoryId,
    priceMin,
    priceMax,
    inStock,
  ].filter(Boolean).length;

  /* ── Sidebar ──────────────────────────────────────────────────────────── */
  const Sidebar = (
    <aside className="space-y-6">
      {/* Search */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
          Rechercher
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Titre, marque…"
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
            Catégories
          </label>
          <CategoryTree
            categories={categories}
            selectedId={categoryId}
            onSelect={(id) => { setCategoryId(id); setPage(1); }}
          />
        </div>
      )}

      {/* Price range */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
          Prix (€)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={priceMin}
            onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
            placeholder="Min"
            min={0}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <input
            type="number"
            value={priceMax}
            onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
            placeholder="Max"
            min={0}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => { setInStock(e.target.checked); setPage(1); }}
            className="rounded border-gray-300 w-4 h-4"
          />
          <span className="text-sm text-gray-700">En stock uniquement</span>
        </label>
      </div>

      {/* Reset */}
      {activeFiltersCount > 0 && (
        <button
          onClick={resetFilters}
          className="w-full text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg py-2 transition-colors"
        >
          Réinitialiser les filtres ({activeFiltersCount})
        </button>
      )}
    </aside>
  );

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-gray-400"
          >
            <option value="newest">Les plus récents</option>
            <option value="oldest">Les plus anciens</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>

          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white md:hidden"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-gray-900 text-white text-xs w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar — desktop always visible, mobile conditional */}
        <div className={`w-64 shrink-0 hidden md:block`}>{Sidebar}</div>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-6 overflow-y-auto shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-semibold text-gray-900">Filtres</h2>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {Sidebar}
            </div>
          </div>
        )}

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {/* Results count */}
          {result && (
            <p className="text-sm text-gray-500 mb-4">
              {result.total} produit{result.total !== 1 ? 's' : ''}
              {search ? ` pour « ${search} »` : ''}
            </p>
          )}

          {result === undefined && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 animate-pulse aspect-[3/4]" />
              ))}
            </div>
          )}

          {result === null || (result != null && result.products.length === 0) ? (
            <div className="py-24 text-center text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">Aucun produit trouvé</p>
              <p className="text-sm mt-1">Essayez de modifier vos filtres.</p>
              <button onClick={resetFilters} className="mt-6 text-sm text-blue-600 hover:underline">
                Réinitialiser
              </button>
            </div>
          ) : null}

          {result != null && result.products.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {result.products.map((p) => (
                  <ProductCard key={p.id} product={p} slug={slug} />
                ))}
              </div>

              {/* Pagination */}
              {result.pages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((v) => Math.max(1, v - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: result.pages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - page) <= 2)
                    .map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                          p === page
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                  <button
                    onClick={() => setPage((v) => Math.min(result.pages, v + 1))}
                    disabled={page === result.pages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
