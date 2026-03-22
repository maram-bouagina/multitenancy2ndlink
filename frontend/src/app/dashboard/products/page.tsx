'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProducts, useDeleteProduct, useUpdateProduct } from '@/lib/hooks/use-api';
import { apiClient } from '@/lib/api/client';
import { Product } from '@/lib/types';
import { Plus, MoreHorizontal, Search, Edit, Trash2, Eye, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/hooks/use-auth';

export default function ProductsPage() {
  const { currentStore, isAuthenticated } = useAuth();
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
  const [filterMessage, setFilterMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productFilters = useMemo(() => appliedFilters, [appliedFilters]);

  const { data: productsResponse, isLoading, refetch } = useProducts(activeStoreId, productFilters);
  const deleteProductMutation = useDeleteProduct();
  const updateProductMutation = useUpdateProduct();

  const products = productsResponse?.data || [];

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!activeStoreId) return;
    setIsExporting(true);
    try {
      const blob = await apiClient.exportProducts(activeStoreId, format);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `products.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export products');
    } finally {
      setIsExporting(false);
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
    try {
      const result = await apiClient.importProducts(activeStoreId, file);
      const errors = Array.isArray(result.errors) ? result.errors : [];
      const warnings = Array.isArray(result.warnings) ? result.warnings : [];
      const warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0;
      setImportMessage(
        `Imported: ${result.imported}, Updated: ${result.updated}, Skipped: ${result.skipped}${warningCount > 0 ? `, Warnings: ${warningCount}` : ''}${errors.length > 0 ? `, Errors: ${errors.length}` : ''}`
      );
      setImportErrors(errors);
      setImportWarnings(warnings);
      
      refetch();
    } catch (error) {
      console.error('Import error:', error);
      setImportMessage(error instanceof Error ? error.message : 'Import failed. Please check the file format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSelected = async () => {
    if (!activeStoreId) return;
    const selectedProducts = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
    if (selectedProducts.length === 0) return;
    if (!confirm(`Delete ${selectedProducts.length} selected product(s)?`)) return;

    try {
      await Promise.all(
        selectedProducts.map((product) =>
          deleteProductMutation.mutateAsync({ storeId: activeStoreId, productId: product.id })
        )
      );
      table.resetRowSelection();
    } catch (error) {
      console.error('Failed to delete selected products:', error);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!activeStoreId || !bulkStatus) return;
    const selectedProducts = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
    if (selectedProducts.length === 0) return;
    if (!confirm(`Set status to '${bulkStatus}' for ${selectedProducts.length} selected product(s)?`)) return;

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
      alert('Some products could not be updated.');
    }
  };

  const applyFilters = () => {
    const parsedMin = minPriceFilter.trim() === '' ? undefined : Number(minPriceFilter);
    const parsedMax = maxPriceFilter.trim() === '' ? undefined : Number(maxPriceFilter);

    if (parsedMin !== undefined && (!Number.isFinite(parsedMin) || parsedMin < 0)) {
      setFilterMessage('Min price must be a valid positive number.');
      return;
    }
    if (parsedMax !== undefined && (!Number.isFinite(parsedMax) || parsedMax < 0)) {
      setFilterMessage('Max price must be a valid positive number.');
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

  const columns: ColumnDef<Product>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(event) => table.toggleAllPageRowsSelected(!!event.target.checked)}
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
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('title')}</div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <div className="font-mono">${row.getValue('price')}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('status') === 'published' ? 'default' : 'secondary'}>
          {row.getValue('status')}
        </Badge>
      ),
    },
    {
      accessorKey: 'visibility',
      header: 'Visibility',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue('visibility')}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
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
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/products/${product.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleDelete(product.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
  });

  const handleDelete = async (productId: string) => {
    if (!activeStoreId) {
      return;
    }
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProductMutation.mutateAsync({ storeId: activeStoreId, productId });
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  if (!isAuthenticated || !currentStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Select a store to manage products.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Export as Excel
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
            Import
          </Button>

          {/* Add Product Button */}
          <Button asChild>
            <Link href="/dashboard/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

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
            Dismiss
          </button>
        </div>
      )}

      {(importErrors.length > 0 || importWarnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Import Details</CardTitle>
            <CardDescription>Review skipped rows and unresolved values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {importErrors.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700">Errors</p>
                <ul className="list-disc pl-5 text-sm text-red-700">
                  {importErrors.slice(0, 10).map((item, idx) => (
                    <li key={`err-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {importWarnings.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-700">Warnings</p>
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
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold">{products.length}</div>
              <div className="ml-2 text-sm text-gray-600">Total Products</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {products.filter(p => p.status === 'published').length}
              </div>
              <div className="ml-2 text-sm text-gray-600">Published</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {products.filter(p => p.status === 'draft').length}
              </div>
              <div className="ml-2 text-sm text-gray-600">Drafts</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {products.filter(p => p.status === 'archived').length}
              </div>
              <div className="ml-2 text-sm text-gray-600">Archived</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            A list of all products in your store
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search & Filters */}
          <div className="space-y-3 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search title, brand, sku..."
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
                <option value="">All status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">All visibility</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <Input
                type="number"
                placeholder="Min price"
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(e.target.value)}
                className="w-32"
              />
              <Input
                type="number"
                placeholder="Max price"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
                className="w-32"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'price_asc' | 'price_desc')}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={applyFilters} disabled={isPending || isLoading}>
                  {isPending || isLoading ? 'Applying...' : 'Apply Filters'}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Bulk status...</option>
                  <option value="draft">Set Draft</option>
                  <option value="published">Set Published</option>
                  <option value="archived">Set Archived</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!bulkStatus || table.getFilteredSelectedRowModel().rows.length === 0 || updateProductMutation.isPending}
                  onClick={handleBulkStatusUpdate}
                >
                  Apply to Selected
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0 || deleteProductMutation.isPending}
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
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
                      {isLoading ? 'Loading...' : 'No products found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-gray-700">
              {table.getFilteredSelectedRowModel().rows.length} of{' '}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}