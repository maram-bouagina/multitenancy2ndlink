'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListPagination } from '@/components/dashboard/list-pagination';
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
import { Edit, Eye, Trash2, Download, Upload, Search } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/use-language';
import type { Category } from '@/lib/types';

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}

type FlattenedCategory = Category & {
  depth: number;
  parentName?: string;
};

function flattenCategories(categories: Category[], depth = 0, parentName?: string): FlattenedCategory[] {
  return categories.flatMap((category) => [
    { ...category, depth, parentName },
    ...flattenCategories(category.children ?? [], depth + 1, category.name),
  ]);
}

export default function CategoriesPage() {
  const PAGE_SIZE = 10;
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id ?? '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [bulkVisibility, setBulkVisibility] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [structureFilter, setStructureFilter] = useState('');
  const [imageFilter, setImageFilter] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: categories, isLoading, refetch } = useCategories(storeId);
  const deleteCategoryMutation = useDeleteCategory();
  const updateCategoryMutation = useUpdateCategory();
  const allCategories = flattenCategories(categories ?? []);
  const filteredCategories = allCategories.filter((category) => {
    const query = search.trim().toLowerCase();
    const searchHaystack = [
      category.name,
      category.slug,
      category.description,
      category.meta_title,
      category.meta_description,
      category.canonical_url,
      category.image_url,
      category.parentName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = !query || searchHaystack.includes(query);
    const matchesVisibility = !visibilityFilter || category.visibility === visibilityFilter;
    const matchesStructure = !structureFilter
      || (structureFilter === 'top-level' && !category.parent_id)
      || (structureFilter === 'child' && !!category.parent_id)
      || (structureFilter === 'with-children' && (category.children?.length ?? 0) > 0);
    const matchesImage = !imageFilter
      || (imageFilter === 'with-image' && !!category.image_url)
      || (imageFilter === 'without-image' && !category.image_url);

    return matchesSearch && matchesVisibility && matchesStructure && matchesImage;
  });
  const pageCount = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedCategories = filteredCategories.slice(pageStart, pageStart + PAGE_SIZE);
  const filteredCategoryIds = filteredCategories.map((category) => category.id);
  const validSelectedCategoryIds = selectedCategoryIds.filter((id) => allCategories.some((category) => category.id === id));

  const downloadBlob = (blob: Blob, filename: string) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.categoriesPage.deleteConfirm)) return;
    try {
      setDeleteMessage('');
      await deleteCategoryMutation.mutateAsync({ storeId, categoryId: id });
      refetch();
    } catch (error: unknown) {
      setDeleteMessage(getApiErrorMessage(error, t.categoriesPage.deleteFailed));
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    setIsExporting(true);
    try {
      const blob = await apiClient.exportCategories(storeId, format);
      downloadBlob(blob, `categories.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
    } catch (error) {
      console.error('Export error:', error);
      alert(t.categoriesPage.exportFailed);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateDownload = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    try {
      const blob = await apiClient.downloadCategoryImportTemplate(storeId, format);
      downloadBlob(blob, `categories_template.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
    } catch (error) {
      console.error('Template download error:', error);
      alert(t.categoriesPage.templateFailed);
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
      setImportMessage(
        interpolate(t.categoriesPage.importSummary, {
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
      setImportMessage(getApiErrorMessage(error, t.categoriesPage.importFailed));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleCategorySelection = (categoryId: string, checked: boolean) => {
    setSelectedCategoryIds((prev) =>
      checked ? Array.from(new Set([...prev, categoryId])) : prev.filter((id) => id !== categoryId)
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!filteredCategoryIds.length) {
      return;
    }

    setSelectedCategoryIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...filteredCategoryIds]));
      }
      return prev.filter((id) => !filteredCategoryIds.includes(id));
    });
  };

  const handleDeleteSelected = async () => {
    if (validSelectedCategoryIds.length === 0) return;
    if (!confirm(interpolate(t.categoriesPage.deleteSelectedConfirm, { count: validSelectedCategoryIds.length }))) return;

    try {
      setDeleteMessage('');
      await Promise.all(
        validSelectedCategoryIds.map((categoryId) =>
          deleteCategoryMutation.mutateAsync({ storeId, categoryId })
        )
      );
      setSelectedCategoryIds([]);
      refetch();
    } catch (error: unknown) {
      setDeleteMessage(getApiErrorMessage(error, t.categoriesPage.deleteManyFailed));
    }
  };

  const handleBulkVisibilityUpdate = async () => {
    if (!bulkVisibility || validSelectedCategoryIds.length === 0) return;
    const visibilityLabel = bulkVisibility === 'public' ? t.categoriesPage.bulkSetPublic : t.categoriesPage.bulkSetPrivate;
    if (!confirm(interpolate(t.categoriesPage.bulkVisibilityConfirm, {
      visibility: visibilityLabel,
      count: validSelectedCategoryIds.length,
    }))) return;

    try {
      setDeleteMessage('');
      await Promise.all(
        validSelectedCategoryIds.map((categoryId) =>
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
      setDeleteMessage(getApiErrorMessage(error, t.categoriesPage.bulkUpdateFailed));
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
          <h1 className="text-2xl font-bold text-gray-900">{t.categoriesPage.title}</h1>
          <p className="text-gray-600">{t.categoriesPage.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {t.categoriesPage.export}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                {t.categoriesPage.exportCsv}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                {t.categoriesPage.exportExcel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t.categoriesPage.template}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleTemplateDownload('csv')}>
                {t.categoriesPage.templateCsv}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleTemplateDownload('xlsx')}>
                {t.categoriesPage.templateExcel}
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
            {t.categoriesPage.import}
          </Button>

          <Button asChild>
            <Link href="/dashboard/categories/new">{t.categoriesPage.createCategory}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.categoriesPage.importGuideTitle}</CardTitle>
          <CardDescription>{t.categoriesPage.importGuideDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>{t.categoriesPage.importGuideHierarchy}</p>
        </CardContent>
      </Card>

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
            {t.categoriesPage.dismiss}
          </button>
        </div>
      )}

      {(importErrors.length > 0 || importWarnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>{t.categoriesPage.importDetailsTitle}</CardTitle>
            <CardDescription>{t.categoriesPage.importDetailsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {importErrors.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700">{t.categoriesPage.errors}</p>
                <ul className="list-disc pl-5 text-sm text-red-700">
                  {importErrors.slice(0, 10).map((item, idx) => (
                    <li key={`err-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {importWarnings.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-700">{t.categoriesPage.warnings}</p>
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
            {t.categoriesPage.dismiss}
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.categoriesPage.allCategories}</CardTitle>
          <CardDescription>{t.categoriesPage.allCategoriesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col gap-3 md:max-w-4xl md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                  placeholder={t.categoriesPage.searchPlaceholder}
                />
              </div>
              <select
                value={visibilityFilter}
                onChange={(event) => {
                  setVisibilityFilter(event.target.value);
                  setPage(1);
                }}
                className="flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">{t.categoriesPage.allVisibility}</option>
                <option value="public">{t.categoriesPage.bulkSetPublic}</option>
                <option value="private">{t.categoriesPage.bulkSetPrivate}</option>
              </select>
              <select
                value={structureFilter}
                onChange={(event) => {
                  setStructureFilter(event.target.value);
                  setPage(1);
                }}
                className="flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">{t.categoriesPage.allStructures}</option>
                <option value="top-level">{t.categoriesPage.topLevelOnly}</option>
                <option value="child">{t.categoriesPage.childOnly}</option>
                <option value="with-children">{t.categoriesPage.withChildrenOnly}</option>
              </select>
              <select
                value={imageFilter}
                onChange={(event) => {
                  setImageFilter(event.target.value);
                  setPage(1);
                }}
                className="flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">{t.categoriesPage.allImageStates}</option>
                <option value="with-image">{t.categoriesPage.withImageOnly}</option>
                <option value="without-image">{t.categoriesPage.withoutImageOnly}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bulkVisibility}
                onChange={(e) => setBulkVisibility(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">{t.categoriesPage.bulkVisibilityPlaceholder}</option>
                <option value="public">{t.categoriesPage.bulkSetPublic}</option>
                <option value="private">{t.categoriesPage.bulkSetPrivate}</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={!bulkVisibility || validSelectedCategoryIds.length === 0 || updateCategoryMutation.isPending}
                onClick={handleBulkVisibilityUpdate}
              >
                {t.categoriesPage.applySelected}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={validSelectedCategoryIds.length === 0 || deleteCategoryMutation.isPending}
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t.categoriesPage.deleteSelected}
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
                      checked={filteredCategoryIds.length > 0 && filteredCategoryIds.every((id) => validSelectedCategoryIds.includes(id))}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all categories"
                    />
                  </TableHead>
                  <TableHead>{t.categoriesPage.name}</TableHead>
                  <TableHead>{t.categoriesPage.slug}</TableHead>
                  <TableHead>{t.categoriesPage.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={validSelectedCategoryIds.includes(category.id)}
                        onChange={(e) => toggleCategorySelection(category.id, e.target.checked)}
                        aria-label={`Select category ${category.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{category.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{category.slug}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/categories/${category.id}/details`} prefetch={false}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t.categoriesPage.view}
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/categories/${category.id}`} prefetch={false}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t.categoriesPage.edit}
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
                          {t.categoriesPage.delete}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {isLoading ? t.categoriesPage.loading : t.categoriesPage.empty}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={currentPage}
            pageCount={pageCount}
            summary={t.customersPage.pageOf.replace('{page}', String(currentPage)).replace('{total}', String(pageCount)) + ` · ${filteredCategories.length}`}
            previousLabel={t.customersPage.previous}
            nextLabel={t.customersPage.next}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
