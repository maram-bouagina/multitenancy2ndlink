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
import { useCreateTag } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';

const tagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  color: z.string().optional(),
});

type TagForm = z.infer<typeof tagSchema>;

function normalizeOptionalColor(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export default function NewTagPage() {
  const router = useRouter();
  const { currentStore } = useAuth();
  const storeId = currentStore?.id || '';
  const [error, setError] = useState<string>('');
  const createTagMutation = useCreateTag();

  const { register, handleSubmit, formState: { errors } } = useForm<TagForm>({
    resolver: zodResolver(tagSchema),
  });

  const onSubmit = async (data: TagForm) => {
    if (!storeId) {
      setError('Select a store first.');
      return;
    }

    try {
      setError('');
      await createTagMutation.mutateAsync({
        storeId,
        data: {
          ...data,
          color: normalizeOptionalColor(data.color),
        },
      });
      router.push('/dashboard/tags');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to create tag'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create tag</CardTitle>
          <CardDescription>
            Tags are used to group and filter products.
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
              <Input id="name" placeholder="Summer" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input id="slug" placeholder="summer" {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color (optional)</Label>
              <Input id="color" placeholder="#34d399" {...register('color')} />
              {errors.color && <p className="text-sm text-red-600">{errors.color.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={createTagMutation.isPending}>
              Create tag
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
