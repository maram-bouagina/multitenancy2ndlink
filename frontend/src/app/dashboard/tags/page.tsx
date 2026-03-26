'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListPagination } from '@/components/dashboard/list-pagination';
import { useTags, useDeleteTag } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { apiClient } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Edit, Search, Trash2, Upload } from 'lucide-react';

export default function TagsPage() {
  const PAGE_SIZE = 10;
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: tags, isLoading } = useTags(storeId);
  const deleteTagMutation = useDeleteTag();
  const allTags = tags ?? [];
  const filteredTags = allTags.filter((tag) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return tag.name.toLowerCase().includes(query) || tag.slug.toLowerCase().includes(query);
  });
  const pageCount = Math.max(1, Math.ceil(filteredTags.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedTags = filteredTags.slice(pageStart, pageStart + PAGE_SIZE);
  const currentPageIds = paginatedTags.map((tag) => tag.id);
  const validSelectedTagIds = selectedTagIds.filter((id) => allTags.some((tag) => tag.id === id));
  const allFilteredSelected =
    filteredTags.length > 0 && filteredTags.every((tag) => validSelectedTagIds.includes(tag.id));
  const someFilteredSelected =
    filteredTags.some((tag) => validSelectedTagIds.includes(tag.id)) && !allFilteredSelected;

  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [storeId]);

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    setIsExporting(true);
    try {
      const blob = await apiClient.exportTags(storeId, format);
      downloadBlob(blob, `tags.${format}`);
    } catch (error) {
      console.error(error);
      alert('Failed to export tags');
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateDownload = async (format: 'csv' | 'xlsx') => {
    setTemplateLoading(true);
    try {
      const blob = await apiClient.downloadTagImportTemplate(storeId, format);
      downloadBlob(blob, `tags_template.${format}`);
    } catch (error) {
      console.error(error);
      alert('Failed to download template');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storeId) return;

    setIsImporting(true);
    setImportMessage('');
    setImportErrors([]);
    setImportWarnings([]);

    try {
      const result = await apiClient.importTags(storeId, file);
      setImportMessage(
        `Import terminé : ${result.imported} ajoutés, ${result.updated} mis à jour, ${result.skipped} ignorés.`
      );
      setImportErrors(result.errors ?? []);
      setImportWarnings(result.warnings ?? []);
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      setPage(1);
    } catch (error) {
      console.error(error);
      setImportMessage('Échec de l\'import.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    try {
      await deleteTagMutation.mutateAsync({ storeId, tagId: id });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return; // already removed
      }
      console.error(error);
    }
  };

  const handleDeleteSelected = async () => {
    if (validSelectedTagIds.length === 0) return;
    if (!confirm(`Delete ${validSelectedTagIds.length} selected tag(s)?`)) return;
    try {
      const results = await Promise.allSettled(
        validSelectedTagIds.map((tagId) => deleteTagMutation.mutateAsync({ storeId, tagId }))
      );

      const failures = results.filter(
        (r) => r.status === 'rejected' && !(isAxiosError(r.reason) && r.reason.response?.status === 404)
      );

      if (failures.length === 0) {
        setSelectedTagIds([]);
      } else {
        console.error('Tag delete failures', failures);
        alert('Some tags could not be deleted.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleTagSelection = (tagId: string, checked: boolean) => {
    setSelectedTagIds((current) => (
      checked ? Array.from(new Set([...current, tagId])) : current.filter((id) => id !== tagId)
    ));
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedTagIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...filteredTags.map((tag) => tag.id)]));
      }
      const filteredIds = new Set(filteredTags.map((tag) => tag.id));
      return current.filter((id) => !filteredIds.has(id));
    });
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for imports */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          <p className="text-gray-600">Manage product tags for filtering and organization.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={isExporting} onClick={() => void handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" disabled={isExporting} onClick={() => void handleExport('xlsx')}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" disabled={templateLoading} onClick={() => void handleTemplateDownload('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Template CSV
          </Button>
          <Button variant="outline" size="sm" disabled={templateLoading} onClick={() => void handleTemplateDownload('xlsx')}>
            <Download className="mr-2 h-4 w-4" />
            Template Excel
          </Button>
          <Button variant="outline" size="sm" disabled={isImporting} onClick={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button asChild>
            <Link href="/dashboard/tags/new">Create Tag</Link>
          </Button>
        </div>
      </div>

      {importMessage && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          {importMessage}
          <button className="ml-2 font-semibold underline" onClick={() => setImportMessage('')}>
            Dismiss
          </button>
        </div>
      )}

      {(importErrors.length > 0 || importWarnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Import details</CardTitle>
            <CardDescription>Review warnings and errors from the last import.</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>All Tags</CardTitle>
          <CardDescription>
            Tags can be used to filter products in the storefront.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
                placeholder="Search tags by name or slug..."
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={validSelectedTagIds.length === 0 || deleteTagMutation.isPending}
              onClick={() => void handleDeleteSelected()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({validSelectedTagIds.length})
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
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all tags"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={validSelectedTagIds.includes(tag.id)}
                        onChange={(e) => toggleTagSelection(tag.id, e.target.checked)}
                        aria-label={`Select tag ${tag.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{tag.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{tag.slug}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/tags/${tag.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(tag.id)}
                          disabled={deleteTagMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTags.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {isLoading ? 'Loading tags...' : 'No tags found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={currentPage}
            pageCount={pageCount}
            summary={`Page ${currentPage} of ${pageCount} · ${filteredTags.length} tag(s)`}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
