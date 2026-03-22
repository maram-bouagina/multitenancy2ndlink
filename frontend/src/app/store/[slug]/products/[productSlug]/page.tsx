'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  Tag,
  ShoppingCart,
  Heart,
  Share2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Ruler,
  Weight,
  Clock,
} from 'lucide-react';
import { getProduct } from '@/lib/api/storefront-client';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { ProductDetail, ProductPublic, ProductImagePublic } from '@/lib/types/storefront';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Image gallery ───────────────────────────────────────────────────────── */

function ImageGallery({ images, title }: { images: ProductImagePublic[]; title: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300">
        <Tag className="w-20 h-20" />
      </div>
    );
  }

  const current = images[active];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden">
        <Image
          src={resolveMediaUrl(current.url_large || current.url_medium || current.url)}
          alt={current.alt_text || title}
          fill
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                i === active ? 'border-gray-900' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Image
                src={resolveMediaUrl(img.url_thumbnail || img.url)}
                alt={img.alt_text || `${title} ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
      className="group flex flex-col rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-md hover:border-gray-200 transition-all"
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
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{product.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-gray-900">
            {formatPrice(product.effective_price, product.currency)}
          </span>
          {product.is_on_sale && (
            <span className="text-xs line-through text-gray-400">
              {formatPrice(product.price, product.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function ProductDetailPage() {
  const params = useParams<{ slug: string; productSlug: string }>();
  const slug = params.slug;
  const productSlug = params.productSlug;

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [saleSoonExpires, setSaleSoonExpires] = useState(false);

  useEffect(() => {
    getProduct(slug, productSlug)
      .then((data) => {
        setDetail(data);
        setSaleSoonExpires(
          !!(data.product.is_on_sale &&
            data.product.sale_end &&
            new Date(data.product.sale_end).getTime() - Date.now() < 86_400_000 * 3),
        );
      })
      .catch(() => {
        setNotFound(true);
        setSaleSoonExpires(false);
      })
      .finally(() => setLoading(false));
  }, [slug, productSlug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square bg-gray-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-10 bg-gray-100 rounded w-1/3" />
            <div className="h-24 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <Tag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Produit introuvable</h1>
        <p className="text-gray-500 mb-8">Ce produit n&apos;existe pas ou n&apos;est plus disponible.</p>
        <Link
          href={`/store/${slug}/products`}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Voir tous les produits
        </Link>
      </div>
    );
  }

  const { product, related } = detail;

  const handleAddToCart = () => {
    // Placeholder — cart feature to be implemented
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-8">
        <Link href={`/store/${slug}`} className="hover:text-gray-700">
          Accueil
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/store/${slug}/products`} className="hover:text-gray-700">
          Produits
        </Link>
        {product.category && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/store/${slug}/categories/${product.category.slug}`}
              className="hover:text-gray-700"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium truncate max-w-[200px]">{product.title}</span>
      </nav>

      {/* ── Main layout ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left — Gallery */}
        <ImageGallery images={product.images} title={product.title} />

        {/* Right — Product info */}
        <div className="flex flex-col gap-6">
          {/* Brand + title */}
          <div>
            {product.brand && (
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                {product.brand}
              </p>
            )}
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">{product.title}</h1>
            {product.sku && (
              <p className="text-xs text-gray-400 mt-1">Réf: {product.sku}</p>
            )}
          </div>

          {/* Pricing */}
          <div className="flex items-end gap-4">
            <div>
              <span className="text-4xl font-extrabold text-gray-900">
                {formatPrice(product.effective_price, product.currency)}
              </span>
              {product.is_on_sale && (
                <span className="ml-3 text-xl line-through text-gray-400">
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
          {saleSoonExpires && product.sale_end && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-4 py-2.5 text-sm text-orange-700">
              <Clock className="w-4 h-4 shrink-0" />
              Offre se termine le {formatDate(product.sale_end)}
            </div>
          )}

          {/* Stock */}
          <StockBadge product={product} />

          {/* Description */}
          {product.description && (
            <div className="border-t pt-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={!product.in_stock}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3 px-6 text-sm font-semibold transition-all ${
                !product.in_stock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : addedToCart
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-900 text-white hover:bg-gray-700'
              }`}
            >
              {addedToCart ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Ajouté !
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  {product.in_stock ? 'Ajouter au panier' : 'Produit indisponible'}
                </>
              )}
            </button>
            <button className="p-3 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
              <Heart className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="p-3 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Product specs table */}
          {(product.weight || product.dimensions || product.tax_class || product.category) && (
            <div className="border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Caractéristiques</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {product.category && (
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-gray-500 w-1/3">Catégorie</td>
                      <td className="px-4 py-2.5 text-gray-900">
                        <Link
                          href={`/store/${slug}/categories/${product.category.slug}`}
                          className="text-blue-600 hover:underline"
                        >
                          {product.category.name}
                        </Link>
                      </td>
                    </tr>
                  )}
                  {product.weight && (
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Weight className="w-3.5 h-3.5" /> Poids
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{product.weight} kg</td>
                    </tr>
                  )}
                  {product.dimensions && (
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5" /> Dimensions
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{product.dimensions}</td>
                    </tr>
                  )}
                  {product.sku && (
                    <tr className="border-b last:border-b-0">
                      <td className="px-4 py-2.5 text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> SKU
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900 font-mono text-xs">{product.sku}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Collections membership */}
          {product.collections && product.collections.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Collections</h2>
              <div className="flex flex-wrap gap-2">
                {product.collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/store/${slug}/collections/${col.slug}`}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
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
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Produits similaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <RelatedCard key={p.id} product={p} slug={slug} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
