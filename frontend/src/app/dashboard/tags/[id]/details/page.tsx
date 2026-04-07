'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/use-auth';
import { useTag } from '@/lib/hooks/use-api';

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

export default function TagDetailsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const { currentStore } = useAuth();
  const storeId = currentStore?.id ?? '';

  const { data: tag, isLoading, isError } = useTag(storeId, id);

  if (isLoading) {
    return <div className="p-6">Loading tag details...</div>;
  }

  if (isError || !tag) {
    return <div className="p-6 text-red-600">Tag not found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tag.name}</h1>
          <p className="text-gray-600">Tag identity and publishing metadata.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/tags">Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/tags/${tag.id}`}>Edit tag</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-2xl border"
                style={{ backgroundColor: tag.color || '#f3f4f6', borderColor: 'rgba(0,0,0,0.08)' }}
              />
              <div>
                <CardTitle>{tag.name}</CardTitle>
                <CardDescription>Reusable labeling for search, merchandising, and filtering.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Slug</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">/{tag.slug}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Color</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: tag.color || '#e5e7eb' }} />
                <span className="text-sm font-semibold text-gray-900">{tag.color || '-'}</span>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">State</p>
              <div className="mt-2">
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timestamps</CardTitle>
            <CardDescription>Traceability for this tag record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-gray-500">Created</span><span>{formatDateTime(tag.created_at)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Updated</span><span>{formatDateTime(tag.updated_at)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}