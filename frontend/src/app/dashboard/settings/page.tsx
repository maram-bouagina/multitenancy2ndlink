'use client';

import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Shield, Bell, Globe, Store, Check } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/use-language';
import { useAuth } from '@/lib/hooks/use-auth';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { currentStore, stores, setCurrentStore } = useAuth();

  const settingsItems = [
    {
      title: t.settings.profile,
      description: t.settings.profileDesc,
      href: '/dashboard/settings/profile',
      icon: User,
      disabled: false,
    },
    {
      title: t.settings.security,
      description: t.settings.securityDesc,
      href: '/dashboard/settings/security',
      icon: Shield,
      disabled: false,
    },
    {
      title: t.settings.language,
      description: t.settings.languageDesc,
      href: '/dashboard/settings/language',
      icon: Globe,
      disabled: false,
    },
    {
      title: t.plan.planAndLimits,
      description: t.plan.planAndLimitsDesc,
      href: '/dashboard/settings/plan',
      icon: Shield,
      disabled: false,
    },
    {
      title: t.settings.notifications,
      description: t.settings.notificationsDesc,
      href: '/dashboard/settings',
      icon: Bell,
      disabled: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.settings.title}</h1>
        <p className="text-gray-500 mt-1">{t.settings.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
          <Link
            key={item.title}
            href={item.disabled ? '#' : item.href}
            className={item.disabled ? 'opacity-50 cursor-not-allowed' : 'block'}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <item.icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="text-sm">{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Store selector */}
      {stores.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t.header.yourStores}</h2>
            <p className="text-sm text-gray-500">{t.settings.storeSelectDesc}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => {
              const isActive = currentStore?.id === store.id;
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setCurrentStore(store)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isActive ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Store className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                      {store.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{store.slug}</p>
                  </div>
                  {isActive && <Check className="h-5 w-5 shrink-0 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
