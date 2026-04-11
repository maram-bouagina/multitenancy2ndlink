'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProducts, useCategories, useCollections, useTags } from '@/lib/hooks/use-api';
import { Package, FolderOpen, Tag as TagIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';

export default function DashboardPage() {
  const { currentStore, stores, myStores, isLoading } = useAuth();
  const { t } = useLanguage();
  const storeId = currentStore?.id ?? '';

  const { data: products } = useProducts(storeId);
  const { data: categories } = useCategories(storeId);
  const { data: collections } = useCollections(storeId);
  const { data: tags } = useTags(storeId);

  const stats = [
    {
      name: t.dashboard.totalProducts,
      value: products?.data?.length || 0,
      icon: Package,
      href: '/dashboard/products',
      color: 'text-blue-600',
    },
    {
      name: t.dashboard.categories,
      value: categories?.length || 0,
      icon: FolderOpen,
      href: '/dashboard/categories',
      color: 'text-green-600',
    },
    {
      name: t.dashboard.collections,
      value: collections?.length || 0,
      icon: FolderOpen,
      href: '/dashboard/collections',
      color: 'text-purple-600',
    },
    {
      name: t.dashboard.tags,
      value: tags?.length || 0,
      icon: TagIcon,
      href: '/dashboard/tags',
      color: 'text-orange-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-600">{t.dashboard.loading}</div>
      </div>
    );
  }

  if (!currentStore) {
    // The layout's useEffect will handle the redirect to /dashboard/space.
    // Render nothing while that redirect fires to avoid a flash of no-store UI.
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h1>
          <p className="text-gray-600">{t.dashboard.welcome}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="me-2 h-4 w-4" />
            {t.dashboard.addProduct}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <Button variant="link" className="h-auto p-0 text-sm" asChild>
                <Link href={stat.href}>{t.dashboard.viewAll}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentProducts}</CardTitle>
            <CardDescription>{t.dashboard.recentProductsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {products?.data && products.data.length > 0 ? (
              <div className="space-y-4">
                {products.data.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0">
                        <div className="h-8 w-8 rounded bg-gray-200"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.title}</p>
                        <p className="text-sm text-gray-500">${product.price}</p>
                      </div>
                    </div>
                    <Badge variant={product.status === 'published' ? 'default' : 'secondary'}>{product.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t.dashboard.noProducts}</h3>
                <p className="mt-1 text-sm text-gray-500">{t.dashboard.noProductsDesc}</p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/dashboard/products/new">
                      <Plus className="me-2 h-4 w-4" />
                      {t.dashboard.addProduct}
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.quickActions}</CardTitle>
            <CardDescription>{t.dashboard.quickActionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/dashboard/products/new">
                  <Package className="mb-2 h-6 w-6" />
                  {t.dashboard.addProduct}
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/dashboard/categories/new">
                  <FolderOpen className="mb-2 h-6 w-6" />
                  {t.dashboard.addCategory}
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/dashboard/collections/new">
                  <FolderOpen className="mb-2 h-6 w-6" />
                  {t.dashboard.addCollection}
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/dashboard/tags/new">
                  <TagIcon className="mb-2 h-6 w-6" />
                  {t.dashboard.addTag}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {stores && stores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.header.yourStores}</CardTitle>
            <CardDescription>{t.settings.securityDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stores.map((store) => (
                <div key={store.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">{store.name}</h3>
                    <p className="text-sm text-gray-500">{store.currency} • {store.timezone}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/stores/${store.id}`}>{t.dashboard.manageStores}</Link>
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