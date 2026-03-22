'use client';

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
import { useAuth } from '@/lib/hooks/use-auth';
import { useCreateCollection } from '@/lib/hooks/use-api';

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  type: z.enum(['manual', 'automatic']),
  rule: z.string().optional(),
});

type CollectionForm = z.infer<typeof collectionSchema>;

export default function NewCollectionPage() {
  const router = useRouter();
  const { currentStore } = useAuth();
  const storeId = currentStore?.id || '';
  const [error, setError] = useState<string>('');
  const createCollectionMutation = useCreateCollection();

  const { register, handleSubmit, formState: { errors } } = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
    defaultValues: { type: 'manual' },
  });

  const onSubmit = async (data: CollectionForm) => {
    if (!storeId) {
      setError('Select a store first.');
      return;
    }

    try {
      setError('');
      await createCollectionMutation.mutateAsync({ storeId, data });
      router.push('/dashboard/collections');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to create collection'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create collection</CardTitle>
          <CardDescription>
            Group products into collections for better discovery.
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
              <Input id="name" placeholder="Summer Collection" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="summer-collection" {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
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

            <Button type="submit" className="w-full" disabled={createCollectionMutation.isPending}>
              Create collection
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
