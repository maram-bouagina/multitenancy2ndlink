import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Search, Mail, Phone, MapPin } from 'lucide-react';
import { getStore, getCategories, getCollections } from '@/lib/api/storefront-client';
import type { StorePublic, CategoryPublic, CollectionPublic } from '@/lib/types/storefront';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let store: StorePublic;
  let categories: CategoryPublic[] = [];
  let collections: CollectionPublic[] = [];

  try {
    [store, categories, collections] = await Promise.all([
      getStore(slug),
      getCategories(slug),
      getCollections(slug),
    ]);
  } catch {
    notFound();
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-white text-gray-900"
      style={
        {
          '--sf-primary': store.theme_primary_color,
          '--sf-secondary': store.theme_secondary_color,
          '--sf-font': `'${store.theme_font_family}', system-ui, sans-serif`,
          fontFamily: `'${store.theme_font_family}', system-ui, sans-serif`,
        } as React.CSSProperties
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo / Store name */}
            <Link href={`/store/${slug}`} className="flex items-center gap-3 shrink-0">
              {store.logo ? (
                <Image
                  src={store.logo}
                  alt={store.name}
                  width={120}
                  height={36}
                  className="h-9 w-auto object-contain"
                  unoptimized
                />
              ) : (
                <span
                  className="text-xl font-bold tracking-tight"
                  style={{ color: store.theme_primary_color }}
                >
                  {store.name}
                </span>
              )}
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href={`/store/${slug}`}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Accueil
              </Link>
              <Link
                href={`/store/${slug}/products`}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Produits
              </Link>

              {/* Categories dropdown */}
              {categories.length > 0 && (
                <div className="relative group">
                  <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-1">
                    Catégories
                    <svg className="w-3 h-3 mt-0.5" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 11L3 6h10l-5 5z" />
                    </svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-52 rounded-lg shadow-lg bg-white border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/store/${slug}/categories/${cat.slug}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Collections dropdown */}
              {collections.length > 0 && (
                <div className="relative group">
                  <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-1">
                    Collections
                    <svg className="w-3 h-3 mt-0.5" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 11L3 6h10l-5 5z" />
                    </svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-52 rounded-lg shadow-lg bg-white border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                    {collections.map((col) => (
                      <Link
                        key={col.id}
                        href={`/store/${slug}/collections/${col.slug}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {col.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/store/${slug}/products`}
                className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Rechercher"
              >
                <Search className="w-5 h-5" />
              </Link>
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: store.theme_primary_color }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Panier</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Brand */}
            <div>
              {store.logo ? (
                <Image
                  src={store.logo}
                  alt={store.name}
                  width={120}
                  height={36}
                  className="h-8 w-auto object-contain mb-4"
                  unoptimized
                />
              ) : (
                <p
                  className="text-lg font-bold mb-4"
                  style={{ color: store.theme_primary_color }}
                >
                  {store.name}
                </p>
              )}
              <div className="space-y-2 text-sm text-gray-600">
                {store.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a href={`mailto:${store.email}`} className="hover:underline">
                      {store.email}
                    </a>
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    <a href={`tel:${store.phone}`} className="hover:underline">
                      {store.phone}
                    </a>
                  </div>
                )}
                {store.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{store.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Catégories
                </h3>
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/store/${slug}/categories/${cat.slug}`}
                        className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Collections */}
            {collections.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Collections
                </h3>
                <ul className="space-y-2">
                  {collections.map((col) => (
                    <li key={col.id}>
                      <Link
                        href={`/store/${slug}/collections/${col.slug}`}
                        className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {col.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} {store.name}. Tous droits réservés.
            </p>
            <p>Devise : {store.currency}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
