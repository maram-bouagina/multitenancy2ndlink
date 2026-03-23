import { getStore, getCategories, getProducts, getCollections } from '@/lib/api/storefront-client';
import { PuckStorefrontRenderer } from './puck-renderer';

export const dynamic = 'force-dynamic';

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [store, categories, collections, { products }] = await Promise.all([
    getStore(slug),
    getCategories(slug),
    getCollections(slug),
    getProducts(slug, { limit: 24, sort: 'newest' }),
  ]);

  return (
    <PuckStorefrontRenderer
      store={store}
      products={products}
      categories={categories}
      collections={collections}
    />
  );
}
