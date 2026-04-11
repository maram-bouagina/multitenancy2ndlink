'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Store,
  ChevronDown,
  Star,
  Clock,
  LayoutGrid,
  Check,
} from 'lucide-react';
import { StoreWithRole } from '@/lib/types';

function StorePickerItem({
  store,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  store: StoreWithRole;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <DropdownMenuItem
      className="flex items-center gap-2 cursor-pointer pr-2 group"
      onSelect={() => onSelect(store.id)}
    >
      <div
        className="h-5 w-5 rounded flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: store.theme_primary_color || '#3b82f6' }}
      >
        <Store className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-none">{store.name}</p>
        <p className="truncate text-xs text-gray-400 mt-0.5">
          {store.role === 'owner' ? 'Owner' : (store.store_role_name || store.role)}
        </p>
      </div>
      {isActive && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
      <button
        type="button"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100"
        onClick={(e) => onToggleFavorite(store.id, e)}
        aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
      >
        <Star
          className={`h-3.5 w-3.5 transition-colors ${
            isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
          }`}
        />
      </button>
    </DropdownMenuItem>
  );
}

export function QuickStoreSwitcher() {
  const router = useRouter();
  const {
    currentStore,
    myStores,
    selectedStaffStoreId,
    setSelectedStaffStore,
    favoriteStores,
    recentStores,
    toggleFavoriteStore,
  } = useAuth();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  // All stores the user can access
  const allStores = myStores;

  const favStores = useMemo(
    () => allStores.filter((s) => favoriteStores.includes(s.id)),
    [allStores, favoriteStores],
  );

  const recentStoresList = useMemo(
    () =>
      recentStores
        .map((id) => allStores.find((s) => s.id === id))
        .filter(Boolean) as StoreWithRole[],
    [recentStores, allStores],
  );

  const queryFiltered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allStores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q),
    );
  }, [query, allStores]);

  function handleSelect(storeId: string) {
    setSelectedStaffStore(storeId);
    setOpen(false);
    setQuery('');
    router.push('/dashboard');
  }

  function handleToggleFavorite(storeId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteStore(storeId);
  }

  if (allStores.length === 0) return null;

  const activeId = selectedStaffStoreId ?? currentStore?.id ?? null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex items-center gap-2 rounded-lg border bg-gray-50 px-3 h-8 text-sm font-medium text-gray-700 hover:bg-gray-100 max-w-50"
        >
          <Store className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">
            {currentStore?.name ?? 'Select store'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-2" side="bottom">
        {/* Search */}
        <div className="pb-2">
          <Input
            placeholder="Search stores…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        {/* Search results */}
        {query.trim() ? (
          queryFiltered.length > 0 ? (
            <>
              <DropdownMenuLabel className="text-[11px] text-gray-400 pb-1 pt-0">Results</DropdownMenuLabel>
              {queryFiltered.map((store) => (
                <StorePickerItem
                  key={store.id}
                  store={store}
                  isActive={store.id === activeId}
                  isFavorite={favoriteStores.includes(store.id)}
                  onSelect={handleSelect}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">No stores match "{query}"</p>
          )
        ) : (
          <>
            {/* Favourites */}
            {favStores.length > 0 && (
              <>
                <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] text-gray-400 pb-1 pt-0">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  Favourites
                </DropdownMenuLabel>
                {favStores.map((store) => (
                  <StorePickerItem
                    key={store.id}
                    store={store}
                    isActive={store.id === activeId}
                    isFavorite={true}
                    onSelect={handleSelect}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
                <DropdownMenuSeparator className="my-1.5" />
              </>
            )}

            {/* Recent */}
            {recentStoresList.length > 0 && (
              <>
                <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] text-gray-400 pb-1 pt-0">
                  <Clock className="h-3 w-3" />
                  Recent
                </DropdownMenuLabel>
                {recentStoresList.slice(0, 5).map((store) => (
                  <StorePickerItem
                    key={store.id}
                    store={store}
                    isActive={store.id === activeId}
                    isFavorite={favoriteStores.includes(store.id)}
                    onSelect={handleSelect}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
                {allStores.length > recentStoresList.length && (
                  <DropdownMenuSeparator className="my-1.5" />
                )}
              </>
            )}

            {/* All stores (when no recent data yet) */}
            {recentStoresList.length === 0 && (
              <>
                {allStores.map((store) => (
                  <StorePickerItem
                    key={store.id}
                    store={store}
                    isActive={store.id === activeId}
                    isFavorite={favoriteStores.includes(store.id)}
                    onSelect={handleSelect}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
                <DropdownMenuSeparator className="my-1.5" />
              </>
            )}
          </>
        )}

        {/* See All */}
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-blue-600 font-medium text-sm mt-0.5"
          onSelect={() => { setOpen(false); router.push('/dashboard/space'); }}
        >
          <LayoutGrid className="h-4 w-4" />
          See all stores
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
