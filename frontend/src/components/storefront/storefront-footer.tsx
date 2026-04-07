'use client';

import Link from 'next/link';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';
import type { StorePublic, CategoryPublic, CollectionPublic } from '@/lib/types/storefront';

interface StorefrontFooterProps {
  store: StorePublic;
  categories: CategoryPublic[];
  collections: CollectionPublic[];
}

function getThemeTokens(store: StorePublic) {
  const isDark = store.theme_mode === 'dark';
  return {
    isDark,
    surface: isDark ? '#0f172a' : '#ffffff',
    surfaceAlt: isDark ? '#111827' : '#f8fafc',
    border: isDark ? 'rgba(148, 163, 184, 0.18)' : '#e5e7eb',
    textPrimary: isDark ? '#f8fafc' : '#111827',
    textSecondary: isDark ? '#cbd5e1' : '#6b7280',
    textMuted: isDark ? '#94a3b8' : '#9ca3af',
  };
}

export function StorefrontFooter({ store, categories, collections }: StorefrontFooterProps) {
  const { t } = useStorefrontLanguage();
  const theme = getThemeTokens(store);
  const topCategories = categories.slice(0, 5);
  const topCollections = collections.slice(0, 5);

  return (
    <footer
      className="mt-16 px-4 py-12"
      style={{ backgroundColor: theme.surfaceAlt, borderTop: `1px solid ${theme.border}` }}
    >
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_1fr_1fr]">
        {/* Store info */}
        <div>
          <h3 className="text-lg font-bold" style={{ color: theme.textPrimary }}>
            {store.name}
          </h3>
          {store.email && (
            <p className="mt-3 text-sm" style={{ color: theme.textSecondary }}>
              {store.email}
            </p>
          )}
          {store.phone && (
            <p className="mt-1 text-sm" style={{ color: theme.textSecondary }}>
              {store.phone}
            </p>
          )}
          {store.address && (
            <p className="mt-1 text-sm" style={{ color: theme.textSecondary }}>
              {store.address}
            </p>
          )}
        </div>

        {/* Categories */}
        {topCategories.length > 0 && (
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-[0.24em]"
              style={{ color: theme.textPrimary }}
            >
              {t.footer.categories}
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {topCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/store/${store.slug}/categories/${cat.slug}`}
                    style={{ color: theme.textSecondary }}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Collections */}
        {topCollections.length > 0 && (
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-[0.24em]"
              style={{ color: theme.textPrimary }}
            >
              {t.footer.collections}
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {topCollections.map((col) => (
                <li key={col.id}>
                  <Link
                    href={`/store/${store.slug}/collections/${col.slug}`}
                    style={{ color: theme.textSecondary }}
                  >
                    {col.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div
        className="mx-auto mt-10 max-w-7xl border-t pt-5 text-xs"
        style={{ borderColor: theme.border, color: theme.textMuted }}
      >
        © {new Date().getFullYear()} {store.name}. {t.footer.rights}
      </div>
    </footer>
  );
}
