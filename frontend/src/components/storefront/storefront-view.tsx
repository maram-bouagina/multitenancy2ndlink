'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Search, Mail, Phone, MapPin } from 'lucide-react';
import { StorefrontAuthButton } from '@/components/storefront/auth-button';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';
import type { StorePublic, CategoryPublic, CollectionPublic } from '@/lib/types/storefront';

interface StorefrontViewProps {
  store: StorePublic;
  categories: CategoryPublic[];
  collections: CollectionPublic[];
  slug: string;
  children: React.ReactNode;
}

export function StorefrontView({ store, categories, collections, slug, children }: StorefrontViewProps) {
  const { t, lang, dir } = useStorefrontLanguage();
  const isDark = store.theme_mode === 'dark';
  const pageBg = isDark ? '#020617' : '#ffffff';
  const surface = isDark ? '#0f172a' : '#ffffff';
  const surfaceAlt = isDark ? '#111827' : '#f8fafc';
  const border = isDark ? 'rgba(148, 163, 184, 0.18)' : '#e5e7eb';
  const textPrimary = isDark ? '#f8fafc' : '#111827';
  const textSecondary = isDark ? '#cbd5e1' : '#4b5563';
  const textMuted = isDark ? '#94a3b8' : '#9ca3af';
  const hoverBg = isDark ? 'rgba(148, 163, 184, 0.10)' : '#f3f4f6';

  return (
    <div
      dir={dir}
      lang={lang}
      className="min-h-screen flex flex-col"
      style={
        {
          '--sf-primary': store.theme_primary_color,
          '--sf-secondary': store.theme_secondary_color,
          '--sf-page-bg': pageBg,
          '--sf-surface': surface,
          '--sf-surface-alt': surfaceAlt,
          '--sf-border': border,
          '--sf-text-primary': textPrimary,
          '--sf-text-secondary': textSecondary,
          '--sf-text-muted': textMuted,
          '--sf-hover-bg': hoverBg,
          '--sf-font': `'${store.theme_font_family}', system-ui, sans-serif`,
          backgroundColor: 'var(--sf-page-bg)',
          color: 'var(--sf-text-primary)',
          fontFamily: `'${store.theme_font_family}', system-ui, sans-serif`,
        } as React.CSSProperties
      }
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-sm shadow-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)' }}>
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
                <span className="text-xl font-bold tracking-tight" style={{ color: store.theme_primary_color }}>
                  {store.name}
                </span>
              )}
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href={`/store/${slug}`}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ color: 'var(--sf-text-secondary)' }}
              >
                {t.nav.home}
              </Link>
              <Link
                href={`/store/${slug}/products`}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ color: 'var(--sf-text-secondary)' }}
              >
                {t.nav.products}
              </Link>

              {categories.length > 0 && (
                <div className="relative group">
                  <button className="px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1" style={{ color: 'var(--sf-text-secondary)' }}>
                    {t.nav.categories}
                    <svg className="w-3 h-3 mt-0.5" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 11L3 6h10l-5 5z" />
                    </svg>
                  </button>
                  <div className="absolute top-full inset-s-0 mt-1 w-52 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50" style={{ backgroundColor: 'var(--sf-surface)', border: '1px solid var(--sf-border)' }}>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/store/${slug}/categories/${cat.slug}`}
                        className="block px-4 py-2 text-sm"
                        style={{ color: 'var(--sf-text-secondary)' }}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {collections.length > 0 && (
                <div className="relative group">
                  <button className="px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1" style={{ color: 'var(--sf-text-secondary)' }}>
                    {t.nav.collections}
                    <svg className="w-3 h-3 mt-0.5" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 11L3 6h10l-5 5z" />
                    </svg>
                  </button>
                  <div className="absolute top-full inset-s-0 mt-1 w-52 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50" style={{ backgroundColor: 'var(--sf-surface)', border: '1px solid var(--sf-border)' }}>
                    {collections.map((col) => (
                      <Link
                        key={col.id}
                        href={`/store/${slug}/collections/${col.slug}`}
                        className="block px-4 py-2 text-sm"
                        style={{ color: 'var(--sf-text-secondary)' }}
                      >
                        {col.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <Link
                href={`/store/${slug}/products`}
                className="p-2 rounded-md transition-colors"
                style={{ color: 'var(--sf-text-muted)' }}
                aria-label={t.nav.search}
              >
                <Search className="w-5 h-5" />
              </Link>
              <StorefrontAuthButton slug={slug} />
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: store.theme_primary_color }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">{t.nav.cart}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t mt-16" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface-alt)' }}>
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
                <p className="text-lg font-bold mb-4" style={{ color: store.theme_primary_color }}>
                  {store.name}
                </p>
              )}
              <div className="space-y-2 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>
                {store.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a href={`mailto:${store.email}`} className="hover:underline">{store.email}</a>
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    <a href={`tel:${store.phone}`} className="hover:underline">{store.phone}</a>
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
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--sf-text-primary)' }}>
                  {t.footer.categories}
                </h3>
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/store/${slug}/categories/${cat.slug}`}
                        className="text-sm hover:underline"
                        style={{ color: 'var(--sf-text-secondary)' }}
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
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--sf-text-primary)' }}>
                  {t.footer.collections}
                </h3>
                <ul className="space-y-2">
                  {collections.map((col) => (
                    <li key={col.id}>
                      <Link
                        href={`/store/${slug}/collections/${col.slug}`}
                        className="text-sm hover:underline"
                        style={{ color: 'var(--sf-text-secondary)' }}
                      >
                        {col.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs" style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-muted)' }}>
            <p>
              &copy; {new Date().getFullYear()} {store.name}. {t.footer.rights}
            </p>
            <p>{t.footer.currency} : {store.currency}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
