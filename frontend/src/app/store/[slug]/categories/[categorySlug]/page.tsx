import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Tag, ArrowRight } from 'lucide-react';
import { getProducts, getCategories } from '@/lib/api/storefront-client';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { CategoryPublic, ProductPublic } from '@/lib/types/storefront';

export const dynamic = 'force-dynamic';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
}

function flattenCategories(cats: CategoryPublic[]): CategoryPublic[] {
  return cats.flatMap((c) => [c, ...flattenCategories(c.children ?? [])]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { slug, categorySlug } = await params;

  try {
    const categories = await getCategories(slug);
    const category = flattenCategories(categories).find((entry) => entry.slug === categorySlug);
    if (!category) {
      return {
        title: 'Catégorie',
        description: 'Parcourez les produits de cette catégorie.',
      };
    }

    return {
      title: category.name,
      description: category.description || `Parcourez les produits de la catégorie ${category.name}.`,
    };
  } catch {
    return {
      title: 'Catégorie',
      description: 'Parcourez les produits de cette catégorie.',
    };
  }
}

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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  const { slug, categorySlug } = await params;

  // Resolve categoryId from slug
  let categories: CategoryPublic[] = [];
  try {
    categories = await getCategories(slug);
  } catch {
    notFound();
  }

  const allCats = flattenCategories(categories);
  const category = allCats.find((c) => c.slug === categorySlug);
  if (!category) notFound();

  // Fetch products in this category (server-side, up to 48)
  const { products, total } = await getProducts(slug, {
    category_id: category.id,
    limit: 48,
    sort: 'newest',
  });

  // Subcategories
  const subcategories = category.children ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-8" style={{ color: 'var(--sf-text-muted)' }}>
        <Link href={`/store/${slug}`}>Accueil</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/store/${slug}/products`}>Produits</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium" style={{ color: 'var(--sf-text-primary)' }}>{category.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--sf-text-primary)' }}>{category.name}</h1>
        {category.description && (
          <p style={{ color: 'var(--sf-text-secondary)' }}>{category.description}</p>
        )}
        <p className="text-sm mt-2" style={{ color: 'var(--sf-text-muted)' }}>{total} produit{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--sf-text-muted)' }}>
            Sous-catégories
          </h2>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/store/${slug}/categories/${sub.slug}`}
                className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors"
                style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-secondary)' }}
              >
                {sub.name}
                <ArrowRight className="w-3 h-3" style={{ color: 'var(--sf-text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      {products.length === 0 ? (
        <div className="py-24 text-center" style={{ color: 'var(--sf-text-secondary)' }}>
          <Tag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--sf-text-muted)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--sf-text-primary)' }}>Aucun produit dans cette catégorie</p>
          <Link
            href={`/store/${slug}/products`}
            className="mt-6 inline-block text-sm hover:underline"
            style={{ color: 'var(--sf-primary)' }}
          >
            Voir tous les produits
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
