'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/use-auth';
import { useCategories, useProduct } from '@/lib/hooks/use-api';

export default function ProductDetailsPage() {
  const params = useParams();
  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { currentStore } = useAuth();
  const storeId = currentStore?.id || '';

  const { data: product, isLoading, isError } = useProduct(storeId, productId);
  const { data: categories } = useCategories(storeId);

  if (isLoading) {
    return <div className="p-6">Loading product details...</div>;
  }

  if (isError || !product) {
    return <div className="p-6 text-red-600">Product not found</div>;
  }

  const categoryName = categories?.find((c) => c.id === product.category_id)?.name || 'Uncategorized';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
          <p className="text-gray-600">Product details and description</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/products">Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/products/${product.id}`}>Edit Product</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>Full product description</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
              {product.description || 'No description provided.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Key product information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-gray-500">Slug</span><span>{product.slug}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Status</span><Badge variant={product.status === 'published' ? 'default' : 'secondary'}>{product.status}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Visibility</span><Badge variant="outline">{product.visibility}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Price</span><span>{product.price} {product.currency}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Sale Price</span><span>{product.sale_price ?? '-'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">SKU</span><span>{product.sku || '-'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Category</span><span>{categoryName}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Stock</span><span>{product.stock}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Track Stock</span><span>{product.track_stock ? 'Yes' : 'No'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Brand</span><span>{product.brand || '-'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Tax Class</span><span>{product.tax_class || '-'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Weight</span><span>{product.weight ?? '-'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Dimensions</span><span>{product.dimensions || '-'}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
