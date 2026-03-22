'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStore, useUpdateStore } from '@/lib/hooks/use-api';

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  slug: z.string().min(1, 'Slug is required'),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(1, 'Language is required'),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_number: z.string().optional(),
});

type StoreForm = z.infer<typeof storeSchema>;

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: { error?: string } } }).response?.data?.error
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
}

export default function StoreEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');

  const [error, setError] = useState<string>('');

  const { data: store, isLoading } = useStore(id || '');
  const updateStoreMutation = useUpdateStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
  });

  useEffect(() => {
    if (store) {
      reset({
        name: store.name,
        slug: store.slug,
        currency: store.currency,
        timezone: store.timezone,
        language: store.language,
        email: store.email || '',
        phone: store.phone || '',
        address: store.address || '',
        tax_number: store.tax_number || '',
      });
    }
  }, [store, reset]);

  const onSubmit = async (data: StoreForm) => {
    if (!id) return;

    try {
      setError('');
      await updateStoreMutation.mutateAsync({
        id,
        data: {
          name: data.name,
          currency: data.currency,
          timezone: data.timezone,
          language: data.language,
          email: data.email || undefined,
          phone: data.phone || undefined,
          address: data.address || undefined,
          tax_number: data.tax_number || undefined,
        },
      });
      router.push('/dashboard/stores');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update store'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-600">Loading store...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Edit Store</CardTitle>
          <CardDescription>
            Update the settings for this store.
          </CardDescription>
          {id && (
            <div className="pt-2">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/stores/${id}/customize`}>Customize storefront</Link>
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Store name</Label>
              <Input id="name" placeholder="My store" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="my-store" {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" placeholder="USD" {...register('currency')} />
                {errors.currency && <p className="text-sm text-red-600">{errors.currency.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input id="language" placeholder="en" {...register('language')} />
                {errors.language && <p className="text-sm text-red-600">{errors.language.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" placeholder="UTC" {...register('timezone')} />
                {errors.timezone && <p className="text-sm text-red-600">{errors.timezone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" placeholder="contact@store.com" {...register('email')} />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+1 555 555 555" {...register('phone')} />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_number">Tax number</Label>
                <Input id="tax_number" placeholder="123-45-6789" {...register('tax_number')} />
                {errors.tax_number && <p className="text-sm text-red-600">{errors.tax_number.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="123 Main St" {...register('address')} />
              {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={updateStoreMutation.isPending}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
