import { getStore, getCategories, getProducts, getCollections, getStorePages } from '@/lib/api/storefront-client';
import { PuckStorefrontRenderer } from './puck-renderer';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const store = await getStore(slug);
    return {
      title: store.name,
      description: `Découvrez les nouveautés et collections de ${store.name}.`,
    };
  } catch {
    return {
      title: 'Boutique',
      description: 'Découvrez les produits de la boutique.',
    };
  }
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [store, categories, collections, { products }, pages] = await Promise.all([
    getStore(slug),
    getCategories(slug),
    getCollections(slug),
    getProducts(slug, { limit: 24, sort: 'newest' }),
    getStorePages(slug).catch(() => []),
  ]);

  return (
    <PuckStorefrontRenderer
      store={store}
      products={products}
      categories={categories}
      collections={collections}
      pages={pages}
    />
  );
}
