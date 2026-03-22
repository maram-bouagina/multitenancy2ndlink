'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useCategories, useDeleteCategory, useUpdateCategory } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, Download, Upload } from 'lucide-react';

export default function CategoriesPage() {
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [bulkVisibility, setBulkVisibility] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: categories, isLoading, refetch } = useCategories(storeId);
  const deleteCategoryMutation = useDeleteCategory();
  const updateCategoryMutation = useUpdateCategory();

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      setDeleteMessage('');
      await deleteCategoryMutation.mutateAsync({ storeId, categoryId: id });
      refetch();
    } catch (error: unknown) {
      setDeleteMessage(getApiErrorMessage(error, 'Failed to delete category.'));
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    setIsExporting(true);
    try {
      const blob = await apiClient.exportCategories(storeId, format);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `categories.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export categories');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;

    setIsImporting(true);
    setImportMessage('');
    setImportErrors([]);
    setImportWarnings([]);
    try {
      const result = await apiClient.importCategories(storeId, file);
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

  const toggleCategorySelection = (categoryId: string, checked: boolean) => {
    setSelectedCategoryIds((prev) =>
      checked ? [...prev, categoryId] : prev.filter((id) => id !== categoryId)
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!categories) {
      setSelectedCategoryIds([]);
      return;
    }
    setSelectedCategoryIds(checked ? categories.map((c) => c.id) : []);
  };

  const handleDeleteSelected = async () => {
    if (selectedCategoryIds.length === 0) return;
    if (!confirm(`Delete ${selectedCategoryIds.length} selected category(ies)?`)) return;

    try {
      setDeleteMessage('');
      await Promise.all(
        selectedCategoryIds.map((categoryId) =>
          deleteCategoryMutation.mutateAsync({ storeId, categoryId })
        )
      );
      setSelectedCategoryIds([]);
      refetch();
    } catch (error: unknown) {
      setDeleteMessage(getApiErrorMessage(error, 'Some categories could not be deleted.'));
    }
  };

  const handleBulkVisibilityUpdate = async () => {
    if (!bulkVisibility || selectedCategoryIds.length === 0) return;
    if (!confirm(`Set visibility to '${bulkVisibility}' for ${selectedCategoryIds.length} selected category(ies)?`)) return;

    try {
      setDeleteMessage('');
      await Promise.all(
        selectedCategoryIds.map((categoryId) =>
          updateCategoryMutation.mutateAsync({
            storeId,
            categoryId,
            data: { visibility: bulkVisibility as 'public' | 'private' },
          })
        )
      );
      setSelectedCategoryIds([]);
      setBulkVisibility('');
      refetch();
    } catch (error: unknown) {
      setDeleteMessage(getApiErrorMessage(error, 'Some categories could not be updated.'));
    }
  };

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

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600">Manage your product categories.</p>
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

          <Button asChild>
            <Link href="/dashboard/categories/new">Create Category</Link>
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

      {deleteMessage && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {deleteMessage}
          <button
            className="ml-2 font-semibold underline"
            onClick={() => setDeleteMessage('')}
          >
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Categories help organize your products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-end pb-4">
            <div className="flex items-center gap-2">
              <select
                value={bulkVisibility}
                onChange={(e) => setBulkVisibility(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Bulk visibility...</option>
                <option value="public">Set Public</option>
                <option value="private">Set Private</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={!bulkVisibility || selectedCategoryIds.length === 0 || updateCategoryMutation.isPending}
                onClick={handleBulkVisibilityUpdate}
              >
                Apply to Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedCategoryIds.length === 0 || deleteCategoryMutation.isPending}
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={!!categories?.length && selectedCategoryIds.length === categories.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all categories"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(category.id)}
                        onChange={(e) => toggleCategorySelection(category.id, e.target.checked)}
                        aria-label={`Select category ${category.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{category.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{category.slug}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/categories/${category.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(category.id)}
                          disabled={deleteCategoryMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!categories || categories.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {isLoading ? 'Loading categories...' : 'No categories found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
