import { notFound } from 'next/navigation';
import { StorefrontLanguageProvider } from '@/lib/hooks/use-storefront-language';
import { StorefrontView } from '@/components/storefront/storefront-view';
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
  } catch (err) {
    // Handle maintenance mode (503) distinctly from "not found" (404)
    const httpErr = err as { response?: { status?: number; data?: { message?: string; store?: string } } };
    if (httpErr?.response?.status === 503) {
      const msg = httpErr.response?.data?.message ?? 'Cette boutique est temporairement en maintenance.';
      const storeName = httpErr.response?.data?.store;
      return (
        <html>
          <body>
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900 px-4">
              <div className="text-6xl mb-6">ðŸ”§</div>
              {storeName && (
                <h1 className="text-3xl font-bold mb-3 text-center">{storeName}</h1>
              )}
              <p className="text-xl text-gray-500 max-w-md text-center">{msg}</p>
              <p className="mt-6 text-sm text-gray-400">Revenez bientÃ´t Â· Come back soon</p>
            </div>
          </body>
        </html>
      );
    }
    notFound();
  }

  return (
    <StorefrontLanguageProvider>
      <StorefrontView store={store} categories={categories} collections={collections} slug={slug}>
        {children}
      </StorefrontView>
    </StorefrontLanguageProvider>
  );
}
