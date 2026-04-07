'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListPagination } from '@/components/dashboard/list-pagination';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  useCustomerGroups,
  useCreateCustomerGroup,
  useDeleteCustomerGroup,
} from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Edit, Loader2, Plus, Trash2, Upload, Users, X } from 'lucide-react';

export default function CustomerGroupsPage() {
  const PAGE_SIZE = 10;
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id ?? '';
  const { data: groups, isLoading } = useCustomerGroups(storeId);
  const createMutation = useCreateCustomerGroup();
  const deleteMutation = useDeleteCustomerGroup();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [discountFilter, setDiscountFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState('0');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allGroups = groups ?? [];
  const filteredGroups = allGroups.filter((group) => {
    const query = search.trim().toLowerCase();
    const searchHaystack = [
      group.name,
      group.description,
      String(group.discount),
      String(group.member_count),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = !query || searchHaystack.includes(query);
    const matchesDiscount = !discountFilter
      || (discountFilter === 'with-discount' && group.discount > 0)
      || (discountFilter === 'no-discount' && group.discount <= 0);
    const matchesMembers = !memberFilter
      || (memberFilter === 'with-members' && group.member_count > 0)
      || (memberFilter === 'empty' && group.member_count === 0);
    return matchesSearch && matchesDiscount && matchesMembers;
  });
  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedGroups = filteredGroups.slice(pageStart, pageStart + PAGE_SIZE);
  const filteredGroupIds = filteredGroups.map((group) => group.id);
  const validSelectedGroupIds = selectedGroupIds.filter((id) => allGroups.some((group) => group.id === id));

  const downloadBlob = (blob: Blob, filename: string) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      storeId,
      data: { name, description: description || undefined, discount: parseFloat(discount) || 0 },
    });
    setShowForm(false);
    setName('');
    setDescription('');
    setDiscount('0');
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm(t.customerGroupsPage.deleteConfirm)) return;
    await deleteMutation.mutateAsync({ storeId, groupId });
  };

  const handleDeleteSelected = async () => {
    if (validSelectedGroupIds.length === 0) return;
    if (!confirm(t.customerGroupsPage.deleteSelectedConfirm.replace('{count}', String(validSelectedGroupIds.length)))) return;
    await Promise.all(validSelectedGroupIds.map((groupId) => deleteMutation.mutateAsync({ storeId, groupId })));
    setSelectedGroupIds([]);
  };

  const toggleGroupSelection = (groupId: string, checked: boolean) => {
    setSelectedGroupIds((current) => (
      checked ? Array.from(new Set([...current, groupId])) : current.filter((id) => id !== groupId)
    ));
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedGroupIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...filteredGroupIds]));
      }
      return current.filter((id) => !filteredGroupIds.includes(id));
    });
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    setIsExporting(true);
    try {
      const blob = await apiClient.exportCustomerGroups(storeId, format);
      downloadBlob(blob, `customer_groups.${format}`);
    } catch (error) {
      alert(getApiErrorMessage(error, 'Customer group export failed.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateDownload = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    try {
      const blob = await apiClient.downloadCustomerGroupImportTemplate(storeId, format);
      downloadBlob(blob, `customer_groups_template.${format}`);
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
      const result = await apiClient.importCustomerGroups(storeId, file);
      setImportMessage(`Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}.`);
      setImportErrors(Array.isArray(result.errors) ? result.errors : []);
      setImportWarnings(Array.isArray(result.warnings) ? result.warnings : []);
    } catch (error) {
      setImportMessage(getApiErrorMessage(error, 'Customer group import failed.'));
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
          <h1 className="text-2xl font-bold text-gray-900">{t.customerGroupsPage.title}</h1>
          <p className="text-gray-600">{t.customerGroupsPage.subtitle}</p>
        </div>
		<div className="flex items-center gap-2">
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
		  <Button onClick={() => setShowForm(true)} disabled={showForm}>
			<Plus className="mr-2 h-4 w-4" /> {t.customerGroupsPage.newGroup}
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

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.customerGroupsPage.createTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3 max-w-lg">
              <div>
                <label className="block text-sm font-medium mb-1">{t.customerGroupsPage.name}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t.customerGroupsPage.namePlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.customerGroupsPage.description}</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.customerGroupsPage.descriptionPlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.customerGroupsPage.discount}</label>
                <Input type="number" min="0" max="100" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.customerGroupsPage.create}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  <X className="mr-1 h-4 w-4" /> {t.customerGroupsPage.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.customerGroupsPage.allGroups}</CardTitle>
          <CardDescription>{t.customerGroupsPage.allGroupsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full max-w-4xl flex-col gap-3 md:flex-row">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t.customerGroupsPage.searchPlaceholderList}
                className="md:flex-1"
              />
              <select
                value={discountFilter}
                onChange={(event) => {
                  setDiscountFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">All discounts</option>
                <option value="with-discount">With discount</option>
                <option value="no-discount">No discount</option>
              </select>
              <select
                value={memberFilter}
                onChange={(event) => {
                  setMemberFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">All member states</option>
                <option value="with-members">With members</option>
                <option value="empty">Empty groups</option>
              </select>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={validSelectedGroupIds.length === 0 || deleteMutation.isPending}
              onClick={() => void handleDeleteSelected()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t.productsPage.deleteSelected} ({validSelectedGroupIds.length})
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredGroupIds.length > 0 && filteredGroupIds.every((id) => validSelectedGroupIds.includes(id))}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all customer groups"
                    />
                  </TableHead>
                  <TableHead>{t.customerGroupsPage.name}</TableHead>
                  <TableHead>{t.customerGroupsPage.description}</TableHead>
                  <TableHead>{t.customerGroupsPage.discount}</TableHead>
                  <TableHead>{t.customerGroupsPage.members}</TableHead>
                  <TableHead>{t.customerGroupsPage.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={validSelectedGroupIds.includes(group.id)}
                        onChange={(e) => toggleGroupSelection(group.id, e.target.checked)}
                        aria-label={`Select customer group ${group.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{group.description || '—'}</TableCell>
                    <TableCell className="text-sm">{group.discount > 0 ? `${group.discount}%` : '—'}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {group.member_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/customer-groups/${group.id}`}>
                            <Edit className="mr-1 h-4 w-4" /> {t.customerGroupsPage.manage}
                          </Link>
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="text-red-600"
                          onClick={() => handleDelete(group.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {isLoading ? t.customerGroupsPage.loading : t.customerGroupsPage.empty}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={currentPage}
            pageCount={pageCount}
            summary={t.customersPage.pageOf.replace('{page}', String(currentPage)).replace('{total}', String(pageCount)) + ` · ${filteredGroups.length}`}
            previousLabel={t.customersPage.previous}
            nextLabel={t.customersPage.next}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
