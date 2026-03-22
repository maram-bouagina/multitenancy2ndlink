import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Tag } from 'lucide-react';
import { getStore, getCategories, getProducts } from '@/lib/api/storefront-client';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { StorePublic, StorefrontSection, ProductPublic, CategoryPublic } from '@/lib/types/storefront';

export const dynamic = 'force-dynamic';

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
      {/* Image */}
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
            <Tag className="w-12 h-12" />
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

      {/* Info */}
      <div className="p-4 flex flex-col gap-1 flex-1">
        {product.brand && (
          <p className="text-xs text-gray-400 uppercase tracking-wide">{product.brand}</p>
        )}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{product.title}</h3>
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

/* ── Hero section ────────────────────────────────────────────────────────── */

function HeroSection({
  store,
  section,
}: {
  store: StorePublic;
  section?: StorefrontSection;
}) {
  const title = section?.title || `Bienvenue chez ${store.name}`;
  const subtitle = section?.subtitle || 'Découvrez notre sélection de produits';
  const ctaLabel = section?.cta_label || 'Parcourir les produits';
  const ctaHref = section?.cta_href || `/store/${store.slug}/products`;

  return (
    <section
      className="relative overflow-hidden py-24 px-4"
      style={{ background: `linear-gradient(135deg, ${store.theme_primary_color}15 0%, ${store.theme_secondary_color}10 100%)` }}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
          {title}
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">{subtitle}</p>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: store.theme_primary_color }}
        >
          {ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

/* ── Featured products section ───────────────────────────────────────────── */

function FeaturedProductsSection({
  products,
  store,
  section,
}: {
  products: ProductPublic[];
  store: StorePublic;
  section?: StorefrontSection;
}) {
  if (products.length === 0) return null;
  const title = section?.title || 'Nos produits';

  return (
    <section className="py-16 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <Link
            href={`/store/${store.slug}/products`}
            className="text-sm font-medium flex items-center gap-1 hover:opacity-80"
            style={{ color: store.theme_primary_color }}
          >
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} slug={store.slug} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Categories grid section ─────────────────────────────────────────────── */

function CategoriesGridSection({
  categories,
  store,
  section,
}: {
  categories: CategoryPublic[];
  store: StorePublic;
  section?: StorefrontSection;
}) {
  if (categories.length === 0) return null;
  const title = section?.title || 'Parcourir par catégorie';

  return (
    <section
      className="py-16 px-4"
      style={{ background: `${store.theme_primary_color}08` }}
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/store/${store.slug}/categories/${cat.slug}`}
              className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all text-center"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: store.theme_primary_color }}
              >
                {cat.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-900">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Newsletter section ──────────────────────────────────────────────────── */

function NewsletterSection({
  store,
  section,
}: {
  store: StorePublic;
  section?: StorefrontSection;
}) {
  const title = section?.title || 'Restez informé';
  const subtitle = section?.subtitle || 'Inscrivez-vous pour recevoir nos offres exclusives.';

  return (
    <section className="py-16 px-4">
      <div
        className="mx-auto max-w-2xl rounded-2xl p-10 text-center text-white"
        style={{ backgroundColor: store.theme_primary_color }}
      >
        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        <p className="text-white/80 mb-8">{subtitle}</p>
        <form className="flex gap-3 max-w-md mx-auto" action="#">
          <input
            type="email"
            placeholder="Votre adresse e-mail"
            className="flex-1 rounded-full px-5 py-2.5 text-gray-900 text-sm outline-none border-2 border-transparent focus:border-white/40"
          />
          <button
            type="button"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ color: store.theme_primary_color }}
          >
            S&apos;inscrire
          </button>
        </form>
      </div>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [store, categories, { products }] = await Promise.all([
    getStore(slug),
    getCategories(slug),
    getProducts(slug, { limit: 8, sort: 'newest' }),
  ]);

  let sections: StorefrontSection[] = [];
  try {
    const parsed = JSON.parse(store.storefront_layout || '[]');
    sections = Array.isArray(parsed) ? parsed.filter((s: StorefrontSection) => s.enabled) : [];
  } catch {
    sections = [];
  }

  // Default layout when no sections are published
  if (sections.length === 0) {
    return (
      <>
        <HeroSection store={store} />
        <FeaturedProductsSection products={products} store={store} />
        {categories.length > 0 && <CategoriesGridSection categories={categories} store={store} />}
      </>
    );
  }

  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case 'hero':
            return <HeroSection key={section.id} store={store} section={section} />;
          case 'featured_products':
            return (
              <FeaturedProductsSection
                key={section.id}
                products={products}
                store={store}
                section={section}
              />
            );
          case 'categories_grid':
            return (
              <CategoriesGridSection
                key={section.id}
                categories={categories}
                store={store}
                section={section}
              />
            );
          case 'newsletter':
            return <NewsletterSection key={section.id} store={store} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
