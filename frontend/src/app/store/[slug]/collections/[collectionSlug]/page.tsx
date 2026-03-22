import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Tag } from 'lucide-react';
import { getCollectionProducts } from '@/lib/api/storefront-client';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { ProductPublic } from '@/lib/types/storefront';

export const dynamic = 'force-dynamic';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
}

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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-8">
        <Link href={`/store/${slug}`} className="hover:text-gray-700">Accueil</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/store/${slug}/products`} className="hover:text-gray-700">Produits</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium">{collection.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Collection</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{collection.name}</h1>
        <p className="text-sm text-gray-400">
          {products.total} produit{products.total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Products */}
      {products.products.length === 0 ? (
        <div className="py-24 text-center text-gray-500">
          <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-700">Aucun produit dans cette collection</p>
          <Link
            href={`/store/${slug}/products`}
            className="mt-6 inline-block text-sm text-blue-600 hover:underline"
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

          {/* Pagination */}
          {products.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/store/${slug}/collections/${collectionSlug}?page=${page - 1}`}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                >
                  ← Précédent
                </Link>
              )}
              <span className="text-sm text-gray-500">
                Page {page} / {products.pages}
              </span>
              {page < products.pages && (
                <Link
                  href={`/store/${slug}/collections/${collectionSlug}?page=${page + 1}`}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                >
                  Suivant →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
