'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { useTag, useUpdateTag } from '@/lib/hooks/use-api';

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

export default function TagEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';

  const [error, setError] = useState<string>('');

  const { data: tag, isLoading } = useTag(storeId, id || '');
  const updateTagMutation = useUpdateTag();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TagForm>({
    resolver: zodResolver(tagSchema),
  });

  useEffect(() => {
    if (tag) {
      reset({
        name: tag.name,
        slug: tag.slug,
        color: tag.color || '',
      });
    }
  }, [tag, reset]);

  const onSubmit = async (data: TagForm) => {
    if (!id) return;
    try {
      setError('');
      await updateTagMutation.mutateAsync({
        storeId,
        tagId: id,
        data: {
          ...data,
          color: normalizeOptionalColor(data.color),
        },
      });
      router.push('/dashboard/tags');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to update tag'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-600">Loading tag...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Edit Tag</CardTitle>
          <CardDescription>
            Update tag details.
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
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Summer" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="summer" {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color (optional)</Label>
              <Input id="color" placeholder="#34d399" {...register('color')} />
              {errors.color && <p className="text-sm text-red-600">{errors.color.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={updateTagMutation.isPending}>
              Save tag
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
