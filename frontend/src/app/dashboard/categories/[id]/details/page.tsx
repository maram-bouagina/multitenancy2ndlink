'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveMediaUrl } from '@/lib/api/media-url';
import { useAuth } from '@/lib/hooks/use-auth';
import { useCategories, useCategory } from '@/lib/hooks/use-api';
import type { Category } from '@/lib/types';

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children ?? [])]);
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

export default function CategoryDetailsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';

  const { data: category, isLoading, isError } = useCategory(storeId, id);
  const { data: categories } = useCategories(storeId);

  if (isLoading) {
    return <div className="p-6">Loading category details...</div>;
  }

  if (isError || !category) {
    return <div className="p-6 text-red-600">Category not found.</div>;
  }

  const allCategories = flattenCategories(categories ?? []);
  const parentCategory = allCategories.find((entry) => entry.id === category.parent_id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <p className="text-gray-600">Category details, SEO settings, and storefront preview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/categories">Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/categories/${category.id}`}>Edit category</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="relative aspect-16/10 border-b bg-gray-100">
            {category.image_url ? (
              <Image
                src={resolveMediaUrl(category.image_url)}
                alt={category.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No category image configured
              </div>
            )}
          </div>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={category.visibility === 'public' ? 'default' : 'secondary'}>{category.visibility}</Badge>
              {parentCategory ? <Badge variant="outline">Child category</Badge> : <Badge variant="outline">Top-level category</Badge>}
            </div>
            <CardTitle>{category.name}</CardTitle>
            <CardDescription>{category.description || 'No description provided for this category.'}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Slug</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">/{category.slug}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Parent</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{parentCategory?.name || 'None'}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Children</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{category.children?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
              <CardDescription>Hierarchy and storefront visibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Visibility</span><span>{category.visibility}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Parent category</span><span>{parentCategory?.name || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Created</span><span>{formatDateTime(category.created_at)}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Updated</span><span>{formatDateTime(category.updated_at)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>Search-engine facing fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Meta title</span><span className="max-w-56 truncate text-right">{category.meta_title || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Canonical URL</span><span className="max-w-56 truncate text-right">{category.canonical_url || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">No index</span><span>{category.noindex ? 'Yes' : 'No'}</span></div>
              <div>
                <p className="text-gray-500">Meta description</p>
                <p className="mt-1 leading-6 text-gray-900">{category.meta_description || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}