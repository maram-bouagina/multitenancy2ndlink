'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronDown, Store, LayoutGrid } from 'lucide-react';

export function StaffPlatformWidget() {
  const router = useRouter();
  const { myStores, selectedStaffStoreId, setSelectedStaffStore } = useAuth();

  // Only show when the user has explicitly entered a staff-mode store context
  if (!selectedStaffStoreId) return null;

  const activeStore = myStores.find((s) => s.id === selectedStaffStoreId);
  if (!activeStore) return null;

  const roleName =
    activeStore.role === 'owner'
      ? 'Owner'
      : activeStore.store_role_name || activeStore.role;

  const otherStores = myStores.filter((s) => s.id !== activeStore.id);

  function handleBack() {
    setSelectedStaffStore(null);
    router.push('/dashboard/space');
  }

  function handleSwitchStore(storeId: string) {
    setSelectedStaffStore(storeId);
    router.push('/dashboard');
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
      {/* Store colour dot + name */}
      <div
        className="h-6 w-6 rounded flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: activeStore.theme_primary_color || '#3b82f6' }}
      >
        <Store className="h-3.5 w-3.5" />
      </div>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-medium text-blue-900 truncate">{activeStore.name}</span>
        <Badge variant="outline" className="shrink-0 text-xs border-blue-300 text-blue-700 bg-white">
          {roleName}
        </Badge>
      </div>

      {/* Store switcher dropdown */}
      {otherStores.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-7 text-xs text-blue-700 hover:bg-blue-100"
            >
              Switch
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {otherStores.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => handleSwitchStore(s.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div
                  className="h-5 w-5 rounded flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: s.theme_primary_color || '#3b82f6' }}
                >
                  <Store className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{s.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {s.role === 'owner' ? 'Owner' : (s.store_role_name || s.role)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { setSelectedStaffStore(null); router.push('/dashboard/space'); }}
              className="flex items-center gap-2 cursor-pointer text-gray-500"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              All my spaces
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Back to Staff Space */}
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto shrink-0 h-7 text-xs text-blue-700 hover:bg-blue-100"
        onClick={handleBack}
      >
        <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
        My Spaces
      </Button>
    </div>
  );
}
