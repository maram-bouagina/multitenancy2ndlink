'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useCategories, useCreateCategory } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Category } from '@/lib/types';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
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

export default function NewCategoryPage() {
  const router = useRouter();
  const { currentStore } = useAuth();
  const storeId = currentStore?.id || '';
  const [error, setError] = useState<string>('');
  const createCategoryMutation = useCreateCategory();
  const { data: categories } = useCategories(storeId);
  const categoryOptions = flattenCategories(categories ?? []);

  const { register, handleSubmit, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  });

  const onSubmit = async (data: CategoryForm) => {
    if (!storeId) {
      setError('Select a store first.');
      return;
    }

    try {
      setError('');
      await createCategoryMutation.mutateAsync({ storeId, data });
      router.push('/dashboard/categories');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to create category'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create category</CardTitle>
          <CardDescription>
            Add a category to organize products.
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
              <Input id="description" placeholder="A descriptive summary" {...register('description')} />
              {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent category</Label>
              <select id="parent_id" {...register('parent_id')} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-site-text shadow-sm transition-colors file:border-0 file:bg-transparent file:text-site-text file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">None (top-level category)</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {'- '.repeat(category.depth)}{category.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Choose a parent to create a subcategory.</p>
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
              <Button type="submit" className="w-full" disabled={createCategoryMutation.isPending}>
                Create category
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
