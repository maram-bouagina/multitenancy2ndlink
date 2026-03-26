'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

import { PuckStorefrontRenderer } from '@/app/store/[slug]/puck-renderer';
import { getCategories, getCollections, getProducts, getStore as getPublicStore } from '@/lib/api/storefront-client';
import { useStore } from '@/lib/hooks/use-api';
import { useLanguage } from '@/lib/hooks/use-language';
import type { CategoryPublic, CollectionPublic, ProductPublic, StorePublic } from '@/lib/types/storefront';

type PreviewPayload = {
  store: StorePublic;
  categories: CategoryPublic[];
  collections: CollectionPublic[];
  products: ProductPublic[];
};

function toPublicStore(store: NonNullable<ReturnType<typeof useStore>['data']>): StorePublic {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    logo: store.logo,
    email: store.email,
    phone: store.phone,
    address: store.address,
    currency: store.currency,
    language: store.language,
    theme_primary_color: store.theme_primary_color,
    theme_secondary_color: store.theme_secondary_color,
    theme_mode: store.theme_mode,
    theme_font_family: store.theme_font_family,
    storefront_layout: store.storefront_layout_published || '',
  };
}

export default function StorefrontPage() {
  return (
    <Suspense>
      <StorefrontPageInner />
    </Suspense>
  );
}

function StorefrontPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { data: store, isLoading } = useStore(id || '');
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    if (!store) return;

    let cancelled = false;

    const loadPreviewPayload = async () => {
      try {
        const [publicStore, categories, collections, { products }] = await Promise.all([
          getPublicStore(store.slug),
          getCategories(store.slug),
          getCollections(store.slug),
          getProducts(store.slug, { limit: 24, sort: 'newest' }),
        ]);

        if (!cancelled) {
          setPayload({
            store: {
              ...publicStore,
              theme_primary_color: store.theme_primary_color,
              theme_secondary_color: store.theme_secondary_color,
              theme_mode: store.theme_mode,
              theme_font_family: store.theme_font_family,
            },
            categories,
            collections,
            products,
          });
        }
      } catch {
        if (!cancelled) {
          setPayload({
            store: toPublicStore(store),
            categories: [],
            collections: [],
            products: [],
          });
        }
      }
    };

    void loadPreviewPayload();

    return () => {
      cancelled = true;
    };
  }, [store]);

  if (isLoading || !payload) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">{t.storePreviewPage.loading}</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">{t.storePreviewPage.notFound}</div>
      </div>
    );
  }

  const isPreview = searchParams.get('preview') === 'true';
  const layoutOverride = isPreview
    ? (store.storefront_layout_draft || store.storefront_layout_published || '')
    : (store.storefront_layout_published || '');

  return (
    <div className="min-h-screen bg-slate-50">
      {isPreview && (
        <div className="w-full bg-amber-400 px-4 py-2 text-center text-xs font-semibold text-amber-900">
          {t.storePreviewPage.previewBanner}{' '}
          <Link href={`/dashboard/stores/${id}/editor`} className="underline">
            {t.storePreviewPage.backToEditor}
          </Link>
        </div>
      )}

      <PuckStorefrontRenderer
        store={payload.store}
        categories={payload.categories}
        collections={payload.collections}
        products={payload.products}
        layoutOverride={layoutOverride}
      />
    </div>
  );
}
