'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListPagination } from '@/components/dashboard/list-pagination';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useCustomers, useDeleteCustomer } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Eye, Search, Trash2, Upload, Users } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
};

export default function CustomersPage() {
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id ?? '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSelectingAllCustomers, setIsSelectingAllCustomers] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useCustomers(storeId, { page, limit: 20, search, status: statusFilter || undefined });
  const deleteCustomerMutation = useDeleteCustomer();
  const customers = data?.data ?? [];
  const totalFilteredCustomers = data?.total ?? 0;
  const allFilteredSelected = totalFilteredCustomers > 0 && selectedCustomerIds.length === totalFilteredCustomers;
  const someFilteredSelected = selectedCustomerIds.length > 0 && !allFilteredSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const fetchFilteredCustomerIds = async () => {
    if (!storeId) {
      return [] as string[];
    }

    const params = { page: 1, limit: 100, search, status: statusFilter || undefined };
    const firstPage = await apiClient.getCustomers(storeId, params);
    const matchingIds = firstPage.data.map((customer) => customer.id);

    if (firstPage.total_pages <= 1) {
      return matchingIds;
    }

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.total_pages - 1 }, (_, index) =>
        apiClient.getCustomers(storeId, { ...params, page: index + 2 })
      )
    );

    return Array.from(
      new Set([
        ...matchingIds,
        ...remainingPages.flatMap((response) => response.data.map((customer) => customer.id)),
      ])
    );
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedCustomerIds([]);
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.customersPage.deleteConfirm)) return;
    try {
      await deleteCustomerMutation.mutateAsync({ storeId, customerId: id });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCustomerIds.length === 0) return;
    if (!confirm(t.customersPage.deleteSelectedConfirm.replace('{count}', String(selectedCustomerIds.length)))) return;
    try {
      await Promise.all(selectedCustomerIds.map((customerId) => deleteCustomerMutation.mutateAsync({ storeId, customerId })));
      setSelectedCustomerIds([]);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleCustomerSelection = (customerId: string, checked: boolean) => {
    setSelectedCustomerIds((current) => (
      checked ? Array.from(new Set([...current, customerId])) : current.filter((id) => id !== customerId)
    ));
  };

  const toggleSelectAll = async (checked: boolean) => {
    if (!storeId) return;

    setIsSelectingAllCustomers(true);
    try {
      const filteredCustomerIds = await fetchFilteredCustomerIds();
      setSelectedCustomerIds((current) => {
        if (checked) {
          return Array.from(new Set([...current, ...filteredCustomerIds]));
        }

        const filteredIdSet = new Set(filteredCustomerIds);
        return current.filter((id) => !filteredIdSet.has(id));
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSelectingAllCustomers(false);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'active') return t.customersPage.active;
    if (status === 'pending') return t.customersPage.pending;
    if (status === 'suspended') return t.customersPage.suspended;
    return status;
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    setIsExporting(true);
    try {
      const blob = await apiClient.exportCustomers(storeId, format);
      downloadBlob(blob, `customers.${format}`);
    } catch (error) {
      alert(getApiErrorMessage(error, 'Customer export failed.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateDownload = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    try {
      const blob = await apiClient.downloadCustomerImportTemplate(storeId, format);
      downloadBlob(blob, `customers_template.${format}`);
    } catch (error) {
      alert(getApiErrorMessage(error, 'Template download failed.'));
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storeId) return;

    setIsImporting(true);
    setImportMessage('');
    setImportErrors([]);
    setImportWarnings([]);
    try {
      const result = await apiClient.importCustomers(storeId, file);
      setImportMessage(`Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}.`);
      setImportErrors(Array.isArray(result.errors) ? result.errors : []);
      setImportWarnings(Array.isArray(result.warnings) ? result.warnings : []);
    } catch (error) {
      setImportMessage(getApiErrorMessage(error, 'Customer import failed.'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,.xlsx"
      onChange={handleFileSelected}
      className="hidden"
    />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.customersPage.title}</h1>
          <p className="text-gray-600">{t.customersPage.subtitle}</p>
        </div>
    <div className="flex items-center gap-2">
      {data ? (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Users className="h-4 w-4" />
        {(data.total === 1 ? t.customersPage.totalSingular : t.customersPage.totalPlural).replace('{count}', String(data.total))}
      </div>
      ) : null}
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
        <Download className="mr-2 h-4 w-4" />
        Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void handleExport('csv')}>Export CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleExport('xlsx')}>Export Excel</DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Template
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void handleTemplateDownload('csv')}>Template CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleTemplateDownload('xlsx')}>Template Excel</DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
      <Upload className="mr-2 h-4 w-4" />
      Import
      </Button>
    </div>
      </div>

    {importMessage ? (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
      <p>{importMessage}</p>
      {importWarnings.length > 0 ? <p className="mt-2 text-amber-700">Warnings: {importWarnings.join(' | ')}</p> : null}
      {importErrors.length > 0 ? <p className="mt-2 text-red-700">Errors: {importErrors.join(' | ')}</p> : null}
      </div>
    ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t.customersPage.allCustomers}</CardTitle>
          <CardDescription>{t.customersPage.allCustomersDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t.customersPage.searchPlaceholder}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">{t.customersPage.search}</Button>
              {search && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedCustomerIds([]); setSearch(''); setSearchInput(''); setPage(1); }}>
                  {t.customersPage.clear}
                </Button>
              )}
            </form>
            <select
              value={statusFilter}
              onChange={(e) => { setSelectedCustomerIds([]); setStatusFilter(e.target.value); setPage(1); }}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="">{t.customersPage.allStatuses}</option>
              <option value="active">{t.customersPage.active}</option>
              <option value="pending">{t.customersPage.pending}</option>
              <option value="suspended">{t.customersPage.suspended}</option>
            </select>
          </div>

          <div className="mb-4 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedCustomerIds.length === 0 || deleteCustomerMutation.isPending}
              onClick={() => void handleDeleteSelected()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t.productsPage.deleteSelected} ({selectedCustomerIds.length})
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      disabled={isSelectingAllCustomers || totalFilteredCustomers === 0}
                      onChange={(e) => void toggleSelectAll(e.target.checked)}
                      aria-label="Select all customers"
                    />
                  </TableHead>
                  <TableHead>{t.customersPage.customer}</TableHead>
                  <TableHead>{t.customersPage.email}</TableHead>
                  <TableHead>{t.customersPage.status}</TableHead>
                  <TableHead>{t.customersPage.verified}</TableHead>
                  <TableHead>{t.customersPage.created}</TableHead>
                  <TableHead>{t.customersPage.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.includes(customer.id)}
                        onChange={(e) => toggleCustomerSelection(customer.id, e.target.checked)}
                        aria-label={`Select customer ${customer.email}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {customer.first_name} {customer.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{customer.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[customer.status] || 'bg-gray-100 text-gray-700'}`}>
                        {getStatusLabel(customer.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {customer.email_verified ? (
                        <span className="text-green-600 text-sm">{t.customersPage.yes}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">{t.customersPage.no}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            <Eye className="mr-1 h-4 w-4" />
                            {t.customersPage.view}
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(customer.id)}
                          disabled={deleteCustomerMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {isLoading ? t.customersPage.loading : t.customersPage.empty}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data && (
            <ListPagination
              page={data.page}
              pageCount={Math.max(1, data.total_pages)}
              summary={t.customersPage.pageOf.replace('{page}', String(data.page)).replace('{total}', String(data.total_pages))}
              previousLabel={t.customersPage.previous}
              nextLabel={t.customersPage.next}
              onPageChange={(nextPage) => {
                setPage(nextPage);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
