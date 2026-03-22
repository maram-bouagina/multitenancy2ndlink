'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollections, useDeleteCollection } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { Edit, PackageOpen, Trash2 } from 'lucide-react';

export default function CollectionsPage() {
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';
  const { data: collections, isLoading } = useCollections(storeId);
  const deleteCollectionMutation = useDeleteCollection();

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await deleteCollectionMutation.mutateAsync({ storeId, collectionId: id });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-600">Organize products into collections.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/collections/new">Create Collection</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Collections</CardTitle>
          <CardDescription>
            Collections help group products for promotions or themed catalogs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections?.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell className="text-sm font-medium text-gray-900">{collection.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{collection.slug}</TableCell>
                    <TableCell className="text-sm text-gray-600"><span className="capitalize">{collection.type}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/collections/${collection.id}/products`}>
                            <PackageOpen className="mr-2 h-4 w-4" />
                            Products
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/collections/${collection.id}`}>
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
                {(!collections || collections.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {isLoading ? 'Loading collections...' : 'No collections found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
