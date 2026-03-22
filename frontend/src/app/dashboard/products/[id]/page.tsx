'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiErrorMessage } from '@/lib/api/errors';
import { resolveMediaUrl } from '@/lib/api/media-url';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  useAssignProductTags,
  useCategories,
  useCreateProductImage,
  useDeleteProductImage,
  useProduct,
  useProductImages,
  useReorderProductImages,
  useTags,
  useUpdateProduct,
  useUpdateProductImage,
} from '@/lib/hooks/use-api';

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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { currentStore } = useAuth();
  const storeId = currentStore?.id || '';

  const { data: product, isLoading, isError } = useProduct(storeId, productId);
  const updateProductMutation = useUpdateProduct();
  const { data: categories } = useCategories(storeId);
  const { data: tags } = useTags(storeId);
  const { data: productImages } = useProductImages(storeId, productId);
  const assignTagsMutation = useAssignProductTags();
  const createImageMutation = useCreateProductImage();
  const updateImageMutation = useUpdateProductImage();
  const deleteImageMutation = useDeleteProductImage();
  const reorderImageMutation = useReorderProductImages();
  const [error, setError] = useState<string>('');
  const [selectedTagIdsOverride, setSelectedTagIdsOverride] = useState<string[] | null>(null);
  const [imageError, setImageError] = useState<string>('');
  const [imageDrafts, setImageDrafts] = useState<Record<string, { alt_text: string; caption: string }>>({});

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (product) {
      reset({
        title: product.title,
        slug: product.slug || '',
        description: product.description || '',
        price: product.price,
        sale_price: product.sale_price || undefined,
        status: product.status,
        visibility: product.visibility,
        track_stock: product.track_stock ?? false,
        stock: product.stock ?? 0,
        currency: product.currency,
        sku: product.sku || '',
        weight: product.weight || undefined,
        dimensions: product.dimensions || '',
        brand: product.brand || '',
        tax_class: product.tax_class || '',
        category_id: product.category_id || '',
      });
    }
  }, [product, reset]);

  const initialTagIds = product?.tags?.map((tag) => tag.id) ?? [];
  const selectedTagIds = selectedTagIdsOverride ?? initialTagIds;

  const toggleTag = (tagId: string) => {
    setSelectedTagIdsOverride((current) => {
      const base = current ?? initialTagIds;

      return base.includes(tagId)
        ? base.filter((id) => id !== tagId)
        : [...base, tagId];
    });
  };

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
      setImageError(getApiErrorMessage(uploadError, 'Failed to upload one or more images'));
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
      setImageError(getApiErrorMessage(updateError, 'Failed to update image metadata'));
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
      setImageError(getApiErrorMessage(reorderError, 'Failed to reorder images'));
    }
  };

  const removeImage = async (imageId: string) => {
    if (!storeId) {
      return;
    }

    if (!confirm('Delete this image?')) {
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
      setImageError(getApiErrorMessage(deleteError, 'Failed to delete image'));
    }
  };

  const onSubmit = async (data: ProductForm) => {
    if (!storeId) {
      setError('Select a store before updating a product.');
      return;
    }

    try {
      setError('');
      const payload = {
        ...data,
        slug: optionalString(data.slug),
        description: optionalString(data.description),
        sku: optionalString(data.sku),
        dimensions: optionalString(data.dimensions),
        brand: optionalString(data.brand),
        tax_class: optionalString(data.tax_class),
        category_id: optionalString(data.category_id),
        sale_price: optionalNumber(data.sale_price),
        weight: optionalNumber(data.weight),
      };

      await updateProductMutation.mutateAsync({ storeId, productId, data: payload });
      await assignTagsMutation.mutateAsync({ storeId, productId, tagIds: selectedTagIds });

      router.push('/dashboard/products');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to update product'));
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (isError || !product) {
    return <div className="p-6 text-red-600">Product not found</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Edit Product</CardTitle>
          <CardDescription>
            Update product details.
          </CardDescription>
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
                <Label htmlFor="title">Product Title *</Label>
                <Input id="title" placeholder="Cool T-Shirt" {...register('title')} />
                {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" placeholder="cool-t-shirt" {...register('slug')} />
                {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Short product description" {...register('description')} />
                {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input id="price" type="number" step="0.01" placeholder="0.00" {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-sm text-red-600">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">Sale Price</Label>
                <Input id="sale_price" type="number" step="0.01" placeholder="0.00" {...register('sale_price', { valueAsNumber: true })} />
                {errors.sale_price && <p className="text-sm text-red-600">{errors.sale_price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Input id="currency" placeholder="USD" {...register('currency')} />
                {errors.currency && <p className="text-sm text-red-600">{errors.currency.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input id="stock" type="number" placeholder="0" {...register('stock', { valueAsNumber: true })} />
                {errors.stock && <p className="text-sm text-red-600">{errors.stock.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && <p className="text-sm text-red-600">{errors.status.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility *</Label>
                <Controller
                  name="visibility"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="visibility">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.visibility && <p className="text-sm text-red-600">{errors.visibility.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="track_stock">
                  <input type="checkbox" {...register('track_stock')} className="h-4 w-4 mr-2" />
                  Track Stock
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || NO_CATEGORY_VALUE}
                      onValueChange={(value) => field.onChange(value === NO_CATEGORY_VALUE ? '' : value)}
                    >
                      <SelectTrigger id="category_id">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY_VALUE}>None</SelectItem>
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
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" placeholder="SKU-001" {...register('sku')} />
                {errors.sku && <p className="text-sm text-red-600">{errors.sku.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input id="weight" type="number" step="0.01" placeholder="0.00" {...register('weight', { valueAsNumber: true })} />
                {errors.weight && <p className="text-sm text-red-600">{errors.weight.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input id="dimensions" placeholder="e.g., 10x10x10" {...register('dimensions')} />
                {errors.dimensions && <p className="text-sm text-red-600">{errors.dimensions.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" placeholder="Brand name" {...register('brand')} />
                {errors.brand && <p className="text-sm text-red-600">{errors.brand.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_class">Tax Class</Label>
                <Input id="tax_class" placeholder="Standard" {...register('tax_class')} />
                {errors.tax_class && <p className="text-sm text-red-600">{errors.tax_class.message}</p>}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
                <p className="text-sm text-gray-600">Assign tags to improve filtering and merchandising.</p>
              </div>
              {!tags || tags.length === 0 ? (
                <p className="text-sm text-gray-500">Create tags first to assign them to this product.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {tags.map((tag) => {
                    const checked = selectedTagIds.includes(tag.id);

                    return (
                      <label key={tag.id} className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTag(tag.id)}
                          className="h-4 w-4"
                        />
                        <span>{tag.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-lg border border-gray-200 p-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Media</h2>
                <p className="text-sm text-gray-600">Upload PNG/JPG/WEBP, manage order, and edit alt/caption.</p>
              </div>

              {imageError && (
                <Alert variant="destructive">
                  <AlertDescription>{imageError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="product-images">Upload images</Label>
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
                <p className="text-xs text-gray-500">First image (position 0) is used as the primary image.</p>
              </div>

              {!productImages || productImages.length === 0 ? (
                <p className="text-sm text-gray-500">No images uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...productImages]
                    .sort((left, right) => left.position - right.position)
                    .map((image, index) => {
                      const draft = getDraft(image.id, image.alt_text, image.caption);
                      return (
                        <div key={image.id} className="rounded-md border border-gray-200 p-3">
                          <div className="flex flex-col gap-3 md:flex-row">
                            <img
                              src={resolveMediaUrl(image.url_thumbnail || image.url)}
                              alt={image.alt_text || product.title}
                              className="h-24 w-24 rounded-md object-cover"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>Position: {image.position}</span>
                                {index === 0 ? <span className="font-semibold text-green-700">Primary image</span> : null}
                              </div>

                              <Input
                                placeholder="Alt text"
                                value={draft.alt_text}
                                onChange={(event) => updateDraft(image.id, { alt_text: event.target.value })}
                              />
                              <Input
                                placeholder="Caption"
                                value={draft.caption}
                                onChange={(event) => updateDraft(image.id, { caption: event.target.value })}
                              />

                              <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => void moveImage(image.id, 'up')} disabled={index === 0 || reorderImageMutation.isPending}>
                                  Move Up
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => void moveImage(image.id, 'down')} disabled={index === productImages.length - 1 || reorderImageMutation.isPending}>
                                  Move Down
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => void saveImageMeta(image.id, image.alt_text, image.caption)} disabled={updateImageMutation.isPending}>
                                  Save Metadata
                                </Button>
                                <Button type="button" variant="destructive" size="sm" onClick={() => void removeImage(image.id)} disabled={deleteImageMutation.isPending}>
                                  Delete
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
                <Link href="/dashboard/products">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="w-full"
                disabled={updateProductMutation.isPending || assignTagsMutation.isPending}
              >
                {updateProductMutation.isPending || assignTagsMutation.isPending ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
