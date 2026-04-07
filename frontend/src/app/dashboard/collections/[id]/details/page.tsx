'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveMediaUrl } from '@/lib/api/media-url';
import { useAuth } from '@/lib/hooks/use-auth';
import { useCollection, useCollectionProducts } from '@/lib/hooks/use-api';

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

export default function CollectionDetailsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';

  const { data: collection, isLoading, isError } = useCollection(storeId, id);
  const { data: collectionProducts } = useCollectionProducts(storeId, id, 1, 1);

  if (isLoading) {
    return <div className="p-6">Loading collection details...</div>;
  }

  if (isError || !collection) {
    return <div className="p-6 text-red-600">Collection not found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
          <p className="text-gray-600">Collection configuration, SEO settings, and merchandising summary.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/collections">Back</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/collections/${collection.id}/products`}>Manage products</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/collections/${collection.id}`}>Edit collection</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="relative aspect-16/10 border-b bg-gray-100">
            {collection.image_url ? (
              <Image
                src={resolveMediaUrl(collection.image_url)}
                alt={collection.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No collection image configured
              </div>
            )}
          </div>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">{collection.type}</Badge>
              <Badge variant="outline">{collectionProducts?.total ?? 0} products</Badge>
            </div>
            <CardTitle>{collection.name}</CardTitle>
            <CardDescription>{collection.description || 'No description provided for this collection.'}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Slug</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">/{collection.slug}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{collection.type}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Products</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{collectionProducts?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rules & dates</CardTitle>
              <CardDescription>Automatic logic and timestamps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Type</span><span>{collection.type}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Created</span><span>{formatDateTime(collection.created_at)}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Updated</span><span>{formatDateTime(collection.updated_at)}</span></div>
              <div>
                <p className="text-gray-500">Rule</p>
                <p className="mt-1 leading-6 text-gray-900">{collection.rule || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>Search-engine facing fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Meta title</span><span className="max-w-56 truncate text-right">{collection.meta_title || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Canonical URL</span><span className="max-w-56 truncate text-right">{collection.canonical_url || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">No index</span><span>{collection.noindex ? 'Yes' : 'No'}</span></div>
              <div>
                <p className="text-gray-500">Meta description</p>
                <p className="mt-1 leading-6 text-gray-900">{collection.meta_description || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}