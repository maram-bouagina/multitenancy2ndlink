import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  Tag,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Ruler,
  Weight,
  Clock,
} from 'lucide-react';
import { getProduct } from '@/lib/api/storefront-client';
import { StorefrontProductImageGallery } from '@/components/storefront/product-image-gallery';
import { StorefrontProductActions } from '@/components/storefront/product-actions';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { ProductPublic } from '@/lib/types/storefront';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Stock badge ─────────────────────────────────────────────────────────── */

function StockBadge({ product }: { product: ProductPublic }) {
  if (!product.track_stock) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
        <CheckCircle className="w-3.5 h-3.5" />
        Disponible
      </span>
    );
  }
  if (product.stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1">
        <XCircle className="w-3.5 h-3.5" />
        Épuisé
      </span>
    );
  }
  if (product.low_stock_threshold !== undefined && product.stock <= product.low_stock_threshold) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
        <AlertCircle className="w-3.5 h-3.5" />
        Plus que {product.stock} en stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
      <CheckCircle className="w-3.5 h-3.5" />
      En stock ({product.stock})
    </span>
  );
}

/* ── Related product card ────────────────────────────────────────────────── */

function RelatedCard({ product, slug }: { product: ProductPublic; slug: string }) {
  const image = product.images?.[0];
  return (
    <Link
      href={`/store/${slug}/products/${product.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden transition-all"
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
            <Tag className="w-8 h-8" />
          </div>
        )}
        {product.is_on_sale && (
          <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            Promo
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="text-sm font-medium line-clamp-2" style={{ color: 'var(--sf-text-primary)' }}>{product.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold" style={{ color: 'var(--sf-text-primary)' }}>
            {formatPrice(product.effective_price, product.currency)}
          </span>
          {product.is_on_sale && (
            <span className="text-xs line-through" style={{ color: 'var(--sf-text-muted)' }}>
              {formatPrice(product.price, product.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function RelatedSection({
  title,
  products,
  slug,
}: {
  title: string;
  products: ProductPublic[];
  slug: string;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 first:mt-20">
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--sf-text-primary)' }}>{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <RelatedCard key={product.id} product={product} slug={slug} />
        ))}
      </div>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;

  try {
    const detail = await getProduct(slug, productSlug);
    return {
      title: detail.product.title,
      description: detail.product.description?.slice(0, 160) ?? `Découvrez ${detail.product.title}.`,
    };
  } catch {
    return {
      title: 'Produit',
      description: 'Découvrez ce produit dans la boutique.',
    };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;

  let detail;
  try {
    detail = await getProduct(slug, productSlug);
  } catch {
    notFound();
  }

  const { product, related, upsell_products = [], cross_sell_products = [] } = detail;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm mb-8" style={{ color: 'var(--sf-text-muted)' }}>
        <Link href={`/store/${slug}`}>
          Accueil
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/store/${slug}/products`}>
          Produits
        </Link>
        {product.category && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/store/${slug}/categories/${product.category.slug}`}
              className=""
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium truncate max-w-50" style={{ color: 'var(--sf-text-primary)' }}>{product.title}</span>
      </nav>

      {/* ── Main layout ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left — Gallery */}
        <StorefrontProductImageGallery images={product.images} title={product.title} />

        {/* Right — Product info */}
        <div className="flex flex-col gap-6">
          {/* Brand + title */}
          <div>
            {product.brand && (
              <p className="text-sm font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--sf-text-muted)' }}>
                {product.brand}
              </p>
            )}
            <h1 className="text-3xl font-bold leading-tight" style={{ color: 'var(--sf-text-primary)' }}>{product.title}</h1>
            {product.sku && (
              <p className="text-xs mt-1" style={{ color: 'var(--sf-text-muted)' }}>Réf: {product.sku}</p>
            )}
          </div>

          {/* Pricing */}
          <div className="flex items-end gap-4">
            <div>
              <span className="text-4xl font-extrabold" style={{ color: 'var(--sf-text-primary)' }}>
                {formatPrice(product.effective_price, product.currency)}
              </span>
              {product.is_on_sale && (
                <span className="ml-3 text-xl line-through" style={{ color: 'var(--sf-text-muted)' }}>
                  {formatPrice(product.price, product.currency)}
                </span>
              )}
            </div>
            {product.is_on_sale && (
              <span className="rounded-full bg-red-500 text-white text-xs font-bold px-2.5 py-1">
                {Math.round(((product.price - product.effective_price) / product.price) * 100)}% OFF
              </span>
            )}
          </div>

          {/* Sale countdown warning */}
          {product.is_on_sale && product.sale_end && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-4 py-2.5 text-sm text-orange-700">
              <Clock className="w-4 h-4 shrink-0" />
              Offre valable jusqu&apos;au {formatDate(product.sale_end)}
            </div>
          )}

          {/* Stock */}
          <StockBadge product={product} />

          {/* Description */}
          {product.description && (
            <div className="border-t pt-5">
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--sf-text-primary)' }}>Description</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--sf-text-secondary)' }}>
                {product.description}
              </p>
            </div>
          )}

          <StorefrontProductActions inStock={product.in_stock} />

          {/* Product specs table */}
          {(product.weight || product.dimensions || product.tax_class || product.category) && (
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--sf-border)' }}>
              <div className="px-4 py-3 border-b" style={{ backgroundColor: 'var(--sf-surface-alt)', borderColor: 'var(--sf-border)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--sf-text-secondary)' }}>Caractéristiques</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {product.category && (
                    <tr className="border-b" style={{ borderColor: 'var(--sf-border)' }}>
                      <td className="px-4 py-2.5 w-1/3" style={{ color: 'var(--sf-text-secondary)' }}>Catégorie</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--sf-text-primary)' }}>
                        <Link
                          href={`/store/${slug}/categories/${product.category.slug}`}
                          className="hover:underline"
                          style={{ color: 'var(--sf-primary)' }}
                        >
                          {product.category.name}
                        </Link>
                      </td>
                    </tr>
                  )}
                  {product.weight && (
                    <tr className="border-b" style={{ borderColor: 'var(--sf-border)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--sf-text-secondary)' }}>
                        <span className="flex items-center gap-1.5">
                          <Weight className="w-3.5 h-3.5" /> Poids
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--sf-text-primary)' }}>{product.weight} kg</td>
                    </tr>
                  )}
                  {product.dimensions && (
                    <tr className="border-b" style={{ borderColor: 'var(--sf-border)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--sf-text-secondary)' }}>
                        <span className="flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5" /> Dimensions
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--sf-text-primary)' }}>{product.dimensions}</td>
                    </tr>
                  )}
                  {product.sku && (
                    <tr className="border-b last:border-b-0" style={{ borderColor: 'var(--sf-border)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--sf-text-secondary)' }}>
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> SKU
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--sf-text-primary)' }}>{product.sku}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Collections membership */}
          {product.collections && product.collections.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--sf-text-secondary)' }}>Collections</h2>
              <div className="flex flex-wrap gap-2">
                {product.collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/store/${slug}/collections/${col.slug}`}
                    className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                    style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-secondary)' }}
                  >
                    {col.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Related products ───────────────────────────────────────────── */}
      <RelatedSection title="Vous aimerez aussi" products={upsell_products} slug={slug} />
      <RelatedSection title="À associer avec" products={cross_sell_products} slug={slug} />
      {related.length > 0 && upsell_products.length === 0 && cross_sell_products.length === 0 ? (
        <RelatedSection title="Produits similaires" products={related} slug={slug} />
      ) : null}
    </div>
  );
}
