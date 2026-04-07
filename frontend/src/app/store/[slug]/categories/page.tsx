import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronRight, Layers3 } from 'lucide-react';
import { getCategories, getStore } from '@/lib/api/storefront-client';
import { resolveMediaUrl } from '@/lib/api/media-url';
import type { CategoryPublic } from '@/lib/types/storefront';

export const dynamic = 'force-dynamic';

type FlattenedCategory = CategoryPublic & {
  depth: number;
  parentName?: string;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function flattenCategories(categories: CategoryPublic[], depth = 0, parentName?: string): FlattenedCategory[] {
  return categories.flatMap((category) => [
    { ...category, depth, parentName },
    ...flattenCategories(category.children ?? [], depth + 1, category.name),
  ]);
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const queryValue = firstValue(resolvedSearchParams.q)?.trim() ?? '';
  const query = queryValue.toLowerCase();
  const structure = firstValue(resolvedSearchParams.structure) ?? '';

  let categories: CategoryPublic[] = [];
  try {
    categories = await getCategories(slug);
  } catch {
    notFound();
  }

  const allCategories = flattenCategories(categories);
  const filteredCategories = allCategories.filter((category) => {
    const searchHaystack = [
      category.name,
      category.slug,
      category.description,
      category.parentName,
      (category.children ?? []).map((child) => child.name).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = !query || searchHaystack.includes(query);
    const matchesStructure = !structure
      || (structure === 'top-level' && !category.parentName)
      || (structure === 'child' && !!category.parentName);

    return matchesSearch && matchesStructure;
  });
  const hasActiveFilters = Boolean(query || structure);

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
          {filteredCategories.length} / {allCategories.length} catégorie{allCategories.length > 1 ? 's' : ''}
        </div>
      </div>

      <form action={`/store/${slug}/categories`} className="mb-8 grid gap-3 rounded-3xl border p-4 md:grid-cols-[1.6fr_0.9fr_auto]" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)' }}>
        <input
          type="search"
          name="q"
          defaultValue={queryValue}
          placeholder="Rechercher par nom, slug ou description..."
          className="rounded-xl border px-4 py-3 text-sm outline-none"
          style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-primary)' }}
        />
        <select
          name="structure"
          defaultValue={structure}
          className="rounded-xl border px-4 py-3 text-sm outline-none"
          style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-primary)' }}
        >
          <option value="">Toutes les catégories</option>
          <option value="top-level">Rayons principaux</option>
          <option value="child">Sous-catégories</option>
        </select>
        <div className="flex gap-2">
          <button type="submit" className="rounded-xl px-4 py-3 text-sm font-medium text-white" style={{ backgroundColor: 'var(--sf-primary)' }}>
            Filtrer
          </button>
          {hasActiveFilters ? (
            <Link
              href={`/store/${slug}/categories`}
              className="rounded-xl border px-4 py-3 text-sm"
              style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)', backgroundColor: 'var(--sf-surface-alt)' }}
            >
              Réinitialiser
            </Link>
          ) : null}
        </div>
      </form>

      {allCategories.length === 0 ? (
        <div className="rounded-3xl border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sf-border)' }}>
          <Layers3 className="mx-auto h-12 w-12" style={{ color: 'var(--sf-text-muted)' }} />
          <p className="mt-4 text-lg font-medium" style={{ color: 'var(--sf-text-primary)' }}>Aucune catégorie publiée</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>Les catégories apparaîtront ici dès qu&apos;elles seront créées dans le dashboard.</p>
          <Link href={`/store/${slug}/products`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: 'var(--sf-primary)' }}>
            Voir les produits
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="rounded-3xl border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sf-border)' }}>
          <Layers3 className="mx-auto h-12 w-12" style={{ color: 'var(--sf-text-muted)' }} />
          <p className="mt-4 text-lg font-medium" style={{ color: 'var(--sf-text-primary)' }}>Aucune catégorie ne correspond à ces filtres</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>Essayez un autre mot-clé ou élargissez les filtres actifs.</p>
          <Link href={`/store/${slug}/categories`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: 'var(--sf-primary)' }}>
            Réinitialiser les filtres
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCategories.map((category) => (
            <article key={category.id} className="overflow-hidden rounded-3xl border shadow-sm" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)' }}>
              <div className="relative aspect-16/10" style={{ backgroundColor: 'var(--sf-surface-alt)' }}>
                {category.image_url ? (
                  <Image
                    src={resolveMediaUrl(category.image_url)}
                    alt={category.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--sf-text-muted)' }}>
                    <Layers3 className="h-10 w-10" />
                  </div>
                )}
                <div
                  className="absolute inset-x-0 bottom-0 h-24"
                  style={{ background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--sf-surface) 82%, black))' }}
                />
                <div
                  className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--sf-surface) 72%, transparent)', color: 'var(--sf-text-primary)' }}
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  Catégorie
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--sf-text-primary)' }}>{category.name}</h2>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--sf-text-muted)' }}>
                      {category.parentName
                        ? `Sous-catégorie de ${category.parentName}`
                        : (category.children?.length ?? 0) > 0
                        ? `${category.children?.length ?? 0} sous-catégorie${(category.children?.length ?? 0) > 1 ? 's' : ''}`
                        : 'Catégorie principale'}
                    </p>
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
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}