'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/hooks/use-auth';
import { useCollection, useUpdateCollection } from '@/lib/hooks/use-api';

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  type: z.enum(['manual', 'automatic']),
  rule: z.string().optional(),
});

type CollectionForm = z.infer<typeof collectionSchema>;

export default function CollectionEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';

  const [error, setError] = useState<string>('');

  const { data: collection, isLoading } = useCollection(storeId, id || '');
  const updateCollectionMutation = useUpdateCollection();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
  });

  useEffect(() => {
    if (collection) {
      reset({
        name: collection.name,
        slug: collection.slug,
        type: collection.type,
        rule: collection.rule || '',
      });
    }
  }, [collection, reset]);

  const onSubmit = async (data: CollectionForm) => {
    if (!id) return;
    try {
      setError('');
      await updateCollectionMutation.mutateAsync({ storeId, collectionId: id, data });
      router.push('/dashboard/collections');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to update collection'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-600">Loading collection...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Collection</CardTitle>
          <CardDescription>
            Update collection settings. Manage collection products from a dedicated page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Summer Collection" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="summer-collection" {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" {...register('type')} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-site-text shadow-sm transition-colors file:border-0 file:bg-transparent file:text-site-text file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value="manual">Manual (add products manually)</option>
                <option value="automatic">Automatic (based on rule)</option>
              </select>
              {errors.type && <p className="text-sm text-red-600">{errors.type.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule">Rule (for automatic collections)</Label>
              <Input id="rule" placeholder="e.g., price > 50" {...register('rule')} />
              {errors.rule && <p className="text-sm text-red-600">{errors.rule.message}</p>}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href={`/dashboard/collections/${id}/products`}>Manage products</Link>
              </Button>
              <Button type="submit" className="w-full" disabled={updateCollectionMutation.isPending}>
                Save collection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
