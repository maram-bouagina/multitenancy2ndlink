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
import { useCollections, useDeleteCollection } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Edit, Eye, PackageOpen, Search, Trash2, Upload } from 'lucide-react';

export default function CollectionsPage() {
  const PAGE_SIZE = 10;
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [imageFilter, setImageFilter] = useState('');
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: collections, isLoading } = useCollections(storeId);
  const deleteCollectionMutation = useDeleteCollection();
  const allCollections = collections ?? [];
  const filteredCollections = allCollections.filter((collection) => {
    const query = search.trim().toLowerCase();
    const searchHaystack = [
      collection.name,
      collection.slug,
      collection.description,
      collection.rule,
      collection.meta_title,
      collection.meta_description,
      collection.canonical_url,
      collection.image_url,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = !query || searchHaystack.includes(query);
    const matchesType = !typeFilter || collection.type === typeFilter;
    const matchesImage = !imageFilter
      || (imageFilter === 'with-image' && !!collection.image_url)
      || (imageFilter === 'without-image' && !collection.image_url);
    return matchesSearch && matchesType && matchesImage;
  });
  const pageCount = Math.max(1, Math.ceil(filteredCollections.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedCollections = filteredCollections.slice(pageStart, pageStart + PAGE_SIZE);
  const filteredCollectionIds = filteredCollections.map((collection) => collection.id);
  const validSelectedCollectionIds = selectedCollectionIds.filter((id) => allCollections.some((collection) => collection.id === id));

  const downloadBlob = (blob: Blob, filename: string) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    const collection = allCollections.find((c) => c.id === id);
    const effectiveStoreId = collection?.store_id ?? storeId;
    try {
      await deleteCollectionMutation.mutateAsync({ storeId: effectiveStoreId, collectionId: id });
    } catch (error: any) {
      if (error?.response?.status !== 404) console.error(error);
    }
  };

  const handleDeleteSelected = async () => {
    if (validSelectedCollectionIds.length === 0) return;
    if (!confirm(`Delete ${validSelectedCollectionIds.length} selected collection(s)?`)) return;
    try {
      await Promise.all(validSelectedCollectionIds.map((collectionId) => {
        const collection = allCollections.find((c) => c.id === collectionId);
        const effectiveStoreId = collection?.store_id ?? storeId;
        return deleteCollectionMutation.mutateAsync({ storeId: effectiveStoreId, collectionId });
      }));
      setSelectedCollectionIds([]);
    } catch (error: any) {
      if (error?.response?.status !== 404) console.error(error);
    }
  };

  const toggleCollectionSelection = (collectionId: string, checked: boolean) => {
    setSelectedCollectionIds((current) => (
      checked ? Array.from(new Set([...current, collectionId])) : current.filter((id) => id !== collectionId)
    ));
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedCollectionIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...filteredCollectionIds]));
      }
      return current.filter((id) => !filteredCollectionIds.includes(id));
    });
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    setIsExporting(true);
    try {
      const blob = await apiClient.exportCollections(storeId, format);
      downloadBlob(blob, `collections.${format}`);
    } catch (error) {
      alert(getApiErrorMessage(error, 'Collection export failed.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateDownload = async (format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    try {
      const blob = await apiClient.downloadCollectionImportTemplate(storeId, format);
      downloadBlob(blob, `collections_template.${format}`);
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
      const result = await apiClient.importCollections(storeId, file);
      setImportMessage(`Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}.`);
      setImportErrors(Array.isArray(result.errors) ? result.errors : []);
      setImportWarnings(Array.isArray(result.warnings) ? result.warnings : []);
    } catch (error) {
      setImportMessage(getApiErrorMessage(error, 'Collection import failed.'));
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
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-600">Organize products into collections.</p>
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

		  <Button asChild>
			<Link href="/dashboard/collections/new">Create Collection</Link>
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
          <CardTitle>All Collections</CardTitle>
          <CardDescription>
            Collections help group products for promotions or themed catalogs.
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
                  placeholder="Search name, slug, description, rule..."
                />
              </div>
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">All types</option>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
              <select
                value={imageFilter}
                onChange={(event) => {
                  setImageFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">All image states</option>
                <option value="with-image">With image</option>
                <option value="without-image">Without image</option>
              </select>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={validSelectedCollectionIds.length === 0 || deleteCollectionMutation.isPending}
              onClick={() => void handleDeleteSelected()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({validSelectedCollectionIds.length})
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredCollectionIds.length > 0 && filteredCollectionIds.every((id) => validSelectedCollectionIds.includes(id))}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all collections"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCollections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={validSelectedCollectionIds.includes(collection.id)}
                        onChange={(e) => toggleCollectionSelection(collection.id, e.target.checked)}
                        aria-label={`Select collection ${collection.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{collection.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{collection.slug}</TableCell>
                    <TableCell className="text-sm text-gray-600"><span className="capitalize">{collection.type}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/collections/${collection.id}/details`} prefetch={false}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/collections/${collection.id}/products`} prefetch={false}>
                            <PackageOpen className="mr-2 h-4 w-4" />
                            Products
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/collections/${collection.id}`} prefetch={false}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(collection.id)}
                          disabled={deleteCollectionMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCollections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {isLoading ? 'Loading collections...' : 'No collections found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={currentPage}
            pageCount={pageCount}
            summary={`Page ${currentPage} of ${pageCount} · ${filteredCollections.length} collection(s)`}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
