'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStore, useUpdateStore, useUpdateStoreStatus } from '@/lib/hooks/use-api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useLanguage } from '@/lib/hooks/use-language';
import {
  Globe,
  Info,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { value: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
] as const;

const CURRENCIES = ['EUR', 'USD', 'GBP', 'TND', 'MAD', 'DZD', 'SAR', 'AED', 'CAD', 'CHF', 'JPY', 'CNY'] as const;

const TIMEZONE_GROUPS = [
  { key: 'northAfrica', zones: ['Africa/Tunis', 'Africa/Casablanca', 'Africa/Algiers', 'Africa/Cairo', 'Africa/Tripoli'] },
  { key: 'middleEast', zones: ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Beirut'] },
  { key: 'europe', zones: ['Europe/Paris', 'Europe/London', 'Europe/Berlin'] },
  { key: 'americas', zones: ['America/New_York', 'America/Chicago', 'America/Los_Angeles'] },
  { key: 'universal', zones: ['UTC'] },
] as const;

type GeneralForm = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
};

type LocaleForm = {
  language: 'fr' | 'en' | 'ar';
  currency: string;
  timezone: string;
};

type MaintenanceForm = {
  maintenance_message?: string;
};

type Tab = 'general' | 'localize' | 'status';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    inactive: 'secondary',
    suspended: 'destructive',
  };
  return <Badge variant={variants[status] ?? 'outline'}>{labels[status] ?? status}</Badge>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StoreEditPage() {
  const params = useParams();
  const { t } = useLanguage();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');

  const generalSchema = z.object({
    name: z.string().min(1, t.storeSettingsPage.validation.nameRequired),
    email: z.string().email(t.storeSettingsPage.validation.emailInvalid).optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    tax_number: z.string().optional(),
  });

  const localeSchema = z.object({
    language: z.enum(['fr', 'en', 'ar']),
    currency: z.string().min(1, t.storeSettingsPage.validation.currencyRequired),
    timezone: z.string().min(1, t.storeSettingsPage.validation.timezoneRequired),
  });

  const maintenanceSchema = z.object({
    maintenance_message: z.string().max(500, t.storeSettingsPage.validation.maintenanceMax).optional(),
  });

  const statusLabels = {
    active: t.storeSettingsPage.statusLabels.active,
    inactive: t.storeSettingsPage.statusLabels.inactive,
    suspended: t.storeSettingsPage.statusLabels.suspended,
  };

  const timezoneGroups = [
    { group: t.storeCreatePage.northAfrica, zones: TIMEZONE_GROUPS[0].zones },
    { group: t.storeCreatePage.middleEast, zones: TIMEZONE_GROUPS[1].zones },
    { group: t.storeCreatePage.europe, zones: TIMEZONE_GROUPS[2].zones },
    { group: t.storeCreatePage.americas, zones: TIMEZONE_GROUPS[3].zones },
    { group: t.storeCreatePage.universal, zones: TIMEZONE_GROUPS[4].zones },
  ];

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slugCopied, setSlugCopied] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const { data: store, isLoading } = useStore(id || '');
  const updateStore = useUpdateStore();
  const updateStatus = useUpdateStoreStatus();

  // ── General form ────────────────────────────────────────────────────────────
  const generalForm = useForm<GeneralForm>({ resolver: zodResolver(generalSchema) });

  // ── Locale form ─────────────────────────────────────────────────────────────
  const localeForm = useForm<LocaleForm>({ resolver: zodResolver(localeSchema) });

  // ── Maintenance form ────────────────────────────────────────────────────────
  const maintenanceForm = useForm<MaintenanceForm>({ resolver: zodResolver(maintenanceSchema) });

  useEffect(() => {
    if (store) {
      generalForm.reset({
        name: store.name,
        email: store.email ?? '',
        phone: store.phone ?? '',
        address: store.address ?? '',
        tax_number: store.tax_number ?? '',
      });
      localeForm.reset({
        language: (store.language as 'fr' | 'en' | 'ar') ?? 'fr',
        currency: store.currency,
        timezone: store.timezone,
      });
      maintenanceForm.reset({
        maintenance_message: store.maintenance_message ?? '',
      });
    }
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const notify = (msg: string) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 3500);
  };

  const copySlug = () => {
    if (store?.slug) {
      navigator.clipboard.writeText(store.slug);
      setSlugCopied(true);
      setTimeout(() => setSlugCopied(false), 2000);
    }
  };

  // ── Submit handlers ──────────────────────────────────────────────────────────

  const onSaveGeneral = async (data: GeneralForm) => {
    if (!id) return;
    try {
      setError('');
      await updateStore.mutateAsync({
        id,
        data: {
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          address: data.address || undefined,
          tax_number: data.tax_number || undefined,
        },
      });
      notify(t.storeSettingsPage.updateGeneralSuccess);
    } catch (err) {
      setError(getApiErrorMessage(err, t.storeSettingsPage.updateFailed));
    }
  };

  const onSaveLocale = async (data: LocaleForm) => {
    if (!id) return;
    try {
      setError('');
      await updateStore.mutateAsync({ id, data });
      notify(t.storeSettingsPage.updateLocaleSuccess);
    } catch (err) {
      setError(getApiErrorMessage(err, t.storeSettingsPage.updateFailed));
    }
  };

  const onSaveMaintenance = async (data: MaintenanceForm) => {
    if (!id) return;
    try {
      setError('');
      await updateStore.mutateAsync({
        id,
        data: { maintenance_message: data.maintenance_message || undefined },
      });
      notify(t.storeSettingsPage.updateMessageSuccess);
    } catch (err) {
      setError(getApiErrorMessage(err, t.storeSettingsPage.updateFailed));
    }
  };

  const handleDeactivate = async () => {
    if (!id) return;
    try {
      setDeactivateOpen(false);
      setError('');
      await updateStatus.mutateAsync({ id, data: { status: 'inactive' } });
      notify(t.storeSettingsPage.deactivateSuccess);
    } catch (err) {
      setError(getApiErrorMessage(err, t.storeSettingsPage.deactivateFailed));
    }
  };

  const handleReactivate = async () => {
    if (!id) return;
    try {
      setReactivateOpen(false);
      setError('');
      await updateStatus.mutateAsync({ id, data: { status: 'active' } });
      notify(t.storeSettingsPage.reactivateSuccess);
    } catch (err) {
      setError(getApiErrorMessage(err, t.storeSettingsPage.reactivateFailed));
    }
  };

  const selectedLanguage = useWatch({ control: localeForm.control, name: 'language' });
  const selectedCurrency = useWatch({ control: localeForm.control, name: 'currency' });
  const selectedTimezone = useWatch({ control: localeForm.control, name: 'timezone' });
  const selectedLang = LANGUAGES.find(l => l.value === selectedLanguage);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">{t.storeSettingsPage.loading}</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">{t.storeSettingsPage.notFound}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 font-mono">{store.slug}</span>
            <button
              onClick={copySlug}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title={t.storeSettingsPage.copySlug}
            >
              {slugCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <StatusBadge status={store.status} labels={statusLabels} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/store/${store.slug}`} target="_blank">
              <ExternalLink className="w-4 h-4 mr-1" />
              {t.storeSettingsPage.viewStore}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/dashboard/stores/${id}/editor`}>Store Builder</Link>
          </Button>
          <Link href={`/dashboard/stores/${id}/pages`}>
            <Button variant="outline" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 006.5 22h11a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0017.5 2h-11A2.5 2.5 0 004 4.5v15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h8M8 10h8M8 14h6" /></svg>
              Gérer les pages
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Maintenance banner ─────────────────────────────────────────────── */}
      {store.status === 'inactive' && (
        <Alert variant="destructive" className="border-orange-400 bg-orange-50 text-orange-900">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <AlertDescription>
            <strong>{t.storeSettingsPage.maintenanceBannerTitle}</strong> {t.storeSettingsPage.maintenanceBannerDesc}
          </AlertDescription>
        </Alert>
      )}
      {store.status === 'suspended' && (
        <Alert variant="destructive">
          <ShieldAlert className="w-4 h-4" />
          <AlertDescription>
            <strong>{t.storeSettingsPage.suspendedBannerTitle}</strong> {t.storeSettingsPage.suspendedBannerDesc}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Global feedback ───────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-400 bg-green-50 text-green-800">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card className="border-blue-200 bg-blue-50/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Store Builder</CardTitle>
          <CardDescription>
            Theme, branding, and drag-and-drop storefront editing now live in one page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div>
            <p className="font-medium text-slate-900">What you can edit there</p>
            <p>Colors, font, logo, theme mode, homepage blocks, titles, text, buttons, images, and storefront section layouts.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href={`/dashboard/stores/${id}/editor`}>Open Store Builder</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/dashboard/stores/${id}/storefront?preview=true`} target="_blank">Preview Draft</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {([
            { id: 'general',  icon: Info,       label: t.storeSettingsPage.generalTab },
            { id: 'localize', icon: Globe,       label: t.storeSettingsPage.localizationTab },
            { id: 'status',   icon: ShieldAlert, label: t.storeSettingsPage.statusTab },
          ] as const).map(({ id: tabId, icon: Icon, label }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tabId
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — Informations générales
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>{t.storeSettingsPage.generalTitle}</CardTitle>
            <CardDescription>{t.storeSettingsPage.generalDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generalForm.handleSubmit(onSaveGeneral)} className="space-y-5">

              {/* Slug — read-only */}
              <div className="space-y-1.5">
                <Label>{t.storeSettingsPage.publicSlug}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={store.slug}
                    readOnly
                    className="font-mono bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <button type="button" onClick={copySlug} className="shrink-0 text-gray-400 hover:text-gray-700">
                    {slugCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{t.storeSettingsPage.slugImmutable}</p>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.storeCreatePage.name}</Label>
                <Input id="name" placeholder={t.storeCreatePage.namePlaceholder} {...generalForm.register('name')} />
                {generalForm.formState.errors.name && (
                  <p className="text-sm text-red-600">{generalForm.formState.errors.name.message}</p>
                )}
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t.storeCreatePage.email}</Label>
                  <Input id="email" type="email" placeholder={t.storeCreatePage.emailPlaceholder} {...generalForm.register('email')} />
                  {generalForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{generalForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t.storeCreatePage.phone}</Label>
                  <Input id="phone" placeholder={t.storeCreatePage.phonePlaceholder} {...generalForm.register('phone')} />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address">{t.storeCreatePage.address}</Label>
                <Input id="address" placeholder={t.storeCreatePage.addressPlaceholder} {...generalForm.register('address')} />
              </div>

              {/* Tax number */}
              <div className="space-y-1.5">
                <Label htmlFor="tax_number">{t.storeCreatePage.taxNumber}</Label>
                <Input id="tax_number" placeholder={t.storeCreatePage.taxNumberPlaceholder} {...generalForm.register('tax_number')} />
              </div>

              <Button type="submit" disabled={updateStore.isPending}>
                {updateStore.isPending ? t.storeSettingsPage.processing : t.storeSettingsPage.saveChanges}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — Localisation
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'localize' && (
        <Card>
          <CardHeader>
            <CardTitle>{t.storeSettingsPage.localizationTitle}</CardTitle>
            <CardDescription>{t.storeSettingsPage.localizationDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={localeForm.handleSubmit(onSaveLocale)} className="space-y-5">

              {/* Language */}
              <div className="space-y-1.5">
                <Label>{t.storeCreatePage.language}</Label>
                <Select
                  value={selectedLanguage}
                  onValueChange={v => localeForm.setValue('language', v as 'fr' | 'en' | 'ar')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.storeCreatePage.languagePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.value} value={l.value}>
                        <span className="mr-2">{l.flag}</span>{l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {localeForm.formState.errors.language && (
                  <p className="text-sm text-red-600">{localeForm.formState.errors.language.message}</p>
                )}
                {selectedLang?.dir === 'rtl' && (
                  <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                    ℹ️ {t.storeSettingsPage.rtlNote}
                  </p>
                )}
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <Label>{t.storeCreatePage.currency}</Label>
                <Select
                  value={selectedCurrency}
                  onValueChange={v => localeForm.setValue('currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.storeCreatePage.currencyPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {localeForm.formState.errors.currency && (
                  <p className="text-sm text-red-600">{localeForm.formState.errors.currency.message}</p>
                )}
              </div>

              {/* Timezone */}
              <div className="space-y-1.5">
                <Label>{t.storeCreatePage.timezone}</Label>
                <Select
                  value={selectedTimezone}
                  onValueChange={v => localeForm.setValue('timezone', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.storeCreatePage.timezonePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneGroups.map(group => (
                      <div key={group.group}>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {group.group}
                        </div>
                        {group.zones.map(z => (
                          <SelectItem key={z} value={z}>{z}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {localeForm.formState.errors.timezone && (
                  <p className="text-sm text-red-600">{localeForm.formState.errors.timezone.message}</p>
                )}
              </div>

              <Button type="submit" disabled={updateStore.isPending}>
                {updateStore.isPending ? t.storeSettingsPage.processing : t.storeSettingsPage.saveLocalization}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 — Statut & Maintenance
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'status' && (
        <div className="space-y-5">

          {/* Current status */}
          <Card>
            <CardHeader>
              <CardTitle>{t.storeSettingsPage.currentStatusTitle}</CardTitle>
              <CardDescription>{t.storeSettingsPage.currentStatusDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <StatusBadge status={store.status} labels={statusLabels} />
                  <p className="text-sm text-gray-500 mt-1">
                    {store.status === 'active' && t.storeSettingsPage.activeStoreDesc}
                    {store.status === 'inactive' && t.storeSettingsPage.inactiveStoreDesc}
                    {store.status === 'suspended' && t.storeSettingsPage.suspendedStoreDesc}
                  </p>
                </div>
                {store.status === 'active' && (
                  <Button
                    variant="outline"
                    className="border-orange-400 text-orange-700 hover:bg-orange-50"
                    onClick={() => setDeactivateOpen(true)}
                  >
                    {t.storeSettingsPage.putInMaintenance}
                  </Button>
                )}
                {store.status === 'inactive' && (
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setReactivateOpen(true)}
                  >
                    {t.storeSettingsPage.reactivateStore}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Maintenance message */}
          <Card>
            <CardHeader>
              <CardTitle>{t.storeSettingsPage.maintenanceMessageTitle}</CardTitle>
              <CardDescription>{t.storeSettingsPage.maintenanceMessageDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={maintenanceForm.handleSubmit(onSaveMaintenance)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maintenance_message">{t.storeSettingsPage.customMessage}</Label>
                  <Textarea
                    id="maintenance_message"
                    rows={3}
                    placeholder={t.storeSettingsPage.maintenancePlaceholder}
                    {...maintenanceForm.register('maintenance_message')}
                  />
                  {maintenanceForm.formState.errors.maintenance_message && (
                    <p className="text-sm text-red-600">
                      {maintenanceForm.formState.errors.maintenance_message.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {t.storeSettingsPage.maintenanceDefault}
                  </p>
                </div>
                <Button type="submit" variant="outline" disabled={updateStore.isPending}>
                  {updateStore.isPending ? t.storeSettingsPage.processing : t.storeSettingsPage.saveMessage}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info about suspended status */}
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="pt-5">
              <p className="text-sm text-gray-600">{t.storeSettingsPage.suspendedInfo}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Confirm deactivation dialog ─────────────────────────────────── */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.storeSettingsPage.deactivateDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.storeSettingsPage.deactivateDialogDesc.replace('{name}', store.name)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>{t.storeSettingsPage.cancel}</Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? t.storeSettingsPage.processing : t.storeSettingsPage.confirmMaintenance}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm reactivation dialog ─────────────────────────────────── */}
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.storeSettingsPage.reactivateDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.storeSettingsPage.reactivateDialogDesc.replace('{name}', store.name)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateOpen(false)}>{t.storeSettingsPage.cancel}</Button>
            <Button
              onClick={handleReactivate}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? t.storeSettingsPage.processing : t.storeSettingsPage.reactivate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

