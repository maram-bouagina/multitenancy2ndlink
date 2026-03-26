import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts, getCategories } from '@/lib/api/storefront-client';
import { StorefrontProductsSidebar, StorefrontProductsToolbar } from '@/components/storefront/products-filters';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { ProductPublic, CategoryPublic, ProductFilters } from '@/lib/types/storefront';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function flattenCategories(cats: CategoryPublic[]): CategoryPublic[] {
  return cats.flatMap((cat) => [cat, ...flattenCategories(cat.children ?? [])]);
}

function buildPageHref(slug: string, filters: ProductFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category_id) params.set('category_id', filters.category_id);
  if (filters.price_min !== undefined) params.set('price_min', String(filters.price_min));
  if (filters.price_max !== undefined) params.set('price_max', String(filters.price_max));
  if (filters.in_stock) params.set('in_stock', 'true');
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return query ? `/store/${slug}/products?${query}` : `/store/${slug}/products`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const search = firstValue(resolvedSearchParams.search)?.trim();
  const categoryId = firstValue(resolvedSearchParams.category_id);

  try {
    const categories = await getCategories(slug);
    const categoryName = categoryId
      ? flattenCategories(categories).find((category) => category.id === categoryId)?.name
      : undefined;

    const titleParts = [categoryName ?? 'Produits'];
    if (search) {
      titleParts[0] = `${titleParts[0]} - Recherche: ${search}`;
    }

    return {
      title: titleParts[0],
      description: categoryName
        ? `Parcourez les produits de la catégorie ${categoryName}.`
        : 'Parcourez le catalogue public de la boutique.',
    };
  } catch {
    return {
      title: 'Produits',
      description: 'Parcourez le catalogue public de la boutique.',
    };
  }
}

/* ── Product card ────────────────────────────────────────────────────────── */

function ProductCard({ product, slug }: { product: ProductPublic; slug: string }) {
  const image = product.images?.[0];
  return (
    <Link
      href={`/store/${slug}/products/${product.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden transition-all duration-200"
      style={{ border: '1px solid var(--sf-border)', backgroundColor: 'var(--sf-surface)' }}
    >
      <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: 'var(--sf-surface-alt)' }}>
        {image ? (
          <Image
            src={resolveMediaUrl(image.url_medium || image.url)}
            alt={image.alt_text || product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--sf-text-muted)' }}>
            <Tag className="w-10 h-10" />
          </div>
        )}
        {product.is_on_sale && (
          <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            Promo
          </span>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--sf-surface) 70%, transparent)' }}>
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white">
              Épuisé
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        {product.brand && (
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--sf-text-muted)' }}>{product.brand}</p>
        )}
        <h3 className="text-sm font-medium line-clamp-2 flex-1" style={{ color: 'var(--sf-text-primary)' }}>{product.title}</h3>
        {product.category && (
          <p className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>{product.category.name}</p>
        )}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-base font-bold" style={{ color: 'var(--sf-text-primary)' }}>
            {formatPrice(product.effective_price, product.currency)}
          </span>
          {product.is_on_sale && (
            <span className="text-sm line-through" style={{ color: 'var(--sf-text-muted)' }}>
              {formatPrice(product.price, product.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const search = firstValue(resolvedSearchParams.search)?.trim() ?? '';
  const categoryId = firstValue(resolvedSearchParams.category_id) ?? undefined;
  const priceMin = firstValue(resolvedSearchParams.price_min) ?? '';
  const priceMax = firstValue(resolvedSearchParams.price_max) ?? '';
  const inStock = firstValue(resolvedSearchParams.in_stock) === 'true';
  const sort = (firstValue(resolvedSearchParams.sort) as ProductFilters['sort']) ?? 'newest';
  const page = parsePositiveInt(firstValue(resolvedSearchParams.page), 1);

  const filters: ProductFilters = {
    search: search || undefined,
    category_id: categoryId,
    price_min: priceMin ? Number(priceMin) : undefined,
    price_max: priceMax ? Number(priceMax) : undefined,
    in_stock: inStock || undefined,
    sort,
    page,
    limit: 20,
  };

  let result;
  try {
    result = await getProducts(slug, filters);
  } catch {
    notFound();
  }

  const categories = await getCategories(slug).catch(() => []);

  const initialFilters = {
    search,
    categoryId,
    priceMin,
    priceMax,
    inStock,
    sort,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--sf-text-primary)' }}>Produits</h1>
        <StorefrontProductsToolbar slug={slug} categories={categories} initialFilters={initialFilters} />
      </div>

      <div className="flex gap-8">
        <StorefrontProductsSidebar slug={slug} categories={categories} initialFilters={initialFilters} />
        <div className="flex-1 min-w-0">
          <p className="text-sm mb-4" style={{ color: 'var(--sf-text-secondary)' }}>
            {result.total} produit{result.total !== 1 ? 's' : ''}
            {search ? ` pour « ${search} »` : ''}
          </p>

          {result.products.length === 0 ? (
            <div className="py-24 text-center" style={{ color: 'var(--sf-text-secondary)' }}>
              <Tag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--sf-text-muted)' }} />
              <p className="text-lg font-medium" style={{ color: 'var(--sf-text-primary)' }}>Aucun produit trouvé</p>
              <p className="text-sm mt-1">Essayez de modifier vos filtres.</p>
              <Link href={`/store/${slug}/products`} className="mt-6 inline-block text-sm hover:underline" style={{ color: 'var(--sf-primary)' }}>
                Réinitialiser
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {result.products.map((product) => (
                  <ProductCard key={product.id} product={product} slug={slug} />
                ))}
              </div>

              {result.pages > 1 ? (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <Link
                    href={buildPageHref(slug, filters, Math.max(1, page - 1))}
                    aria-disabled={page === 1}
                    className={`p-2 rounded-lg border ${page === 1 ? 'pointer-events-none opacity-40' : ''}`}
                    style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-primary)', backgroundColor: 'var(--sf-surface)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>

                  {Array.from({ length: result.pages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - page) <= 2)
                    .map((p) => (
                      <Link
                        key={p}
                        href={buildPageHref(slug, filters, p)}
                        className="w-9 h-9 rounded-lg border text-sm font-medium transition-colors"
                        style={p === page ? { borderColor: 'var(--sf-primary)', backgroundColor: 'var(--sf-primary)', color: '#fff' } : { borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)', backgroundColor: 'var(--sf-surface)' }}
                      >
                        {p}
                      </Link>
                    ))}

                  <Link
                    href={buildPageHref(slug, filters, Math.min(result.pages, page + 1))}
                    aria-disabled={page === result.pages}
                    className={`p-2 rounded-lg border ${page === result.pages ? 'pointer-events-none opacity-40' : ''}`}
                    style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-primary)', backgroundColor: 'var(--sf-surface)' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
