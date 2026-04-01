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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useCreateStore } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';

const LANGUAGES = [
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'ar', label: '🇸🇦 العربية' },
];

const CURRENCIES = [
  'EUR', 'USD', 'GBP', 'TND', 'MAD', 'DZD', 'SAR', 'AED', 'CAD', 'CHF', 'JPY', 'CNY',
];

const storeSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  slug: z.string().min(1, 'Le slug est requis').regex(/^[a-z0-9-]+$/, 'Lettres minuscules, chiffres et tirets uniquement'),
  currency: z.string().min(1, 'La devise est requise'),
  timezone: z.string().min(1, 'Le fuseau horaire est requis'),
  language: z.enum(['fr', 'en', 'ar'], { message: 'La langue est requise' }),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_number: z.string().optional(),
});

type StoreForm = z.infer<typeof storeSchema>;

export default function NewStorePage() {
  const router = useRouter();
  const { setCurrentStore } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState<string>('');
  const createStoreMutation = useCreateStore();

  const timezoneGroups = [
    { group: t.storeCreatePage.northAfrica, zones: ['Africa/Tunis', 'Africa/Casablanca', 'Africa/Algiers', 'Africa/Cairo'] },
    { group: t.storeCreatePage.middleEast, zones: ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Beirut'] },
    { group: t.storeCreatePage.europe, zones: ['Europe/Paris', 'Europe/London', 'Europe/Berlin'] },
    { group: t.storeCreatePage.americas, zones: ['America/New_York', 'America/Chicago', 'America/Los_Angeles'] },
    { group: t.storeCreatePage.universal, zones: ['UTC'] },
  ];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
  });

  const [planError, setPlanError] = useState(false);
  const onSubmit = async (data: StoreForm) => {
    try {
      setError('');
      setPlanError(false);
      const store = await createStoreMutation.mutateAsync(data);
      setCurrentStore(store);
      router.push('/dashboard');
    } catch (error: any) {
      const msg = getApiErrorMessage(error, t.storeCreatePage.createFailed);
      setError(msg);
      if (msg && msg.toLowerCase().includes('plan')) setPlanError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t.storeCreatePage.title}</CardTitle>
          <CardDescription>
            {t.storeCreatePage.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
                {planError && (
                  <div className="mt-2">
                    <a href="/dashboard/settings/plan" className="text-blue-600 underline">{t.storeCreatePage.upgradePlan || 'Upgrade your plan'}</a>
                  </div>
                )}
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t.storeCreatePage.name}</Label>
              <Input id="name" placeholder={t.storeCreatePage.namePlaceholder} {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">{t.storeCreatePage.slug}</Label>
              <Input id="slug" placeholder={t.storeCreatePage.slugPlaceholder} {...register('slug')} />
              {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.storeCreatePage.currency}</Label>
                <Select onValueChange={v => setValue('currency', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.storeCreatePage.currencyPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.currency && <p className="text-sm text-red-600">{errors.currency.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t.storeCreatePage.language}</Label>
                <Select onValueChange={v => setValue('language', v as 'fr' | 'en' | 'ar')}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.storeCreatePage.languagePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.language && <p className="text-sm text-red-600">{errors.language.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.storeCreatePage.timezone}</Label>
                <Select onValueChange={v => setValue('timezone', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.storeCreatePage.timezonePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneGroups.map(g => (
                      <div key={g.group}>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">{g.group}</div>
                        {g.zones.map(z => (
                          <SelectItem key={z} value={z}>{z}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timezone && <p className="text-sm text-red-600">{errors.timezone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.storeCreatePage.email}</Label>
                <Input id="email" type="email" placeholder={t.storeCreatePage.emailPlaceholder} {...register('email')} />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t.storeCreatePage.phone}</Label>
                <Input id="phone" placeholder={t.storeCreatePage.phonePlaceholder} {...register('phone')} />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_number">{t.storeCreatePage.taxNumber}</Label>
                <Input id="tax_number" placeholder={t.storeCreatePage.taxNumberPlaceholder} {...register('tax_number')} />
                {errors.tax_number && <p className="text-sm text-red-600">{errors.tax_number.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t.storeCreatePage.address}</Label>
              <Input id="address" placeholder={t.storeCreatePage.addressPlaceholder} {...register('address')} />
              {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={createStoreMutation.isPending}>
              {createStoreMutation.isPending ? t.storeCreatePage.creating : t.storeCreatePage.create}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
