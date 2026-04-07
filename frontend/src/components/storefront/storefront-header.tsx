'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { resolveMediaUrl } from '@/lib/api/media-url';
import { StorefrontAuthButton } from '@/components/storefront/auth-button';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';
import type { StorePublic, CategoryPublic, CollectionPublic } from '@/lib/types/storefront';
import type { StorefrontPageListItem } from '@/lib/api/storefront-client';

interface StorefrontHeaderProps {
  store: StorePublic;
  categories: CategoryPublic[];
  collections: CollectionPublic[];
  pages: StorefrontPageListItem[];
}

function getThemeTokens(store: StorePublic) {
  const primary = store.theme_primary_color || '#2563eb';
  const isDark = store.theme_mode === 'dark';
  return {
    isDark,
    primary,
    border: isDark ? 'rgba(148, 163, 184, 0.18)' : '#e5e7eb',
    textPrimary: isDark ? '#f8fafc' : '#111827',
    textSecondary: isDark ? '#cbd5e1' : '#6b7280',
    textMuted: isDark ? '#94a3b8' : '#9ca3af',
    headerBg: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
  };
}

export function StorefrontHeader({ store, categories, collections, pages }: StorefrontHeaderProps) {
  const { t } = useStorefrontLanguage();
  const theme = getThemeTokens(store);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navCollections = collections.slice(0, 3);
  const navPages = pages.filter((p) => p.slug !== 'index');

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-sm shadow-sm"
      style={{ borderColor: theme.border, backgroundColor: theme.headerBg }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo / Store name */}
          <Link href={`/store/${store.slug}`} className="flex items-center gap-3 shrink-0">
            {store.logo ? (
              <Image
                src={resolveMediaUrl(store.logo)}
                alt={store.name}
                width={120}
                height={36}
                className="h-9 w-auto object-contain"
                unoptimized
              />
            ) : (
              <span className="text-xl font-bold tracking-tight" style={{ color: theme.primary }}>
                {store.name}
              </span>
            )}
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <Link
              href={`/store/${store.slug}`}
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: theme.textSecondary }}
            >
              {t.nav.home}
            </Link>
            <Link
              href={`/store/${store.slug}/products`}
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: theme.textSecondary }}
            >
              {t.nav.products}
            </Link>
            <Link
              href={`/store/${store.slug}/categories`}
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80 border"
              style={{ borderColor: theme.primary, color: theme.primary }}
            >
              {t.nav.allCategories}
            </Link>
            {navCollections.map((col) => (
              <Link
                key={col.id}
                href={`/store/${store.slug}/collections/${col.slug}`}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: theme.textSecondary }}
              >
                {col.name}
              </Link>
            ))}
            {navPages.map((page) => (
              <Link
                key={page.slug}
                href={`/store/${store.slug}/p/${page.slug}`}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: theme.textSecondary }}
              >
                {page.title}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href={`/store/${store.slug}/products`}
              className="p-2 rounded-md transition-colors hover:opacity-80"
              style={{ color: theme.textMuted }}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Link>
            <StorefrontAuthButton slug={store.slug} />

            {/* Mobile menu toggle */}
            <button
              className="p-2 rounded-md md:hidden transition-colors hover:opacity-80"
              style={{ color: theme.textMuted }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t px-4 pb-4 pt-2 space-y-1"
          style={{ borderColor: theme.border, backgroundColor: theme.headerBg }}
        >
          <Link
            href={`/store/${store.slug}`}
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium"
            style={{ color: theme.textSecondary }}
          >
            {t.nav.home}
          </Link>
          <Link
            href={`/store/${store.slug}/products`}
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium"
            style={{ color: theme.textSecondary }}
          >
            {t.nav.products}
          </Link>
          <Link
            href={`/store/${store.slug}/categories`}
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium"
            style={{ color: theme.primary }}
          >
            {t.nav.allCategories}
          </Link>
          {navCollections.map((col) => (
            <Link
              key={col.id}
              href={`/store/${store.slug}/collections/${col.slug}`}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium"
              style={{ color: theme.textSecondary }}
            >
              {col.name}
            </Link>
          ))}
          {navPages.map((page) => (
            <Link
              key={page.slug}
              href={`/store/${store.slug}/p/${page.slug}`}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium"
              style={{ color: theme.textSecondary }}
            >
              {page.title}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
