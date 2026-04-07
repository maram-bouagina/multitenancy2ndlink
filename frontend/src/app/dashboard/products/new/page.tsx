'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductTagPicker } from '@/components/dashboard/product-tag-picker';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import { useAssignProductTags, useCategories, useCreateProduct, useCreateProductImage, useTags } from '@/lib/hooks/use-api';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be >= 0'),
  sale_price: z.number().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  visibility: z.enum(['public', 'private']),
  track_stock: z.boolean(),
  stock: z.number().min(0, 'Stock must be >= 0'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  sku: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  brand: z.string().optional(),
  tax_class: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  canonical_url: z.string().url().optional().or(z.literal('')),
  noindex: z.boolean().optional(),
  category_id: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

function optionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export default function NewProductPage() {
  const router = useRouter();
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id || '';
  const [error, setError] = useState<string>('');
  const [planError, setPlanError] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [secondaryFiles, setSecondaryFiles] = useState<File[]>([]);

  const createProductMutation = useCreateProduct();
  const createImageMutation = useCreateProductImage();
  const assignTagsMutation = useAssignProductTags();
  const { data: categories } = useCategories(storeId);
  const { data: tags } = useTags(storeId);

  const { register, handleSubmit, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      status: 'draft',
      visibility: 'public',
      track_stock: true,
      stock: 0,
      currency: 'USD',
    },
  });

  const onSubmit = async (data: ProductForm) => {
    if (!storeId) {
      setError(t.productForm.selectStoreCreate);
      return;
    }

    try {
      setError('');
      setPlanError(false);
      const payload = {
        ...data,
        slug: optionalString(data.slug),
        description: optionalString(data.description),
        sku: optionalString(data.sku),
        dimensions: optionalString(data.dimensions),
        brand: optionalString(data.brand),
        tax_class: optionalString(data.tax_class),
        meta_title: optionalString(data.meta_title),
        meta_description: optionalString(data.meta_description),
        canonical_url: optionalString(data.canonical_url),
        noindex: data.noindex || false,
        category_id: optionalString(data.category_id),
        sale_price: optionalNumber(data.sale_price),
        weight: optionalNumber(data.weight),
      };

      const product = await createProductMutation.mutateAsync({ storeId, data: payload });

      if (selectedTagIds.length > 0) {
        await assignTagsMutation.mutateAsync({ storeId, productId: product.id, tagIds: selectedTagIds });
      }

      if (primaryImage || secondaryFiles.length > 0) {
        const uploads: Promise<unknown>[] = [];
        if (primaryImage) {
          uploads.push(
            createImageMutation.mutateAsync({
              storeId,
              productId: product.id,
              file: primaryImage,
              position: 0,
            })
          );
        }
        secondaryFiles.forEach((file, index) => {
          uploads.push(
            createImageMutation.mutateAsync({
              storeId,
              productId: product.id,
              file,
              position: (primaryImage ? 1 : 0) + index,
            })
          );
        });
        await Promise.allSettled(uploads);
        router.push(`/dashboard/products/${product.id}`);
        return;
      }

      router.push('/dashboard/products');
    } catch (error: any) {
      const msg = getApiErrorMessage(error, t.productForm.createFailed);
      setError(msg);
      if (msg && msg.toLowerCase().includes('plan')) setPlanError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{t.productForm.createTitle}</CardTitle>
          <CardDescription>
            {t.productForm.createDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
                {planError && (
                  <div className="mt-2">
                    <a href="/dashboard/settings/plan" className="text-blue-600 underline">Upgrade your plan</a>
                  </div>
                )}
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">{t.productForm.title}</Label>
                <Input id="title" placeholder={t.productForm.titlePlaceholder} {...register('title')} />
                {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">{t.productForm.slug}</Label>
                <Input id="slug" placeholder={t.productForm.slugPlaceholder} {...register('slug')} />
                {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="description">{t.productForm.description}</Label>
                <Textarea id="description" placeholder={t.productForm.descriptionPlaceholder} rows={4} {...register('description')} />
                {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">{t.productForm.price}</Label>
                <Input id="price" type="number" step="0.01" placeholder="0.00" {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-sm text-red-600">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">{t.productForm.salePrice}</Label>
                <Input id="sale_price" type="number" step="0.01" placeholder="0.00" {...register('sale_price', { valueAsNumber: true })} />
                {errors.sale_price && <p className="text-sm text-red-600">{errors.sale_price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t.productForm.currency}</Label>
                <Input id="currency" placeholder="USD" {...register('currency')} />
                {errors.currency && <p className="text-sm text-red-600">{errors.currency.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">{t.productForm.stock}</Label>
                <Input id="stock" type="number" placeholder="0" {...register('stock', { valueAsNumber: true })} />
                {errors.stock && <p className="text-sm text-red-600">{errors.stock.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t.productForm.status}</Label>
                <select id="status" {...register('status')} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-site-text shadow-sm transition-colors file:border-0 file:bg-transparent file:text-site-text file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="draft">{t.productForm.statusDraft}</option>
                  <option value="published">{t.productForm.statusPublished}</option>
                  <option value="archived">{t.productForm.statusArchived}</option>
                </select>
                {errors.status && <p className="text-sm text-red-600">{errors.status.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">{t.productForm.visibility}</Label>
                <select id="visibility" {...register('visibility')} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-site-text shadow-sm transition-colors file:border-0 file:bg-transparent file:text-site-text file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="public">{t.productForm.visibilityPublic}</option>
                  <option value="private">{t.productForm.visibilityPrivate}</option>
                </select>
                {errors.visibility && <p className="text-sm text-red-600">{errors.visibility.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">{t.productForm.sku}</Label>
                <Input id="sku" placeholder={t.productForm.skuPlaceholder} {...register('sku')} />
                {errors.sku && <p className="text-sm text-red-600">{errors.sku.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">{t.productForm.weight}</Label>
                <Input id="weight" type="number" step="0.01" placeholder={t.productForm.weightPlaceholderCreate} {...register('weight', { valueAsNumber: true })} />
                {errors.weight && <p className="text-sm text-red-600">{errors.weight.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">{t.productForm.brand}</Label>
                <Input id="brand" placeholder={t.productForm.brandPlaceholder} {...register('brand')} />
                {errors.brand && <p className="text-sm text-red-600">{errors.brand.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">{t.productForm.dimensions}</Label>
                <Input id="dimensions" placeholder={t.productForm.dimensionsPlaceholderCreate} {...register('dimensions')} />
                {errors.dimensions && <p className="text-sm text-red-600">{errors.dimensions.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_class">{t.productForm.taxClass}</Label>
                <Input id="tax_class" placeholder={t.productForm.taxClassPlaceholderCreate} {...register('tax_class')} />
                {errors.tax_class && <p className="text-sm text-red-600">{errors.tax_class.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_title">SEO Title</Label>
                <Input id="meta_title" placeholder="Override page title for search engines" {...register('meta_title')} />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="meta_description">SEO Description</Label>
                <Textarea id="meta_description" placeholder="Override meta description for search engines (150–160 chars recommended)" rows={2} {...register('meta_description')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonical_url">Canonical URL</Label>
                <Input id="canonical_url" type="url" placeholder="https://example.com/products/my-product" {...register('canonical_url')} />
                {errors.canonical_url && <p className="text-sm text-red-600">{errors.canonical_url.message}</p>}
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input id="noindex" type="checkbox" className="h-4 w-4 rounded border-gray-300" {...register('noindex')} />
                <Label htmlFor="noindex">No Index (hide from search engines)</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">{t.productForm.categoryOptional}</Label>
                <select id="category_id" {...register('category_id')} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-site-text shadow-sm transition-colors file:border-0 file:bg-transparent file:text-site-text file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">{t.productForm.selectCategory}</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="text-sm text-red-600">{errors.category_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="track_stock" className="flex items-center gap-2">
                  <input type="checkbox" id="track_stock" {...register('track_stock')} className="h-4 w-4" />
                  <span>{t.productForm.trackStock}</span>
                </Label>
              </div>
            </div>

            <ProductTagPicker
              tags={tags ?? []}
              selectedIds={selectedTagIds}
              onChange={setSelectedTagIds}
              title={t.productForm.tags}
              description={t.productForm.createTagsDesc}
              searchPlaceholder={t.productForm.tagSearchPlaceholder}
              selectedLabel={t.productForm.selectedTags}
              emptyState={t.productForm.emptyTagsCreate}
              noMatches={t.productForm.noTagMatches}
            />

            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t.productForm.media}</h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-image">{t.productForm.primaryImage}</Label>
                <p className="text-sm text-gray-600">{t.productForm.primaryImageHint}</p>
                <Input
                  id="primary-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setPrimaryImage(event.target.files?.[0] ?? null)}
                />
                {primaryImage && (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 p-2 text-sm text-green-700">
                    <span>{primaryImage.name}</span>
                    <button type="button" className="text-red-500 hover:text-red-700" onClick={() => setPrimaryImage(null)}>&times;</button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-images">{t.productForm.secondaryImage}</Label>
                <p className="text-sm text-gray-600">{t.productForm.secondaryImageHint}</p>
                <Input
                  id="secondary-images"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) => setSecondaryFiles(Array.from(event.target.files ?? []))}
                />
                {secondaryFiles.length > 0 && (
                  <div className="space-y-1 rounded-md bg-gray-50 p-2 text-sm text-gray-600">
                    {secondaryFiles.map((file) => (
                      <p key={`${file.name}-${file.size}`}>{file.name}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/dashboard/products">{t.productForm.cancel}</Link>
              </Button>
              <Button type="submit" className="w-full" disabled={createProductMutation.isPending || assignTagsMutation.isPending || createImageMutation.isPending}>
                {t.productForm.create}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
