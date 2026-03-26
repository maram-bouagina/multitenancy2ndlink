'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ListPagination } from '@/components/dashboard/list-pagination';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useStores, useDeleteStore } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import type { Store } from '@/lib/types';
import { Search, Settings2, Palette, Trash2 } from 'lucide-react';

export default function StoresPage() {
  const PAGE_SIZE = 10;
  const router = useRouter();
  const { currentStore, setCurrentStore, isAuthenticated, refreshStores } = useAuth();
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const { data: stores, isLoading } = useStores(isAuthenticated);
  const deleteStoreMutation = useDeleteStore();
  const allStores = stores ?? [];
  const filteredStores = allStores.filter((store) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || store.name.toLowerCase().includes(query) || store.slug.toLowerCase().includes(query);
    const matchesStatus = !statusFilter || store.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pageCount = Math.max(1, Math.ceil(filteredStores.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedStores = filteredStores.slice(pageStart, pageStart + PAGE_SIZE);
  const currentPageIds = paginatedStores.map((store) => store.id);
  const validSelectedStoreIds = selectedStoreIds.filter((id) => allStores.some((store) => store.id === id));

  const handleSelectStore = (store: Store) => {
    setCurrentStore(store);
    router.push('/dashboard');
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.storesPage.deleteConfirm)) return;
    try {
      await deleteStoreMutation.mutateAsync(id);
      await refreshStores();
    } catch (error: unknown) {
      console.error(getApiErrorMessage(error, t.storesPage.deleteFailed));
    }
  };

  const handleDeleteSelected = async () => {
    if (validSelectedStoreIds.length === 0) return;
    if (!confirm(t.storesPage.deleteSelectedConfirm.replace('{count}', String(validSelectedStoreIds.length)))) return;
    try {
      await Promise.all(validSelectedStoreIds.map((storeId) => deleteStoreMutation.mutateAsync(storeId)));
      setSelectedStoreIds([]);
      await refreshStores();
    } catch (error: unknown) {
      console.error(getApiErrorMessage(error, t.storesPage.deleteFailed));
    }
  };

  const toggleStoreSelection = (storeId: string, checked: boolean) => {
    setSelectedStoreIds((current) => (
      checked ? Array.from(new Set([...current, storeId])) : current.filter((id) => id !== storeId)
    ));
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedStoreIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...currentPageIds]));
      }
      return current.filter((id) => !currentPageIds.includes(id));
    });
  };

  const getStatusLabel = (status?: string) => status || t.storesPage.active;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.storesPage.title}</h1>
          <p className="text-gray-600">{t.storesPage.subtitle}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/stores/new">
            {t.storesPage.createStore}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.storesPage.allStores}</CardTitle>
          <CardDescription>
            {t.storesPage.allStoresDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col gap-3 md:max-w-xl md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                  placeholder="Search stores by name or slug..."
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={validSelectedStoreIds.length === 0 || deleteStoreMutation.isPending}
              onClick={() => void handleDeleteSelected()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t.productsPage.deleteSelected} ({validSelectedStoreIds.length})
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={currentPageIds.length > 0 && currentPageIds.every((id) => validSelectedStoreIds.includes(id))}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all stores"
                    />
                  </TableHead>
                  <TableHead>{t.storesPage.name}</TableHead>
                  <TableHead>{t.storesPage.slug}</TableHead>
                  <TableHead>{t.storesPage.status}</TableHead>
                  <TableHead>{t.storesPage.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={validSelectedStoreIds.includes(store.id)}
                        onChange={(e) => toggleStoreSelection(store.id, e.target.checked)}
                        aria-label={`Select store ${store.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-left text-sm font-medium text-blue-600 hover:underline"
                        onClick={() => handleSelectStore(store)}
                      >
                        {store.name}
                        {currentStore?.id === store.id && ` (${t.storesPage.active})`}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{store.slug}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          store.status === 'active' ? 'default'
                          : store.status === 'suspended' ? 'destructive'
                          : 'secondary'
                        }
                        className={
                          store.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : store.status === 'suspended' ? ''
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                        }
                      >
                        {getStatusLabel(store.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/stores/${store.id}`}>
                            <Settings2 className="mr-2 h-4 w-4" />
                            {t.storesPage.settings}
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/stores/${store.id}/editor`}>
                            <Palette className="mr-2 h-4 w-4" />
                            Store Builder
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(store.id)}
                          disabled={deleteStoreMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t.storesPage.delete}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {isLoading ? t.storesPage.loading : t.storesPage.empty}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={currentPage}
            pageCount={pageCount}
            summary={t.customersPage.pageOf.replace('{page}', String(currentPage)).replace('{total}', String(pageCount)) + ` · ${filteredStores.length}`}
            previousLabel={t.customersPage.previous}
            nextLabel={t.customersPage.next}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
