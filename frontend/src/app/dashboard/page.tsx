'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProducts, useCategories, useCollections, useTags } from '@/lib/hooks/use-api';
import { Package, FolderOpen, Tag as TagIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';

export default function DashboardPage() {
  const { currentStore, stores, isLoading } = useAuth();
  const storeId = currentStore?.id ?? '';

  const { data: products } = useProducts(storeId);
  const { data: categories } = useCategories(storeId);
  const { data: collections } = useCollections(storeId);
  const { data: tags } = useTags(storeId);

  const stats = [
    {
      name: 'Total Products',
      value: products?.data?.length || 0,
      icon: Package,
      href: '/dashboard/products',
      color: 'text-blue-600',
    },
    {
      name: 'Categories',
      value: categories?.length || 0,
      icon: FolderOpen,
      href: '/dashboard/categories',
      color: 'text-green-600',
    },
    {
      name: 'Collections',
      value: collections?.length || 0,
      icon: FolderOpen,
      href: '/dashboard/collections',
      color: 'text-purple-600',
    },
    {
      name: 'Tags',
      value: tags?.length || 0,
      icon: TagIcon,
      href: '/dashboard/tags',
      color: 'text-orange-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-600">Loading your dashboard...</div>
      </div>
    );
  }

  if (!currentStore) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">No store selected</h2>
        <p className="text-gray-600 text-center max-w-md">
          You need to create or select a store to view dashboard data.
        </p>
        <Button asChild>
          <Link href="/dashboard/stores">
            Manage Stores
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <Button variant="link" className="p-0 h-auto text-sm" asChild>
                <Link href={stat.href}>
                  View all →
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Products */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>
              Your latest product additions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {products?.data && products.data.length > 0 ? (
              <div className="space-y-4">
                {products.data.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {product.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          ${product.price}
                        </p>
                      </div>
                    </div>
                    <Badge variant={product.status === 'published' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first product.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/dashboard/products/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to manage your store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/dashboard/products/new">
                  <Package className="h-6 w-6 mb-2" />
                  Add Product
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/dashboard/categories/new">
                  <FolderOpen className="h-6 w-6 mb-2" />
                  Add Category
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/dashboard/collections/new">
                  <FolderOpen className="h-6 w-6 mb-2" />
                  Add Collection
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/dashboard/tags/new">
                  <TagIcon className="h-6 w-6 mb-2" />
                  Add Tag
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Info */}
      {stores && stores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Stores</CardTitle>
            <CardDescription>
              Manage your store settings and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stores.map((store) => (
                <div key={store.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{store.name}</h3>
                    <p className="text-sm text-gray-500">{store.currency} • {store.timezone}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/stores/${store.id}`}>
                      Manage
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}