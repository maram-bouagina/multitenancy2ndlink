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
import { useCreateStore } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';

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

export default function NewStorePage() {
  const router = useRouter();
  const { setCurrentStore } = useAuth();
  const [error, setError] = useState<string>('');
  const createStoreMutation = useCreateStore();

  const { register, handleSubmit, formState: { errors } } = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
  });

  const onSubmit = async (data: StoreForm) => {
    try {
      setError('');
      const store = await createStoreMutation.mutateAsync(data);
      setCurrentStore(store);
      router.push('/dashboard');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to create store'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create a new store</CardTitle>
          <CardDescription>
            Add a new store to your tenant and start managing products.
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
              <Label htmlFor="name">Store name *</Label>
              <Input id="name" placeholder="My store" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input id="slug" placeholder="my-store" {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Input id="currency" placeholder="USD" {...register('currency')} />
                {errors.currency && <p className="text-sm text-red-600">{errors.currency.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language *</Label>
                <Input id="language" placeholder="en" {...register('language')} />
                {errors.language && <p className="text-sm text-red-600">{errors.language.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone *</Label>
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

            <Button type="submit" className="w-full" disabled={createStoreMutation.isPending}>
              Create store
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
