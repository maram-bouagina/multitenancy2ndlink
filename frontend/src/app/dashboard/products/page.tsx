'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useCloneProduct, useProducts, useDeleteProduct, useUpdateProduct } from '@/lib/hooks/use-api';
import { apiClient } from '@/lib/api/client';
import { Product } from '@/lib/types';
import { Plus, MoreHorizontal, Search, Edit, Trash2, Eye, Download, Upload, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}

export default function ProductsPage() {
  const { currentStore, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const activeStoreId = currentStore?.id || '';
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');
  const [appliedFilters, setAppliedFilters] = useState<{
    search?: string;
    status?: string;
    visibility?: string;
    min_price?: number;
    max_price?: number;
    sort_by: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  }>({ sort_by: 'newest' });
  const [bulkStatus, setBulkStatus] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [cloneMessage, setCloneMessage] = useState('');
  const [cloneProduct, setCloneProduct] = useState<Product | null>(null);
  const [cloneTitle, setCloneTitle] = useState('');
  const [cloneSkuSuffix, setCloneSkuSuffix] = useState('-COPY');
  const [cloneIncludeImages, setCloneIncludeImages] = useState(true);
  const [cloneError, setCloneError] = useState('');
  const [filterMessage, setFilterMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const productFilters = useMemo(() => appliedFilters, [appliedFilters]);

  const { data: productsResponse, isLoading, refetch } = useProducts(activeStoreId, productFilters);
  const deleteProductMutation = useDeleteProduct();
  const updateProductMutation = useUpdateProduct();
  const cloneProductMutation = useCloneProduct();

  const products = productsResponse?.data || [];

  const getStatusLabel = (status: Product['status']) => {
    switch (status) {
      case 'published':
        return t.productForm.statusPublished;
      case 'archived':
        return t.productForm.statusArchived;
      default:
        return t.productForm.statusDraft;
    }
  };

  const getVisibilityLabel = (visibility: Product['visibility']) => {
    return visibility === 'public' ? t.productForm.visibilityPublic : t.productForm.visibilityPrivate;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!activeStoreId) return;
    setIsExporting(true);
    try {
      const blob = await apiClient.exportProducts(activeStoreId, format);
      downloadBlob(blob, `products.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
    } catch (error) {
      console.error('Export error:', error);
      alert(t.productsPage.exportFailed);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateDownload = async (format: 'csv' | 'xlsx') => {
    if (!activeStoreId) return;
    try {
      const blob = await apiClient.downloadProductImportTemplate(activeStoreId, format);
      downloadBlob(blob, `products_template.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
    } catch (error) {
      console.error('Template download error:', error);
      alert(t.productsPage.templateFailed);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStoreId) return;

    setIsImporting(true);
    setImportMessage('');
    setImportErrors([]);
    setImportWarnings([]);
    setCloneMessage('');
    try {
      const result = await apiClient.importProducts(activeStoreId, file);
      const errors = Array.isArray(result.errors) ? result.errors : [];
      const warnings = Array.isArray(result.warnings) ? result.warnings : [];
      setImportMessage(
        interpolate(t.productsPage.importSummary, {
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
          warnings: warnings.length,
          errors: errors.length,
        })
      );
      setImportErrors(errors);
      setImportWarnings(warnings);
      
      refetch();
    } catch (error) {
      console.error('Import error:', error);
      setImportMessage(getApiErrorMessage(error, t.productsPage.importFailed));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSelected = async () => {
    if (!activeStoreId) return;
    const selectedProducts = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
    if (selectedProducts.length === 0) return;
    if (!confirm(interpolate(t.productsPage.deleteSelectedConfirm, { count: selectedProducts.length }))) return;

    try {
      const results = await Promise.allSettled(
        selectedProducts.map((product) =>
          deleteProductMutation.mutateAsync({ storeId: activeStoreId, productId: product.id })
        )
      );

      const failures = results.filter(
        (result) =>
          result.status === 'rejected' &&
          !(isAxiosError(result.reason) && result.reason.response?.status === 404)
      );

      if (failures.length === 0) {
        table.resetRowSelection();
      } else {
        console.error('Delete failures', failures);
        alert(t.productsPage.deleteFailed);
      }
    } catch (error) {
      console.error('Failed to delete selected products:', error);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!activeStoreId || !bulkStatus) return;
    const selectedProducts = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
    if (selectedProducts.length === 0) return;
    if (!confirm(interpolate(t.productsPage.bulkStatusConfirm, {
      status: getStatusLabel(bulkStatus as Product['status']),
      count: selectedProducts.length,
    }))) return;

    try {
      await Promise.all(
        selectedProducts.map((product) =>
          updateProductMutation.mutateAsync({
            storeId: activeStoreId,
            productId: product.id,
            data: { status: bulkStatus as 'draft' | 'published' | 'archived' },
          })
        )
      );
      table.resetRowSelection();
      setBulkStatus('');
      refetch();
    } catch (error) {
      console.error('Failed to update selected products:', error);
      alert(t.productsPage.bulkUpdateFailed);
    }
  };

  const applyFilters = () => {
    const parsedMin = minPriceFilter.trim() === '' ? undefined : Number(minPriceFilter);
    const parsedMax = maxPriceFilter.trim() === '' ? undefined : Number(maxPriceFilter);

    if (parsedMin !== undefined && (!Number.isFinite(parsedMin) || parsedMin < 0)) {
      setFilterMessage(t.productsPage.minPriceInvalid);
      return;
    }
    if (parsedMax !== undefined && (!Number.isFinite(parsedMax) || parsedMax < 0)) {
      setFilterMessage(t.productsPage.maxPriceInvalid);
      return;
    }

    let minVal = parsedMin;
    let maxVal = parsedMax;
    if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
      [minVal, maxVal] = [maxVal, minVal];
      setMinPriceFilter(String(minVal));
      setMaxPriceFilter(String(maxVal));
    }

    setFilterMessage('');
    startTransition(() => {
      setAppliedFilters({
        search: globalFilter.trim() || undefined,
        status: statusFilter || undefined,
        visibility: visibilityFilter || undefined,
        min_price: minVal,
        max_price: maxVal,
        sort_by: sortBy,
      });
    });
  };

  const resetFilters = () => {
    setGlobalFilter('');
    setStatusFilter('');
    setVisibilityFilter('');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setSortBy('newest');
    setFilterMessage('');
    setAppliedFilters({ sort_by: 'newest' });
  };

  const openCloneDialog = (product: Product) => {
    setCloneProduct(product);
    setCloneTitle(`${product.title} ${t.productsPage.copyNameSuffix}`.trim());
    setCloneSkuSuffix(t.productsPage.cloneSkuSuffixPlaceholder);
    setCloneIncludeImages(true);
    setCloneError('');
  };

  const handleClone = async () => {
    if (!activeStoreId || !cloneProduct) {
      return;
    }

    setCloneError('');
    setCloneMessage('');

    try {
      const result = await cloneProductMutation.mutateAsync({
        storeId: activeStoreId,
        productId: cloneProduct.id,
        data: {
          source_product_id: cloneProduct.id,
          title: cloneTitle.trim(),
          sku_suffix: cloneSkuSuffix.trim() || undefined,
          include_images: cloneIncludeImages,
        },
      });

      setCloneMessage(interpolate(t.productsPage.cloneSuccess, {
        title: result.cloned_product.title,
      }));
      setCloneProduct(null);
      setCloneTitle('');
      setCloneSkuSuffix(t.productsPage.cloneSkuSuffixPlaceholder);
      setCloneIncludeImages(true);
    } catch (error) {
      setCloneError(getApiErrorMessage(error, t.productsPage.cloneFailed));
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          ref={selectAllRef}
          checked={table.getFilteredRowModel().rows.length > 0 && table.getFilteredRowModel().rows.every((row) => row.getIsSelected())}
          onChange={(event) => {
            const shouldSelect = !!event.target.checked;
            const filteredRows = table.getFilteredRowModel().rows;
            table.setRowSelection((current) => {
              const next = { ...current };
              if (shouldSelect) {
                filteredRows.forEach((row) => {
                  next[row.id] = true;
                });
              } else {
                filteredRows.forEach((row) => {
                  delete next[row.id];
                });
              }
              return next;
            });
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(event) => row.toggleSelected(!!event.target.checked)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: t.productsPage.tableName,
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('title')}</div>
      ),
    },
    {
      accessorKey: 'price',
      header: t.productsPage.price,
      cell: ({ row }) => (
        <div className="font-mono">
          {row.original.currency} {Number(row.getValue('price')).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t.productsPage.status,
      cell: ({ row }) => (
        <Badge variant={row.getValue('status') === 'published' ? 'default' : 'secondary'}>
          {getStatusLabel(row.getValue('status') as Product['status'])}
        </Badge>
      ),
    },
    {
      accessorKey: 'visibility',
      header: t.productsPage.visibility,
      cell: ({ row }) => (
        <Badge variant="outline">
          {getVisibilityLabel(row.getValue('visibility') as Product['visibility'])}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: t.productsPage.created,
      cell: ({ row }) => (
        <div className="text-sm text-gray-500">
          {format(new Date(row.getValue('created_at')), 'MMM dd, yyyy')}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/products/${product.id}/details`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t.productsPage.viewDetails}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/products/${product.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t.productsPage.edit}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCloneDialog(product)}>
                <Copy className="mr-2 h-4 w-4" />
                {t.productsPage.duplicate}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleDelete(product.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t.productsPage.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
  });

  useEffect(() => {
    const filteredRows = table.getFilteredRowModel().rows;
    const allSelected = filteredRows.length > 0 && filteredRows.every((row) => row.getIsSelected());
    const someSelected = filteredRows.some((row) => row.getIsSelected());
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allSelected && someSelected;
    }
  }, [table, rowSelection]);

  const handleDelete = async (productId: string) => {
    if (!activeStoreId) {
      return;
    }
    if (confirm(t.productsPage.deleteConfirm)) {
      try {
        await deleteProductMutation.mutateAsync({ storeId: activeStoreId, productId });
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return;
        }
        console.error('Failed to delete product:', error);
        alert(t.productsPage.deleteFailed);
      }
    }
  };

  if (!isAuthenticated || !currentStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">{t.productsPage.selectStore}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.productsPage.title}</h1>
          <p className="text-gray-600">{t.productsPage.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {t.productsPage.export}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                {t.productsPage.exportCsv}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                {t.productsPage.exportExcel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t.productsPage.template}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleTemplateDownload('csv')}>
                {t.productsPage.templateCsv}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleTemplateDownload('xlsx')}>
                {t.productsPage.templateExcel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import Button */}
          <Button 
            variant="outline" 
            onClick={handleImportClick} 
            disabled={isImporting}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t.productsPage.import}
          </Button>

          {/* Add Product Button */}
          <Button asChild>
            <Link href="/dashboard/products/new">
              <Plus className="mr-2 h-4 w-4" />
              {t.productsPage.addProduct}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.productsPage.importGuideTitle}</CardTitle>
          <CardDescription>{t.productsPage.importGuideDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>{t.productsPage.importGuideFields}</p>
          <p>{t.productsPage.importGuideCategories}</p>
          <p>{t.productsPage.importGuideImages}</p>
        </CardContent>
      </Card>

      {cloneMessage && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          {cloneMessage}
          <button
            className="ml-2 font-semibold underline"
            onClick={() => setCloneMessage('')}
          >
            {t.productsPage.dismiss}
          </button>
        </div>
      )}

      {/* Import Message */}
      {importMessage && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          {importMessage}
          <button
            className="ml-2 font-semibold underline"
            onClick={() => {
              setImportMessage('');
              setImportErrors([]);
              setImportWarnings([]);
            }}
          >
            {t.productsPage.dismiss}
          </button>
        </div>
      )}

      {(importErrors.length > 0 || importWarnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>{t.productsPage.importDetailsTitle}</CardTitle>
            <CardDescription>{t.productsPage.importDetailsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {importErrors.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700">{t.productsPage.errors}</p>
                <ul className="list-disc pl-5 text-sm text-red-700">
                  {importErrors.slice(0, 10).map((item, idx) => (
                    <li key={`err-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {importWarnings.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-700">{t.productsPage.warnings}</p>
                <ul className="list-disc pl-5 text-sm text-amber-700">
                  {importWarnings.slice(0, 10).map((item, idx) => (
                    <li key={`warn-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filterMessage && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {filterMessage}
          <button
            className="ml-2 font-semibold underline"
            onClick={() => setFilterMessage('')}
          >
            {t.productsPage.dismiss}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold">{products.length}</div>
              <div className="ml-2 text-sm text-gray-600">{t.productsPage.statsTotal}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {products.filter(p => p.status === 'published').length}
              </div>
              <div className="ml-2 text-sm text-gray-600">{t.productsPage.statsPublished}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {products.filter(p => p.status === 'draft').length}
              </div>
              <div className="ml-2 text-sm text-gray-600">{t.productsPage.statsDrafts}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {products.filter(p => p.status === 'archived').length}
              </div>
              <div className="ml-2 text-sm text-gray-600">{t.productsPage.statsArchived}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t.productsPage.allProducts}</CardTitle>
          <CardDescription>{t.productsPage.allProductsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search & Filters */}
          <div className="space-y-3 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={t.productsPage.searchPlaceholder}
                  value={globalFilter ?? ''}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">{t.productsPage.allStatus}</option>
                <option value="draft">{t.productForm.statusDraft}</option>
                <option value="published">{t.productForm.statusPublished}</option>
                <option value="archived">{t.productForm.statusArchived}</option>
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">{t.productsPage.allVisibility}</option>
                <option value="public">{t.productForm.visibilityPublic}</option>
                <option value="private">{t.productForm.visibilityPrivate}</option>
              </select>
              <Input
                type="number"
                placeholder={t.productsPage.minPrice}
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(e.target.value)}
                className="w-32"
              />
              <Input
                type="number"
                placeholder={t.productsPage.maxPrice}
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
                className="w-32"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'price_asc' | 'price_desc')}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="newest">{t.productsPage.sortNewest}</option>
                <option value="oldest">{t.productsPage.sortOldest}</option>
                <option value="price_asc">{t.productsPage.sortPriceAsc}</option>
                <option value="price_desc">{t.productsPage.sortPriceDesc}</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={applyFilters} disabled={isPending || isLoading}>
                  {isPending || isLoading ? t.productsPage.applying : t.productsPage.applyFilters}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  {t.productsPage.reset}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">{t.productsPage.bulkStatusPlaceholder}</option>
                  <option value="draft">{t.productsPage.bulkSetDraft}</option>
                  <option value="published">{t.productsPage.bulkSetPublished}</option>
                  <option value="archived">{t.productsPage.bulkSetArchived}</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!bulkStatus || table.getFilteredSelectedRowModel().rows.length === 0 || updateProductMutation.isPending}
                  onClick={handleBulkStatusUpdate}
                >
                  {t.productsPage.applySelected}
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0 || deleteProductMutation.isPending}
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t.productsPage.deleteSelected}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {isLoading ? t.productsPage.loading : t.productsPage.empty}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-gray-700">
              {interpolate(t.productsPage.selectedRows, {
                selected: table.getFilteredSelectedRowModel().rows.length,
                total: table.getFilteredRowModel().rows.length,
              })}
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {t.productsPage.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {t.productsPage.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!cloneProduct} onOpenChange={(open) => !open && setCloneProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.productsPage.cloneTitle}</DialogTitle>
            <DialogDescription>
              {cloneProduct
                ? interpolate(t.productsPage.cloneDesc, { title: cloneProduct.title })
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900" htmlFor="clone-title">
                {t.productsPage.cloneNameLabel}
              </label>
              <Input
                id="clone-title"
                value={cloneTitle}
                onChange={(event) => setCloneTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900" htmlFor="clone-sku-suffix">
                {t.productsPage.cloneSkuSuffixLabel}
              </label>
              <Input
                id="clone-sku-suffix"
                value={cloneSkuSuffix}
                placeholder={t.productsPage.cloneSkuSuffixPlaceholder}
                onChange={(event) => setCloneSkuSuffix(event.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={cloneIncludeImages}
                onChange={(event) => setCloneIncludeImages(event.target.checked)}
              />
              {t.productsPage.cloneIncludeImages}
            </label>

            {cloneError ? <p className="text-sm text-red-600">{cloneError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneProduct(null)}>
              {t.productsPage.cloneCancel}
            </Button>
            <Button onClick={() => void handleClone()} disabled={cloneProductMutation.isPending || cloneTitle.trim() === ''}>
              {cloneProductMutation.isPending ? t.productsPage.clonePending : t.productsPage.cloneConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}