'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useStores, useDeleteStore } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Store } from '@/lib/types';
import { Edit, Palette, Trash2 } from 'lucide-react';

export default function StoresPage() {
  const router = useRouter();
  const { data: stores, isLoading } = useStores();
  const { currentStore, setCurrentStore } = useAuth();
  const deleteStoreMutation = useDeleteStore();

  const handleSelectStore = (store: Store) => {
    setCurrentStore(store);
    router.push('/dashboard');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this store?')) return;
    try {
      await deleteStoreMutation.mutateAsync(id);
    } catch (error: unknown) {
      console.error(getApiErrorMessage(error, 'Failed to delete store'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-gray-600">Manage your stores and switch between them.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/stores/new">
            Create Store
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Stores</CardTitle>
          <CardDescription>
            Select a store to update its catalog and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores?.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <button
                        className="text-left text-sm font-medium text-blue-600 hover:underline"
                        onClick={() => handleSelectStore(store)}
                      >
                        {store.name}
                        {currentStore?.id === store.id && ' (active)'}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{store.slug}</TableCell>
                    <TableCell className="text-sm text-gray-600">{store.status || 'active'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/stores/${store.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/stores/${store.id}/customize`}>
                            <Palette className="mr-2 h-4 w-4" />
                            Customize
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(store.id)}
                          disabled={deleteStoreMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {stores?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {isLoading ? 'Loading stores...' : 'No stores found. Create one to get started.'}
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
