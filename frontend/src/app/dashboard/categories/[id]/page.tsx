'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useCategories, useCategory, useUpdateCategory } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Category } from '@/lib/types';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  canonical_url: z.string().url().optional().or(z.literal('')),
  noindex: z.boolean().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  visibility: z.enum(['public', 'private']),
  parent_id: z.string().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;

type CategoryNode = Pick<Category, 'id' | 'name'> & { children?: CategoryNode[] };

function flattenCategories(categories: CategoryNode[], depth = 0): Array<{ id: string; name: string; depth: number }> {
  return categories.flatMap((category) => [
    { id: category.id, name: category.name, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

function collectDescendantIds(category: CategoryNode): string[] {
  return (category.children ?? []).flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

export default function CategoryEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';

  const [error, setError] = useState<string>('');

  const { data: category, isLoading } = useCategory(storeId, id || '');
  const { data: categories } = useCategories(storeId);
  const updateCategoryMutation = useUpdateCategory();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        meta_title: category.meta_title || '',
        meta_description: category.meta_description || '',
        canonical_url: category.canonical_url || '',
        noindex: category.noindex || false,
        image_url: category.image_url || '',
        visibility: category.visibility,
        parent_id: category.parent_id || '',
      });
    }
  }, [category, reset]);

  const disallowedCategoryIds = new Set<string>();
  if (categories) {
    const currentCategory = flattenCategories(categories).find((item) => item.id === id);
    if (currentCategory) {
      disallowedCategoryIds.add(id);
    }
    const walk = (nodes: typeof categories) => {
      for (const node of nodes) {
        if (node.id === id) {
          collectDescendantIds(node).forEach((descendantId) => disallowedCategoryIds.add(descendantId));
          return true;
        }
        if (node.children && walk(node.children)) {
          return true;
        }
      }
      return false;
    };
    walk(categories);
  }
  const categoryOptions = flattenCategories(categories ?? []).filter((item) => !disallowedCategoryIds.has(item.id));

  const onSubmit = async (data: CategoryForm) => {
    if (!id) return;
    try {
      setError('');
      await updateCategoryMutation.mutateAsync({ storeId, categoryId: id, data });
      router.push('/dashboard/categories');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to update category'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-600">Loading category...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Edit Category</CardTitle>
          <CardDescription>
            Update your category details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="T-Shirts" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="t-shirts" {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="A short description" {...register('description')} />
              {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_title">SEO Title</Label>
              <Input id="meta_title" placeholder="Override page title for search engines" {...register('meta_title')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description">SEO Description</Label>
              <Textarea id="meta_description" placeholder="Override meta description for search engines (150–160 chars recommended)" rows={2} {...register('meta_description')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="canonical_url">Canonical URL</Label>
              <Input id="canonical_url" type="url" placeholder="https://example.com/categories/my-category" {...register('canonical_url')} />
              {errors.canonical_url && <p className="text-sm text-red-600">{errors.canonical_url.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Category Image URL</Label>
              <Input id="image_url" type="url" placeholder="https://..." {...register('image_url')} />
              {errors.image_url && <p className="text-sm text-red-600">{errors.image_url.message}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <input id="noindex" type="checkbox" className="h-4 w-4 rounded border-gray-300" {...register('noindex')} />
              <Label htmlFor="noindex">No Index (hide from search engines)</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent category</Label>
              <select id="parent_id" {...register('parent_id')} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-site-text shadow-sm transition-colors file:border-0 file:bg-transparent file:text-site-text file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">None (top-level category)</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {'- '.repeat(option.depth)}{option.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Subcategories are categories with a parent category.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility *</Label>
              <select id="visibility" {...register('visibility')} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-site-text shadow-sm transition-colors file:border-0 file:bg-transparent file:text-site-text file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              {errors.visibility && <p className="text-sm text-red-600">{errors.visibility.message}</p>}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/dashboard/categories">Cancel</Link>
              </Button>
              <Button type="submit" className="w-full" disabled={updateCategoryMutation.isPending}>
                Save category
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
