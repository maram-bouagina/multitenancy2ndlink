'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Shield, Bell, Globe, Info, Paintbrush } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/use-language';
import { useAuth } from '@/lib/hooks/use-auth';
import { apiClient } from '@/lib/api/client';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { currentStore, currentMemberPermissions, user, hasOwnedStoreAccess, canUseTenantWorkspace, selectedStaffStoreId, setSelectedStaffStore, logout } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  async function handleDeleteAccount() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      setIsDeleting(true);
      await apiClient.deleteOwnAccount();
      logout();
      window.location.href = '/auth/login';
    } catch {
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  }

  // Determines whether the current user can manage store settings for the active store.
  // - null = owner (all permissions)
  // - array containing 'store:settings_edit' = staff with that permission
  const canEditStore =
    currentMemberPermissions === null ||
    currentMemberPermissions.includes('store:settings_edit');

  // Plan page is only meaningful for merchants/platform admins
  const isMerchantOrAdmin = canUseTenantWorkspace;
  // Show the tenant interface card whenever the user has a tenant workspace,
  // even if they're currently in a staff store — clicking it exits staff mode.
  const canOpenTenantInterface = canUseTenantWorkspace;

  async function handleUpgrade() {
    try {
      setIsUpgrading(true);
      setUpgradeError('');
      await apiClient.upgradeToMerchant();
      // Clear staff store from localStorage so the stores page loads in owner mode
      setSelectedStaffStore(null);
      window.location.href = '/dashboard/stores';
    } catch {
      setUpgradeError('Upgrade failed. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  }

  const accountItems = [
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
    ...(isMerchantOrAdmin
      ? [
          {
            title: t.plan.planAndLimits,
            description: t.plan.planAndLimitsDesc,
            href: '/dashboard/settings/plan',
            icon: Shield,
            disabled: false,
          },
        ]
      : []),
    {
      title: t.settings.notifications,
      description: t.settings.notificationsDesc,
      href: '/dashboard/settings',
      icon: Bell,
      disabled: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.settings.title}</h1>
        <p className="text-gray-500 mt-1">{t.settings.subtitle}</p>
      </div>

      {!canUseTenantWorkspace && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Account Actions
          </h2>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Upgrade to tenant</CardTitle>
                  <CardDescription className="text-sm">
                    Upgrade here first. Then you can open the tenant interface, create your own store, and still work in other stores as staff.
                  </CardDescription>
                  {upgradeError && <p className="mt-2 text-sm text-red-600">{upgradeError}</p>}
                </div>
                <Button onClick={handleUpgrade} disabled={isUpgrading}>
                  {isUpgrading ? 'Upgrading…' : 'Upgrade account'}
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {canOpenTenantInterface && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Tenant Interface
          </h2>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Open tenant interface</CardTitle>
                  <CardDescription className="text-sm">
                    {hasOwnedStoreAccess
                      ? 'Manage your own stores while keeping your staff memberships available in My Spaces.'
                      : 'Open the tenant interface to create your first store and become its owner.'}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setSelectedStaffStore(null);
                    window.location.href = '/dashboard/stores';
                  }}
                >
                  Open Stores
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* ── Store Actions: only when a store is active and user can edit it ── */}
      {currentStore && canEditStore && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            {t.settings.storeActions}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href={`/dashboard/stores/${currentStore.id}`} className="block">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                      <Info className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.settings.storeInfo}</CardTitle>
                      <CardDescription className="text-sm">{t.settings.storeInfoDesc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href={`/dashboard/stores/${currentStore.id}/editor`} className="block">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                      <Paintbrush className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.settings.storeBuilder}</CardTitle>
                      <CardDescription className="text-sm">{t.settings.storeBuilderDesc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* ── Account & Preferences ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          {t.settings.profile}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accountItems.map((item) => (
            <Link
              key={item.href + item.title}
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
      </div>

      {/* ⚠ DANGER ZONE – temporary dev tool */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400">
          ⚠ Danger Zone (dev only)
        </h2>
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base text-red-700">Delete account</CardTitle>
                <CardDescription className="text-sm">
                  Permanently deletes this account, all stores, schema, memberships and sessions.
                  {user && <span className="block mt-1 text-xs text-gray-400">User: {user.email} ({user.id})</span>}
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : deleteConfirm ? '⚠ Confirm delete' : 'Delete account'}
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
