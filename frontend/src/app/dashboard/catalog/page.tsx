'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Upload, FileSpreadsheet, Trash2, Search, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Tab = 'products' | 'categories' | 'tags' | 'collections' | 'full' | 'duplicates';

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  warnings?: string[];
  errors?: string[];
}

interface DuplicateGroup {
  field: string;
  value: string;
  products: Array<{ id: string; title: string; sku: string; slug: string }>;
}

export default function CatalogPage() {
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const ct = t.catalogPage;
  const storeId = currentStore?.id || '';

  const [activeTab, setActiveTab] = useState<Tab>('products');

  // Import state per entity
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Purge state
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState('');

  // Duplicates state
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isFindingDuplicates, setIsFindingDuplicates] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearFeedback = () => {
    setImportResult(null);
    setImportError('');
    setPurgeResult('');
    setDuplicateMessage('');
  };

  // ── Export handler ──────────────────────────────────────────────────────────
  const handleExport = async (entity: string, format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    setIsExporting(true);
    clearFeedback();
    try {
      let blob: Blob;
      switch (entity) {
        case 'products':
          blob = await apiClient.exportProducts(storeId, format);
          break;
        case 'categories':
          blob = await apiClient.exportCategories(storeId, format);
          break;
        case 'tags':
          blob = await apiClient.exportTags(storeId, format);
          break;
        case 'collections':
          blob = await apiClient.exportCollections(storeId, format);
          break;
        default:
          return;
      }
      downloadBlob(blob, `${entity}.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
    } catch (error) {
      setImportError(ct.exportFailed);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Template handler ────────────────────────────────────────────────────────
  const handleTemplate = async (entity: string, format: 'csv' | 'xlsx') => {
    if (!storeId) return;
    try {
      let blob: Blob;
      switch (entity) {
        case 'products':
          blob = await apiClient.downloadProductImportTemplate(storeId, format);
          break;
        case 'categories':
          blob = await apiClient.downloadCategoryImportTemplate(storeId, format);
          break;
        case 'tags':
          blob = await apiClient.downloadTagImportTemplate(storeId, format);
          break;
        case 'collections':
          blob = await apiClient.downloadCollectionImportTemplate(storeId, format);
          break;
        default:
          return;
      }
      downloadBlob(blob, `${entity}_template.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
    } catch (error) {
      console.error('Template download error:', error);
    }
  };

  // ── Import handler ──────────────────────────────────────────────────────────
  const handleImport = async (entity: string, file: File) => {
    if (!storeId) return;
    setIsImporting(true);
    clearFeedback();
    try {
      let result: ImportResult;
      switch (entity) {
        case 'products':
          result = await apiClient.importProducts(storeId, file);
          break;
        case 'categories':
          result = await apiClient.importCategories(storeId, file);
          break;
        case 'tags':
          result = await apiClient.importTags(storeId, file);
          break;
        case 'collections':
          result = await apiClient.importCollections(storeId, file);
          break;
        default:
          return;
      }
      setImportResult(result);
    } catch (error) {
      setImportError(getApiErrorMessage(error, ct.importFailed));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelected = (entity: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImport(entity, file);
  };

  // ── Full catalog export ─────────────────────────────────────────────────────
  const handleFullCatalogExport = async () => {
    if (!storeId) return;
    setIsExporting(true);
    clearFeedback();
    try {
      const blob = await apiClient.exportFullCatalog(storeId);
      downloadBlob(blob, 'full_catalog.xlsx');
    } catch (error) {
      setImportError(ct.exportFailed);
      console.error('Full catalog export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Purge ───────────────────────────────────────────────────────────────────
  const handlePurge = async () => {
    if (!storeId || purgeConfirmText !== 'PURGE') return;
    setIsPurging(true);
    clearFeedback();
    try {
      const result = await apiClient.purgeCatalog(storeId);
      setPurgeResult(
        interpolate(ct.purgeSuccess, {
          products: result.products,
          categories: result.categories,
          tags: result.tags,
          collections: result.collections,
        }),
      );
      setShowPurgeDialog(false);
      setPurgeConfirmText('');
    } catch (error) {
      setPurgeResult(getApiErrorMessage(error, ct.purgeFailed));
    } finally {
      setIsPurging(false);
    }
  };

  // ── Find duplicates ─────────────────────────────────────────────────────────
  const handleFindDuplicates = async () => {
    if (!storeId) return;
    setIsFindingDuplicates(true);
    clearFeedback();
    try {
      const result = await apiClient.findDuplicates(storeId);
      setDuplicates(result.duplicates || []);
      setDuplicateMessage(
        result.duplicates?.length
          ? interpolate(ct.duplicatesFound, { count: result.duplicates.length })
          : ct.noDuplicates,
      );
    } catch (error) {
      setDuplicateMessage(getApiErrorMessage(error, ct.exportFailed));
    } finally {
      setIsFindingDuplicates(false);
    }
  };

  // ── Entity section component ────────────────────────────────────────────────
  const EntitySection = ({ entity, label }: { entity: string; label: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" /> {ct.export}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport(entity, 'csv')}>
                {ct.exportCsv}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(entity, 'xlsx')}>
                {ct.exportExcel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import */}
          <Button
            variant="outline"
            size="sm"
            disabled={isImporting}
            onClick={() => {
              clearFeedback();
              // Create a temporary file input per entity
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,.xlsx,.xls';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleImport(entity, file);
              };
              input.click();
            }}
          >
            <Upload className="mr-2 h-4 w-4" /> {isImporting ? ct.importing : ct.import}
          </Button>

          {/* Template */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> {ct.template}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleTemplate(entity, 'csv')}>
                {ct.templateCsv}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTemplate(entity, 'xlsx')}>
                {ct.templateExcel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'products', label: ct.tabProducts },
    { key: 'categories', label: ct.tabCategories },
    { key: 'tags', label: ct.tabTags },
    { key: 'collections', label: ct.tabCollections },
    { key: 'full', label: ct.tabFullCatalog },
    { key: 'duplicates', label: ct.tabDuplicates },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{ct.title}</h1>
        <p className="text-muted-foreground">{ct.subtitle}</p>
      </div>

      {/* Feedback banners */}
      {importResult && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          <div className="flex-1 space-y-1">
            <p className="font-medium text-green-800">
              {interpolate(ct.importSuccess, {
                imported: importResult.imported,
                updated: importResult.updated,
                skipped: importResult.skipped,
              })}
            </p>
            {importResult.errors && importResult.errors.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-red-700">{ct.errors} ({importResult.errors.length})</summary>
                <ul className="mt-1 list-inside list-disc text-red-600">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
            {importResult.warnings && importResult.warnings.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-yellow-700">{ct.warnings} ({importResult.warnings.length})</summary>
                <ul className="mt-1 list-inside list-disc text-yellow-600">
                  {importResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </details>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>{ct.dismiss}</Button>
        </div>
      )}

      {importError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <XCircle className="h-5 w-5 text-red-600" />
          <p className="flex-1 text-red-800">{importError}</p>
          <Button variant="ghost" size="sm" onClick={() => setImportError('')}>{ct.dismiss}</Button>
        </div>
      )}

      {purgeResult && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <p className="flex-1 text-orange-800">{purgeResult}</p>
          <Button variant="ghost" size="sm" onClick={() => setPurgeResult('')}>{ct.dismiss}</Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); clearFeedback(); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {(activeTab === 'products' || activeTab === 'categories' || activeTab === 'tags' || activeTab === 'collections') && (
        <EntitySection
          entity={activeTab}
          label={tabs.find((t) => t.key === activeTab)!.label}
        />
      )}

      {activeTab === 'full' && (
        <div className="space-y-4">
          {/* Full catalog export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{ct.exportFullCatalog}</CardTitle>
              <CardDescription>{ct.exportFullCatalogDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleFullCatalogExport} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" /> {ct.exportFullCatalog}
              </Button>
            </CardContent>
          </Card>

          {/* Purge */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-700">{ct.purge}</CardTitle>
              <CardDescription className="text-red-600">{ct.purgeDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setShowPurgeDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> {ct.purge}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'duplicates' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{ct.findDuplicates}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleFindDuplicates} disabled={isFindingDuplicates}>
              <Search className="mr-2 h-4 w-4" /> {isFindingDuplicates ? ct.findingDuplicates : ct.findDuplicates}
            </Button>

            {duplicateMessage && (
              <p className="text-sm font-medium">{duplicateMessage}</p>
            )}

            {duplicates.length > 0 && (
              <div className="space-y-4">
                {duplicates.map((group, gi) => (
                  <Card key={gi} className="border-yellow-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{group.field}</Badge>
                        <span className="text-sm font-medium">{group.value}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Slug</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.products.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}...</TableCell>
                              <TableCell>{p.title}</TableCell>
                              <TableCell>{p.sku || '—'}</TableCell>
                              <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" /> {ct.guideTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>{ct.guideProducts}</li>
            <li>{ct.guideCategories}</li>
            <li>{ct.guideTags}</li>
            <li>{ct.guideCollections}</li>
            <li>{ct.guidePurge}</li>
            <li>{ct.guideDuplicates}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Purge confirmation dialog */}
      <Dialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">{ct.purge}</DialogTitle>
            <DialogDescription>{ct.purgeDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium">{ct.purgeConfirm}</p>
            <Input
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder="PURGE"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPurgeDialog(false); setPurgeConfirmText(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={purgeConfirmText !== 'PURGE' || isPurging}
              onClick={handlePurge}
            >
              {isPurging ? ct.purging : ct.purgeButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
