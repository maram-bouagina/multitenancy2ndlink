'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveMediaUrl } from '@/lib/api/media-url';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import { useCategories, useProduct, useProductImages } from '@/lib/hooks/use-api';

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

export default function ProductDetailsPage() {
  const params = useParams();
  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { currentStore } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id || '';

  const { data: product, isLoading, isError } = useProduct(storeId, productId);
  const { data: categories } = useCategories(storeId);
  const { data: productImages } = useProductImages(storeId, productId);

  if (isLoading) {
    return <div className="p-6">{t.productDetailsPage.loading}</div>;
  }

  if (isError || !product) {
    return <div className="p-6 text-red-600">{t.productDetailsPage.notFound}</div>;
  }

  const categoryName = categories?.find((c) => c.id === product.category_id)?.name || t.productDetailsPage.uncategorized;
  const statusLabel = product.status === 'draft'
    ? t.productForm.statusDraft
    : product.status === 'published'
      ? t.productForm.statusPublished
      : product.status === 'archived'
        ? t.productForm.statusArchived
        : product.status;
  const visibilityLabel = product.visibility === 'private' ? t.productForm.visibilityPrivate : t.productForm.visibilityPublic;
  const primaryImage = productImages?.[0];
  const productCollections = product.collections ?? [];
  const productTags = product.tags ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
          <p className="text-gray-600">{t.productDetailsPage.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/products">{t.productDetailsPage.back}</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/products/${product.id}`}>{t.productDetailsPage.edit}</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="relative aspect-16/10 border-b bg-gray-100">
            {primaryImage ? (
              <Image
                src={resolveMediaUrl(primaryImage.url_large || primaryImage.url_medium || primaryImage.url_thumbnail || primaryImage.url)}
                alt={primaryImage.alt_text || product.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No media preview available
              </div>
            )}
          </div>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={product.status === 'published' ? 'default' : 'secondary'}>{statusLabel}</Badge>
              <Badge variant="outline">{visibilityLabel}</Badge>
              {product.track_stock ? (
                <Badge variant={product.stock > 0 ? 'secondary' : 'destructive'}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </Badge>
              ) : (
                <Badge variant="secondary">Stock not tracked</Badge>
              )}
            </div>
            <CardTitle className="text-2xl">{product.title}</CardTitle>
            <CardDescription>{product.description || t.productDetailsPage.noDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current price</p>
                <p className="mt-2 text-xl font-semibold text-gray-900">{product.price} {product.currency}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Sale price</p>
                <p className="mt-2 text-xl font-semibold text-gray-900">{product.sale_price ?? '-'}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Published</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">{formatDateTime(product.published_at)}</p>
              </div>
            </div>

            {productCollections.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Collections</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {productCollections.map((collection) => (
                    <Badge key={collection.id} variant="outline">{collection.name}</Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {productTags.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Tags</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {productTags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.productDetailsPage.overview}</CardTitle>
              <CardDescription>{t.productDetailsPage.overviewDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.slug}</span><span>{product.slug}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.category}</span><span>{categoryName}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.sku}</span><span>{product.sku || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.brand}</span><span>{product.brand || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.taxClass}</span><span>{product.tax_class || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.weight}</span><span>{product.weight ?? '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.dimensions}</span><span>{product.dimensions || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Created</span><span>{formatDateTime(product.created_at)}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Updated</span><span>{formatDateTime(product.updated_at)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory & search</CardTitle>
              <CardDescription>Operational and SEO-facing fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.stock}</span><span>{product.stock}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">{t.productDetailsPage.trackStock}</span><span>{product.track_stock ? t.customersPage.yes : t.customersPage.no}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Low stock threshold</span><span>{product.low_stock_threshold ?? '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Meta title</span><span className="max-w-56 truncate text-right">{product.meta_title || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Canonical URL</span><span className="max-w-56 truncate text-right">{product.canonical_url || '-'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">No index</span><span>{product.noindex ? t.customersPage.yes : t.customersPage.no}</span></div>
              <div>
                <p className="text-gray-500">Meta description</p>
                <p className="mt-1 leading-6 text-gray-900">{product.meta_description || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
          <CardDescription>Product media attached to this item.</CardDescription>
        </CardHeader>
        <CardContent>
          {productImages && productImages.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {productImages.map((image) => {
                const src = resolveMediaUrl(image.url_large || image.url_medium || image.url_thumbnail || image.url);
                return (
                  <div key={image.id} className="overflow-hidden rounded-lg border bg-white">
                    {src ? (
                      <div className="relative h-56 w-full">
                        <Image
                          src={src}
                          alt={image.alt_text || product.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-56 w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                        No preview available
                      </div>
                    )}
                    <div className="space-y-1 p-3 text-sm">
                      <p className="font-medium text-gray-900">{image.alt_text || 'Untitled image'}</p>
                      <p className="text-gray-500">Position {image.position}</p>
                      {image.caption ? <p className="text-gray-600">{image.caption}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No images uploaded for this product.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
