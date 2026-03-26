import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronRight, Layers3 } from 'lucide-react';
import { getCategories, getStore } from '@/lib/api/storefront-client';
import type { CategoryPublic } from '@/lib/types/storefront';

export const dynamic = 'force-dynamic';

function flattenCategories(categories: CategoryPublic[]): CategoryPublic[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children ?? [])]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const store = await getStore(slug);
    return {
      title: `Catégories | ${store.name}`,
      description: `Parcourez toutes les catégories de ${store.name}.`,
    };
  } catch {
    return {
      title: 'Catégories',
      description: 'Parcourez toutes les catégories de la boutique.',
    };
  }
}

export default async function CategoriesIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let categories: CategoryPublic[] = [];
  try {
    categories = await getCategories(slug);
  } catch {
    notFound();
  }

  const allCategories = flattenCategories(categories);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-8 flex items-center gap-1.5 text-sm" style={{ color: 'var(--sf-text-muted)' }}>
        <Link href={`/store/${slug}`}>Accueil</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium" style={{ color: 'var(--sf-text-primary)' }}>Catégories</span>
      </nav>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--sf-text-muted)' }}>Navigation</p>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: 'var(--sf-text-primary)' }}>Toutes les catégories</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--sf-text-secondary)' }}>
            Explorez les rayons de la boutique et accédez rapidement à chaque famille de produits.
          </p>
        </div>
        <div className="rounded-full px-4 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-secondary)' }}>
          {allCategories.length} catégorie{allCategories.length > 1 ? 's' : ''}
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-3xl border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sf-border)' }}>
          <Layers3 className="mx-auto h-12 w-12" style={{ color: 'var(--sf-text-muted)' }} />
          <p className="mt-4 text-lg font-medium" style={{ color: 'var(--sf-text-primary)' }}>Aucune catégorie publiée</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>Les catégories apparaîtront ici dès qu&apos;elles seront créées dans le dashboard.</p>
          <Link href={`/store/${slug}/products`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: 'var(--sf-primary)' }}>
            Voir les produits
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="rounded-3xl border p-6 shadow-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--sf-text-muted)' }}>Catégorie</p>
                  <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--sf-text-primary)' }}>{category.name}</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'color-mix(in srgb, var(--sf-primary) 12%, transparent)', color: 'var(--sf-primary)' }}>
                  <Layers3 className="h-5 w-5" />
                </div>
              </div>

              {category.description ? (
                <p className="mt-4 line-clamp-3 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>{category.description}</p>
              ) : (
                <p className="mt-4 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>Cette catégorie regroupe une sélection de produits de la boutique.</p>
              )}

              {(category.children?.length ?? 0) > 0 && (
                <div className="mt-5 rounded-2xl p-4" style={{ backgroundColor: 'var(--sf-surface-alt)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--sf-text-muted)' }}>Sous-catégories</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {category.children?.slice(0, 4).map((child) => (
                      <Link
                        key={child.id}
                        href={`/store/${slug}/categories/${child.slug}`}
                        className="rounded-full border px-3 py-1 text-xs font-medium"
                        style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)', color: 'var(--sf-text-secondary)' }}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>/{category.slug}</span>
                <Link
                  href={`/store/${slug}/categories/${category.slug}`}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  style={{ backgroundColor: 'var(--sf-primary)' }}
                >
                  Ouvrir
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}