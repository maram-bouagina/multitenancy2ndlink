'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';
import { StorefrontHeader } from '@/components/storefront/storefront-header';
import { StorefrontFooter } from '@/components/storefront/storefront-footer';
import type { StorePublic, CategoryPublic, CollectionPublic } from '@/lib/types/storefront';
import type { StorefrontPageListItem } from '@/lib/api/storefront-client';

interface StorefrontViewProps {
  store: StorePublic;
  categories: CategoryPublic[];
  collections: CollectionPublic[];
  pages: StorefrontPageListItem[];
  slug: string;
  children: React.ReactNode;
}

export function StorefrontView({ store, categories, collections, pages, slug, children }: StorefrontViewProps) {
  const { t, lang, dir } = useStorefrontLanguage();
  const pathname = usePathname();
  const isAuthPage = pathname.includes(`/store/${slug}/auth/`);
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
      data-storefront-shell
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
      {isAuthPage ? (
        /* Auth pages: simple back-to-store link */
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="mx-auto max-w-7xl">
            <Link
              href={`/store/${slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: store.theme_primary_color }}
            >
              <ArrowLeft className="w-4 h-4" />
              {t.nav.backToStore}
            </Link>
          </div>
        </div>
      ) : (
        <StorefrontHeader store={store} categories={categories} collections={collections} pages={pages} />
      )}

      <main className="flex-1">{children}</main>

      {!isAuthPage && (
        <StorefrontFooter store={store} categories={categories} collections={collections} />
      )}
    </div>
  );
}
