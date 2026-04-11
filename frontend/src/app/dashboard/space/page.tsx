'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { storeWithRoleToStore } from '@/lib/hooks/use-auth';
import { resolveMediaUrl } from '@/lib/api/media-url';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  ArrowRight,
  Briefcase,
  Shield,
  Users,
} from 'lucide-react';
import { StoreWithRole } from '@/lib/types';

interface StoreCardProps {
  store: StoreWithRole;
  onAccess: (store: StoreWithRole) => void;
}

function StoreCard({ store, onAccess }: StoreCardProps) {
  const roleName = store.store_role_name || store.role;
  const isOwner = store.role === 'owner';

  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onAccess(store)}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          {/* Store logo / colour initial */}
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-lg"
            style={{ backgroundColor: store.theme_primary_color || '#3b82f6' }}
          >
            {store.logo ? (
              <img
                src={resolveMediaUrl(store.logo)}
                alt={store.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <Store className="h-6 w-6" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 truncate">{store.name}</p>
              {isOwner ? (
                <Badge variant="outline" className="text-xs shrink-0 border-amber-300 text-amber-700 bg-amber-50">
                  <Shield className="h-3 w-3 mr-1" />
                  Owner
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs shrink-0 border-blue-300 text-blue-700 bg-blue-50">
                  {roleName}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500 truncate">{store.slug}</span>
              {!isOwner && store.owner_name && (
                <span className="text-xs text-gray-400">Owner: {store.owner_name}</span>
              )}
            </div>
          </div>

          {/* Action */}
          <Button
            size="sm"
            className="shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onAccess(store);
            }}
          >
            Access
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffSpacePage() {
  const router = useRouter();
  const { myStores, isLoading, setSelectedStaffStore, setCurrentStore, canUseTenantWorkspace } = useAuth();

  const ownedStores = myStores.filter((s) => s.role === 'owner');
  const staffStores = myStores.filter((s) => s.role !== 'owner');

  function handleAccessStore(store: StoreWithRole) {
    if (store.role === 'owner') {
      // Owned store: set as the merchant's active store (no X-Store-Id header needed)
      setCurrentStore(storeWithRoleToStore(store));
    } else {
      // Staff store: set X-Store-Id header and staff context
      setSelectedStaffStore(store.id);
    }
    router.push('/dashboard');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading your spaces…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Spaces</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {myStores.length === 0
              ? "You haven't joined any stores yet."
              : `You have access to ${myStores.length} store${myStores.length === 1 ? '' : 's'}. Select one to start working.`}
          </p>
        </div>
      </div>

      {/* My Stores — owned */}
      {ownedStores.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5" />
            My Stores
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ownedStores.map((store) => (
              <StoreCard key={store.id} store={store} onAccess={handleAccessStore} />
            ))}
          </div>
        </section>
      )}

      {/* Stores I Work In — staff memberships */}
      {staffStores.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" />
            Stores I Work In
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {staffStores.map((store) => (
              <StoreCard key={store.id} store={store} onAccess={handleAccessStore} />
            ))}
          </div>
        </section>
      )}

      {canUseTenantWorkspace && ownedStores.length === 0 && (
        <Card className="border-dashed border-blue-200 bg-blue-50/40">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-800">Tenant interface</p>
              <p className="text-sm text-gray-600">
                Open your tenant workspace to create your own store, while keeping access to staff stores here.
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard/stores')}>Open tenant interface</Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {myStores.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Store className="h-7 w-7 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700">No stores yet</p>
            <p className="text-sm text-gray-500 max-w-xs">
              {canUseTenantWorkspace
                ? 'Open the Stores page to create your first store.'
                : 'Wait for a store owner to invite you, or upgrade your account from Settings.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
