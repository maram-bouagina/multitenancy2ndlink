'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTags, useDeleteTag } from '@/lib/hooks/use-api';
import { useAuth } from '@/lib/hooks/use-auth';
import { Edit, Trash2 } from 'lucide-react';

export default function TagsPage() {
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';
  const { data: tags, isLoading } = useTags(storeId);
  const deleteTagMutation = useDeleteTag();

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    try {
      await deleteTagMutation.mutateAsync({ storeId, tagId: id });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          <p className="text-gray-600">Manage product tags for filtering and organization.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tags/new">Create Tag</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tags</CardTitle>
          <CardDescription>
            Tags can be used to filter products in the storefront.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags?.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="text-sm font-medium text-gray-900">{tag.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{tag.slug}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/tags/${tag.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(tag.id)}
                          disabled={deleteTagMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!tags || tags.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {isLoading ? 'Loading tags...' : 'No tags found.'}
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
