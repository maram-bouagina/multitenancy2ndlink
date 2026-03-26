import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { getCollections, getStore } from '@/lib/api/storefront-client';

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
      title: `Collections | ${store.name}`,
      description: `Parcourez toutes les collections de ${store.name}.`,
    };
  } catch {
    return {
      title: 'Collections',
      description: 'Parcourez toutes les collections de la boutique.',
    };
  }
}

export default async function CollectionsIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let collections;
  try {
    collections = await getCollections(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-8 flex items-center gap-1.5 text-sm" style={{ color: 'var(--sf-text-muted)' }}>
        <Link href={`/store/${slug}`}>Accueil</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium" style={{ color: 'var(--sf-text-primary)' }}>Collections</span>
      </nav>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--sf-text-muted)' }}>Curations</p>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: 'var(--sf-text-primary)' }}>Toutes les collections</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--sf-text-secondary)' }}>
            Découvrez les sélections thématiques, les campagnes saisonnières et les regroupements éditoriaux du store.
          </p>
        </div>
        <div className="rounded-full px-4 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-secondary)' }}>
          {collections.length} collection{collections.length > 1 ? 's' : ''}
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="rounded-3xl border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sf-border)' }}>
          <Sparkles className="mx-auto h-12 w-12" style={{ color: 'var(--sf-text-muted)' }} />
          <p className="mt-4 text-lg font-medium" style={{ color: 'var(--sf-text-primary)' }}>Aucune collection publiée</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>Les collections apparaîtront ici dès qu&apos;elles seront créées dans le dashboard.</p>
          <Link href={`/store/${slug}/products`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: 'var(--sf-primary)' }}>
            Voir les produits
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection, index) => (
            <article
              key={collection.id}
              className="relative overflow-hidden rounded-3xl border p-6 shadow-sm"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-surface)' }}
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: index % 3 === 0 ? 'linear-gradient(90deg, #2563eb, #38bdf8)' : index % 3 === 1 ? 'linear-gradient(90deg, #ea580c, #f59e0b)' : 'linear-gradient(90deg, #0f766e, #34d399)' }}
              />
              <div className="flex items-start justify-between gap-4 pt-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--sf-text-muted)' }}>Collection</p>
                  <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--sf-text-primary)' }}>{collection.name}</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--sf-surface-alt)', color: 'var(--sf-text-secondary)' }}>
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-4 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>
                Utilisez cette collection pour rassembler des produits autour d’un thème, d’une offre ou d’une saison.
              </p>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>/{collection.slug}</span>
                <Link
                  href={`/store/${slug}/collections/${collection.slug}`}
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