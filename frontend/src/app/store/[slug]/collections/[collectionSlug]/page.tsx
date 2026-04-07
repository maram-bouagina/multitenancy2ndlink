import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Tag } from 'lucide-react';
import { StorePagination } from '@/components/storefront/store-pagination';
import { getCollectionProducts } from '@/lib/api/storefront-client';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { ProductPublic } from '@/lib/types/storefront';

export const dynamic = 'force-dynamic';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; collectionSlug: string }>;
}): Promise<Metadata> {
  const { slug, collectionSlug } = await params;

  try {
    const data = await getCollectionProducts(slug, collectionSlug, 1, 1);
    const col = data.collection;
    return {
      title: col.meta_title || col.name,
      description: col.meta_description || col.description || `Découvrez les produits de la collection ${col.name}.`,
      ...(col.canonical_url ? { alternates: { canonical: col.canonical_url } } : {}),
      ...(col.noindex ? { robots: { index: false, follow: true } } : {}),
    };
  } catch {
    return {
      title: 'Collection',
      description: 'Découvrez les produits de cette collection.',
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

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; collectionSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug, collectionSlug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1);

  let data;
  try {
    data = await getCollectionProducts(slug, collectionSlug, page, 20);
  } catch {
    notFound();
  }

  if (!data) notFound();

  const { collection, products } = data;
  const buildPageHref = (nextPage: number) =>
    nextPage > 1
      ? `/store/${slug}/collections/${collectionSlug}?page=${nextPage}`
      : `/store/${slug}/collections/${collectionSlug}`;

  /* ── JSON-LD BreadcrumbList ──────────────────────────────────────── */
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${baseUrl}/store/${slug}` },
      { '@type': 'ListItem', position: 2, name: 'Produits', item: `${baseUrl}/store/${slug}/products` },
      { '@type': 'ListItem', position: 3, name: collection.name, item: `${baseUrl}/store/${slug}/collections/${collection.slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-8" style={{ color: 'var(--sf-text-muted)' }}>
        <Link href={`/store/${slug}`}>Accueil</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/store/${slug}/products`}>Produits</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium" style={{ color: 'var(--sf-text-primary)' }}>{collection.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--sf-text-muted)' }}>Collection</p>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--sf-text-primary)' }}>{collection.name}</h1>
          {collection.description && (
            <p className="max-w-2xl leading-7" style={{ color: 'var(--sf-text-secondary)' }}>{collection.description}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full px-4 py-2 font-medium" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-secondary)' }}>
              {products.total} produit{products.total !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full px-4 py-2 font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--sf-primary) 10%, transparent)', color: 'var(--sf-primary)' }}>
              Sélection éditoriale
            </span>
          </div>
        </div>

        <div className="relative aspect-4/3 overflow-hidden rounded-[2rem] border" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface-alt)' }}>
          {collection.image_url ? (
            <Image
              src={resolveMediaUrl(collection.image_url)}
              alt={collection.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--sf-text-muted)' }}>
              <Tag className="h-12 w-12" />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, transparent 30%, color-mix(in srgb, var(--sf-surface) 78%, black)) 100%)' }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.72)' }}>Sélection</p>
            <p className="mt-2 text-lg font-semibold text-white">Une vitrine éditoriale pour vos meilleurs produits</p>
          </div>
        </div>
      </div>

      {/* Products */}
      {products.products.length === 0 ? (
        <div className="py-24 text-center" style={{ color: 'var(--sf-text-secondary)' }}>
          <Tag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--sf-text-muted)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--sf-text-primary)' }}>Aucun produit dans cette collection</p>
          <Link
            href={`/store/${slug}/products`}
            className="mt-6 inline-block text-sm hover:underline"
            style={{ color: 'var(--sf-primary)' }}
          >
            Voir tous les produits
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.products.map((p) => (
              <ProductCard key={p.id} product={p} slug={slug} />
            ))}
          </div>

          <StorePagination
            page={page}
            pageCount={products.pages}
            summary={`Page ${page} sur ${products.pages}`}
            buildHref={buildPageHref}
            previousLabel="Précédent"
            nextLabel="Suivant"
          />
        </>
      )}
    </div>
  );
}
