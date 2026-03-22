'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAddProductToCollection, useCollection, useCollectionProducts, useProducts, useRemoveProductFromCollection } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';

export default function CollectionProductsPage() {
  const params = useParams();
  const collectionId = Array.isArray(params?.id) ? params.id[0] : (params?.id || '');
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const { data: collection, isLoading: isLoadingCollection } = useCollection(storeId, collectionId);
  const { data: collectionProducts, isLoading: isLoadingProducts } = useCollectionProducts(storeId, collectionId, 1, 200);
  const { data: allProductsResponse } = useProducts(storeId, { page: 1, limit: 200 });
  const addProductMutation = useAddProductToCollection();
  const removeProductMutation = useRemoveProductFromCollection();

  const query = search.trim().toLowerCase();
  const assignedProducts = useMemo(() => collectionProducts?.products ?? [], [collectionProducts?.products]);
  const availableProducts = useMemo(() => {
    const assignedIds = new Set(assignedProducts.map((product) => product.id));
    return (allProductsResponse?.data ?? []).filter((product) => !assignedIds.has(product.id));
  }, [allProductsResponse?.data, assignedProducts]);

  const filteredAssignedProducts = useMemo(() => {
    if (!query) return assignedProducts;
    return assignedProducts.filter((product) => `${product.title} ${product.slug} ${product.brand ?? ''}`.toLowerCase().includes(query));
  }, [assignedProducts, query]);

  const filteredAvailableProducts = useMemo(() => {
    if (!query) return availableProducts;
    return availableProducts.filter((product) => `${product.title} ${product.slug} ${product.brand ?? ''}`.toLowerCase().includes(query));
  }, [availableProducts, query]);

  const handleAdd = async (productId: string) => {
    try {
      setError('');
      await addProductMutation.mutateAsync({ storeId, collectionId, productId });
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to add product to collection'));
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      setError('');
      await removeProductMutation.mutateAsync({ storeId, collectionId, productId });
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to remove product from collection'));
    }
  };

  if (isLoadingCollection) {
    return <div className="p-6 text-gray-600">Loading collection...</div>;
  }

  if (!collection) {
    return <div className="p-6 text-red-600">Collection not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
          <p className="text-gray-600">
            {collection.type === 'automatic'
              ? 'Automatic collection. Products are included when they match the rule.'
              : 'Manual collection. Add or remove products from this collection.'}
          </p>
          {collection.rule && <p className="mt-1 text-sm text-gray-500">Rule: {collection.rule}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/collections/${collectionId}`}>Collection settings</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/collections">Back to collections</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search products</CardTitle>
          <CardDescription>Filter the assigned and available lists by title, slug, or brand.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products in collection</CardTitle>
          <CardDescription>
            {collectionProducts ? `${collectionProducts.total} product(s) currently in this collection.` : 'Loading collection products...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium text-gray-900">{product.title}</TableCell>
                    <TableCell className="text-sm text-gray-600">{product.slug}</TableCell>
                    <TableCell className="text-sm text-gray-600">{product.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/products/${product.id}`}>View product</Link>
                        </Button>
                        {collection.type === 'manual' && (
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleRemove(product.id)} disabled={removeProductMutation.isPending}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAssignedProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                      {isLoadingProducts ? 'Loading collection products...' : 'No products in this collection yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {collection.type === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle>Add products</CardTitle>
            <CardDescription>Choose products not already in this collection.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvailableProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-gray-900">{product.title}</TableCell>
                      <TableCell className="text-sm text-gray-600">{product.slug}</TableCell>
                      <TableCell className="text-sm text-gray-600">{product.status}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleAdd(product.id)} disabled={addProductMutation.isPending}>
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAvailableProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                        No more products available to add.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}