'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductRelationEditor } from '@/components/dashboard/product-relation-editor';
import { ProductTagPicker } from '@/components/dashboard/product-tag-picker';
import { getApiErrorMessage } from '@/lib/api/errors';
import { resolveMediaUrl } from '@/lib/api/media-url';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import {
  useAssignProductTags,
  useCategories,
  useCreateProductImage,
  useDeleteProductImage,
  useProduct,
  useProductRelations,
  useProductImages,
  useReplaceProductRelations,
  useReorderProductImages,
  useTags,
  useUpdateProduct,
  useUpdateProductImage,
} from '@/lib/hooks/use-api';
import { ProductRelation } from '@/lib/types';

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
const NO_CATEGORY_VALUE = '__none__';

function optionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeCurrency(value?: string, fallback = 'USD') {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length === 3 ? normalized : fallback;
}

function normalizeVisibility(value?: string): 'public' | 'private' {
  return value === 'private' ? 'private' : 'public';
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id || '';

  const { data: product, isLoading, isError } = useProduct(storeId, productId);
  const updateProductMutation = useUpdateProduct();
  const { data: categories } = useCategories(storeId);
  const { data: tags } = useTags(storeId);
  const { data: productRelations } = useProductRelations(storeId, productId);
  const { data: productImages } = useProductImages(storeId, productId);
  const assignTagsMutation = useAssignProductTags();
  const replaceRelationsMutation = useReplaceProductRelations();
  const createImageMutation = useCreateProductImage();
  const updateImageMutation = useUpdateProductImage();
  const deleteImageMutation = useDeleteProductImage();
  const reorderImageMutation = useReorderProductImages();
  const [error, setError] = useState<string>('');
  const [selectedTagIdsOverride, setSelectedTagIdsOverride] = useState<string[] | null>(null);
  const [imageError, setImageError] = useState<string>('');
  const [imageDrafts, setImageDrafts] = useState<Record<string, { alt_text: string; caption: string }>>({});
  const [relationDraftsOverride, setRelationDraftsOverride] = useState<ProductRelation[] | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (product) {
      const fallbackCurrency = normalizeCurrency(product.currency, currentStore?.currency || 'USD');
      reset({
        title: product.title,
        slug: product.slug || '',
        description: product.description || '',
        price: product.price,
        sale_price: product.sale_price || undefined,
        status: product.status,
        visibility: normalizeVisibility(product.visibility),
        track_stock: product.track_stock ?? false,
        stock: product.stock ?? 0,
        currency: fallbackCurrency,
        sku: product.sku || '',
        weight: product.weight || undefined,
        dimensions: product.dimensions || '',
        brand: product.brand || '',
        tax_class: product.tax_class || '',
        meta_title: product.meta_title || '',
        meta_description: product.meta_description || '',
        canonical_url: product.canonical_url || '',
        noindex: product.noindex || false,
        category_id: product.category_id || '',
      });
    }
  }, [currentStore?.currency, product, reset]);

  const initialTagIds = product?.tags?.map((tag) => tag.id) ?? [];
  const selectedTagIds = selectedTagIdsOverride ?? initialTagIds;
  const initialRelations = [
    ...(productRelations?.upsell_products ?? []),
    ...(productRelations?.cross_sell_products ?? []),
  ].map((relation) => ({
    id: relation.id,
    source_product_id: relation.source_product_id,
    related_product_id: relation.related_product_id,
    relation_type: relation.relation_type,
    position: relation.position,
    related_product: relation.related_product,
  }));
  const relationDrafts = relationDraftsOverride ?? initialRelations;

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || !storeId) {
      return;
    }

    setImageError('');
    try {
      for (const file of Array.from(files)) {
        await createImageMutation.mutateAsync({
          storeId,
          productId,
          file,
        });
      }
    } catch (uploadError: unknown) {
      setImageError(getApiErrorMessage(uploadError, t.productForm.uploadFailed));
    }
  };

  const getDraft = (imageId: string, altText?: string, caption?: string) => {
    return imageDrafts[imageId] ?? { alt_text: altText || '', caption: caption || '' };
  };

  const updateDraft = (imageId: string, patch: Partial<{ alt_text: string; caption: string }>) => {
    setImageDrafts((current) => ({
      ...current,
      [imageId]: {
        alt_text: patch.alt_text ?? current[imageId]?.alt_text ?? '',
        caption: patch.caption ?? current[imageId]?.caption ?? '',
      },
    }));
  };

  const saveImageMeta = async (imageId: string, altText?: string, caption?: string) => {
    if (!storeId) {
      return;
    }
    const draft = getDraft(imageId, altText, caption);
    setImageError('');
    try {
      await updateImageMutation.mutateAsync({
        storeId,
        productId,
        imageId,
        data: {
          alt_text: draft.alt_text.trim() || undefined,
          caption: draft.caption.trim() || undefined,
        },
      });
    } catch (updateError: unknown) {
      setImageError(getApiErrorMessage(updateError, t.productForm.imageMetaFailed));
    }
  };

  const moveImage = async (imageId: string, direction: 'up' | 'down') => {
    if (!storeId || !productImages || productImages.length < 2) {
      return;
    }

    const orderedIds = [...productImages]
      .sort((left, right) => left.position - right.position)
      .map((image) => image.id);
    const currentIndex = orderedIds.indexOf(imageId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedIds.length) {
      return;
    }

    const [removed] = orderedIds.splice(currentIndex, 1);
    orderedIds.splice(targetIndex, 0, removed);

    setImageError('');
    try {
      await reorderImageMutation.mutateAsync({
        storeId,
        productId,
        imageIds: orderedIds,
      });
    } catch (reorderError: unknown) {
      setImageError(getApiErrorMessage(reorderError, t.productForm.reorderFailed));
    }
  };

  const removeImage = async (imageId: string) => {
    if (!storeId) {
      return;
    }

    if (!confirm(t.productForm.deleteImageConfirm)) {
      return;
    }

    setImageError('');
    try {
      await deleteImageMutation.mutateAsync({
        storeId,
        productId,
        imageId,
      });
    } catch (deleteError: unknown) {
      setImageError(getApiErrorMessage(deleteError, t.productForm.deleteImageFailed));
    }
  };

  const onSubmit = async (data: ProductForm) => {
    if (!storeId) {
      setError(t.productForm.selectStoreUpdate);
      return;
    }

    if (!product) {
      setError(t.productForm.productNotFoundError);
      return;
    }

    const currentProduct = product;

    try {
      setError('');
      const normalizedVisibility = normalizeVisibility(data.visibility || currentProduct.visibility);
      const normalizedCurrency = normalizeCurrency(data.currency, currentStore?.currency || currentProduct.currency || 'USD');

      const payload = {
        ...data,
        visibility: normalizedVisibility,
        currency: normalizedCurrency,
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

      await updateProductMutation.mutateAsync({ storeId, productId, data: payload });
      await assignTagsMutation.mutateAsync({ storeId, productId, tagIds: selectedTagIds });
      await replaceRelationsMutation.mutateAsync({ storeId, productId, relations: relationDrafts });

      router.push('/dashboard/products');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t.productForm.updateFailed));
    }
  };

  if (isLoading) {
    return <div className="p-6">{t.productForm.loading}</div>;
  }

  if (isError || !product) {
    return <div className="p-6 text-red-600">{t.productForm.notFound}</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{t.productForm.editTitle}</CardTitle>
          <CardDescription>{t.productForm.editDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
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
                <Textarea id="description" placeholder={t.productForm.shortDescriptionPlaceholder} rows={4} {...register('description')} />
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
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder={t.productForm.selectStatus} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{t.productForm.statusDraft}</SelectItem>
                        <SelectItem value="published">{t.productForm.statusPublished}</SelectItem>
                        <SelectItem value="archived">{t.productForm.statusArchived}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && <p className="text-sm text-red-600">{errors.status.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">{t.productForm.visibility}</Label>
                <Controller
                  name="visibility"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="visibility">
                        <SelectValue placeholder={t.productForm.selectVisibility} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">{t.productForm.visibilityPublic}</SelectItem>
                        <SelectItem value="private">{t.productForm.visibilityPrivate}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.visibility && <p className="text-sm text-red-600">{errors.visibility.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="track_stock">
                  <input type="checkbox" {...register('track_stock')} className="h-4 w-4 mr-2" />
                  {t.productForm.trackStock}
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">{t.productForm.category}</Label>
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || NO_CATEGORY_VALUE}
                      onValueChange={(value) => field.onChange(value === NO_CATEGORY_VALUE ? '' : value)}
                    >
                      <SelectTrigger id="category_id">
                        <SelectValue placeholder={t.productForm.selectCategory} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY_VALUE}>{t.productForm.none}</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category_id && <p className="text-sm text-red-600">{errors.category_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">{t.productForm.sku}</Label>
                <Input id="sku" placeholder={t.productForm.skuPlaceholder} {...register('sku')} />
                {errors.sku && <p className="text-sm text-red-600">{errors.sku.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">{t.productForm.weight}</Label>
                <Input id="weight" type="number" step="0.01" placeholder={t.productForm.weightPlaceholderEdit} {...register('weight', { valueAsNumber: true })} />
                {errors.weight && <p className="text-sm text-red-600">{errors.weight.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">{t.productForm.dimensions}</Label>
                <Input id="dimensions" placeholder={t.productForm.dimensionsPlaceholderEdit} {...register('dimensions')} />
                {errors.dimensions && <p className="text-sm text-red-600">{errors.dimensions.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">{t.productForm.brand}</Label>
                <Input id="brand" placeholder={t.productForm.brandPlaceholder} {...register('brand')} />
                {errors.brand && <p className="text-sm text-red-600">{errors.brand.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_class">{t.productForm.taxClass}</Label>
                <Input id="tax_class" placeholder={t.productForm.taxClassPlaceholderEdit} {...register('tax_class')} />
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
            </div>

            <ProductTagPicker
              tags={tags ?? []}
              selectedIds={selectedTagIds}
              onChange={(nextIds) => setSelectedTagIdsOverride(nextIds)}
              title={t.productForm.tags}
              description={t.productForm.editTagsDesc}
              searchPlaceholder={t.productForm.tagSearchPlaceholder}
              selectedLabel={t.productForm.selectedTags}
              emptyState={t.productForm.emptyTagsEdit}
              noMatches={t.productForm.noTagMatches}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <ProductRelationEditor
                storeId={storeId}
                currentProductId={productId}
                relationType="upsell"
                title={t.productForm.upsellProducts}
                description={t.productForm.upsellDesc}
                searchPlaceholder={t.productForm.relatedSearchPlaceholder}
                emptyState={t.productForm.noUpsellProducts}
                noMatches={t.productForm.noRelatedMatches}
                relations={relationDrafts.filter((relation) => relation.relation_type === 'upsell')}
                onChange={(nextRelations) => setRelationDraftsOverride((current) => ([
                  ...(current ?? relationDrafts).filter((relation) => relation.relation_type !== 'upsell'),
                  ...nextRelations,
                ]))}
              />
              <ProductRelationEditor
                storeId={storeId}
                currentProductId={productId}
                relationType="cross_sell"
                title={t.productForm.crossSellProducts}
                description={t.productForm.crossSellDesc}
                searchPlaceholder={t.productForm.relatedSearchPlaceholder}
                emptyState={t.productForm.noCrossSellProducts}
                noMatches={t.productForm.noRelatedMatches}
                relations={relationDrafts.filter((relation) => relation.relation_type === 'cross_sell')}
                onChange={(nextRelations) => setRelationDraftsOverride((current) => ([
                  ...(current ?? relationDrafts).filter((relation) => relation.relation_type !== 'cross_sell'),
                  ...nextRelations,
                ]))}
              />
            </div>

            <div className="space-y-4 rounded-lg border border-gray-200 p-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t.productForm.media}</h2>
                <p className="text-sm text-gray-600">{t.productForm.mediaDesc}</p>
              </div>

              {imageError && (
                <Alert variant="destructive">
                  <AlertDescription>{imageError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="product-images">{t.productForm.uploadImages}</Label>
                <Input
                  id="product-images"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  multiple
                  onChange={(event) => {
                    void handleUploadImages(event.target.files);
                    event.currentTarget.value = '';
                  }}
                  disabled={createImageMutation.isPending}
                />
                <p className="text-xs text-gray-500">{t.productForm.primaryImageHint}</p>
              </div>

              {!productImages || productImages.length === 0 ? (
                <p className="text-sm text-gray-500">{t.productForm.noImages}</p>
              ) : (
                <div className="space-y-3">
                  {[...productImages]
                    .sort((left, right) => left.position - right.position)
                    .map((image, index) => {
                      const draft = getDraft(image.id, image.alt_text, image.caption);
                      return (
                        <div key={image.id} className="rounded-md border border-gray-200 p-3">
                          <div className="flex flex-col gap-3 md:flex-row">
                            <div className="relative h-24 w-24 overflow-hidden rounded-md">
                              <Image
                                src={resolveMediaUrl(image.url_thumbnail || image.url)}
                                alt={image.alt_text || product.title}
                                fill
                                unoptimized
                                className="object-cover"
                                onError={(event) => {
                                  const fallbackSrc = resolveMediaUrl(image.url);
                                  const imageElement = event.currentTarget as HTMLImageElement;
                                  if (imageElement.src !== fallbackSrc) {
                                    imageElement.onerror = null;
                                    imageElement.src = fallbackSrc;
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>{t.productForm.position}: {image.position}</span>
                                {index === 0 ? <span className="font-semibold text-green-700">{t.productForm.primaryImage}</span> : null}
                              </div>

                              <Input
                                placeholder={t.productForm.altText}
                                value={draft.alt_text}
                                onChange={(event) => updateDraft(image.id, { alt_text: event.target.value })}
                              />
                              <Input
                                placeholder={t.productForm.caption}
                                value={draft.caption}
                                onChange={(event) => updateDraft(image.id, { caption: event.target.value })}
                              />

                              <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => void moveImage(image.id, 'up')} disabled={index === 0 || reorderImageMutation.isPending}>
                                  {t.productForm.moveUp}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => void moveImage(image.id, 'down')} disabled={index === productImages.length - 1 || reorderImageMutation.isPending}>
                                  {t.productForm.moveDown}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => void saveImageMeta(image.id, image.alt_text, image.caption)} disabled={updateImageMutation.isPending}>
                                  {t.productForm.saveMetadata}
                                </Button>
                                <Button type="button" variant="destructive" size="sm" onClick={() => void removeImage(image.id)} disabled={deleteImageMutation.isPending}>
                                  {t.productForm.deleteImage}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/dashboard/products">{t.productForm.cancel}</Link>
              </Button>
              <Button
                type="submit"
                className="w-full"
                disabled={updateProductMutation.isPending || assignTagsMutation.isPending || replaceRelationsMutation.isPending}
              >
                {updateProductMutation.isPending || assignTagsMutation.isPending || replaceRelationsMutation.isPending ? t.productForm.updating : t.productForm.update}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
