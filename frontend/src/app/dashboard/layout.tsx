'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Menu,
  Store,
  Package,
  Tag,
  FolderOpen,
  Settings,
  LogOut,
  Users,
  Users2,
  BarChart3,
  ChevronDown,
  Globe,
  Check,
  Database,
  Shield,
  User,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { StaffPlatformWidget } from '@/components/dashboard/StaffPlatformWidget';
import { QuickStoreSwitcher } from '@/components/dashboard/QuickStoreSwitcher';
import { useLanguage } from '@/lib/hooks/use-language';
import { type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const NAV_SECTIONS = [
  {
    key: 'home',
    items: [
      { key: 'dashboard' as const, href: '/dashboard', icon: BarChart3, permissions: [] as string[] },
      { key: 'stores' as const, href: '/dashboard/stores', icon: Store, permissions: [] as string[] },
      { key: 'space' as const, href: '/dashboard/space', icon: LayoutGrid, permissions: [] as string[] },
    ],
  },
  {
    key: 'catalog',
    items: [
      { key: 'products' as const, href: '/dashboard/products', icon: Package,
        permissions: ['products:create', 'products:edit', 'products:delete', 'products:publish', 'products:import_export'] },
      { key: 'categories' as const, href: '/dashboard/categories', icon: FolderOpen,
        permissions: ['categories:manage'] },
      { key: 'collections' as const, href: '/dashboard/collections', icon: FolderOpen,
        permissions: ['collections:manage'] },
      { key: 'tags' as const, href: '/dashboard/tags', icon: Tag,
        permissions: ['tags:manage'] },
      { key: 'catalog' as const, href: '/dashboard/catalog', icon: Database,
        permissions: ['store:customization', 'store:pages'] },
      { key: 'customers' as const, href: '/dashboard/customers', icon: Users,
        permissions: ['customers:view', 'customers:edit', 'customers:delete', 'customers:import_export'] },
      { key: 'customerGroups' as const, href: '/dashboard/customer-groups', icon: Users,
        permissions: ['customers:view', 'customers:edit', 'customers:delete', 'customers:import_export'] },
    ],
  },
  {
    key: 'people',
    items: [
      { key: 'team' as const, href: '/dashboard/team', icon: Users2,
        permissions: ['team:manage'] },
      { key: 'roles' as const, href: '/dashboard/roles', icon: Shield,
        permissions: ['team:manage'] },
    ],
  },
  {
    key: 'platform',
    items: [
      { key: 'settings' as const, href: '/dashboard/settings', icon: Settings,
        permissions: [] as string[] },
    ],
  },
];

const PRODUCT_PERMISSIONS = ['products:create', 'products:edit', 'products:delete', 'products:publish', 'products:import_export'];
const CUSTOMER_PERMISSIONS = ['customers:view', 'customers:edit', 'customers:delete', 'customers:import_export'];
const STORE_BUILDER_PERMISSIONS = ['store:customization', 'store:pages'];

const ROUTE_PERMISSION_RULES = [
  { matches: (pathname: string) => pathname === '/dashboard/stores', ownerContextOnly: true },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/products'), permissions: PRODUCT_PERMISSIONS },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/categories'), permissions: ['categories:manage'] },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/collections'), permissions: ['collections:manage'] },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/tags'), permissions: ['tags:manage'] },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/catalog'), permissions: STORE_BUILDER_PERMISSIONS },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/customers'), permissions: CUSTOMER_PERMISSIONS },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/customer-groups'), permissions: CUSTOMER_PERMISSIONS },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/team'), permissions: ['team:manage'] },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/roles'), permissions: ['team:manage'] },
  { matches: (pathname: string) => pathname === '/dashboard/stores/new', ownerContextOnly: true },
  { matches: (pathname: string) => /^\/dashboard\/stores\/(?!new$)[^/]+$/.test(pathname), permissions: ['store:settings_edit'], sameStoreContext: true },
  { matches: (pathname: string) => /^\/dashboard\/stores\/[^/]+\/(editor|customize|storefront|pages)/.test(pathname), permissions: STORE_BUILDER_PERMISSIONS, sameStoreContext: true },
  { matches: (pathname: string) => pathname.startsWith('/dashboard/settings/plan'), merchantOnly: true },
];

const LANG_OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItemsProps {
  pathname: string | null;
}

function NavItems({ pathname }: NavItemsProps) {
  const { t } = useLanguage();
  const { currentStore, selectedStaffStoreId, currentMemberPermissions, canUseTenantWorkspace, hasOwnedStoreAccess, myStores } = useAuth();
  const canManageOwnedStores = canUseTenantWorkspace && !selectedStaffStoreId;

  // A store must be explicitly selected (via Access button) before store-specific
  // pages are accessible. Without one, only the picker + settings are shown.
  const hasActiveStore = !!(currentStore || selectedStaffStoreId);

  return (
    <>
      {NAV_SECTIONS.map((section) => {
        const visibleItems = section.items.filter((item) => {
          // Always show the space picker ("stores" key), my spaces, and settings
          const alwaysVisible = item.key === 'stores' || item.key === 'settings' || item.key === 'space';
          if (!hasActiveStore && !alwaysVisible) return false;

          // Permission filter (only applies when in staff mode)
          if (currentMemberPermissions !== null && item.permissions.length > 0) {
            return item.permissions.some((p) => currentMemberPermissions.includes(p));
          }
          return true;
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={section.key} className="space-y-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {t.navSections[section.key as keyof typeof t.navSections]}
            </p>
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const href = item.key === 'stores'
                  ? (canManageOwnedStores ? '/dashboard/stores' : '/dashboard/space')
                  : item.href;
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : item.key === 'stores'
                      ? (canManageOwnedStores
                          ? pathname?.startsWith('/dashboard/stores') ?? false
                          : pathname === '/dashboard/space')
                      : pathname?.startsWith(item.href) ?? false;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {t.nav[item.key]}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, currentStore, myStores, logout, isAuthenticated, isLoading, selectedStaffStoreId, currentMemberPermissions, canUseTenantWorkspace, hasOwnedStoreAccess } = useAuth();
  const { t, lang, setLang, dir } = useLanguage();
  const canManageOwnedStores = canUseTenantWorkspace && !selectedStaffStoreId;
  const activeStoreRouteId = pathname?.match(/^\/dashboard\/stores\/([^/]+)/)?.[1] ?? null;
  const activeRouteRule = pathname ? ROUTE_PERMISSION_RULES.find((rule) => rule.matches(pathname)) : undefined;
  const canAccessActiveRoute = (() => {
    if (!activeRouteRule) return true;
    if (activeRouteRule.merchantOnly) {
      return canManageOwnedStores;
    }
    if (activeRouteRule.ownerContextOnly) {
      return canManageOwnedStores;
    }
    if (activeRouteRule.sameStoreContext && selectedStaffStoreId && activeStoreRouteId && activeStoreRouteId !== selectedStaffStoreId) {
      return false;
    }
    if (!activeRouteRule.permissions || activeRouteRule.permissions.length === 0) return true;
    if (currentMemberPermissions === null) return true;
    return activeRouteRule.permissions.some((permission) => currentMemberPermissions.includes(permission));
  })();

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  useEffect(() => {
    // The invite page handles its own auth flow (register / sign-in) — never
    // redirect it to the login page.
    const isInvitePage = pathname?.startsWith('/dashboard/invite/');
    const canOpenWithoutActiveStore =
      pathname === '/dashboard/space'
      || pathname?.startsWith('/dashboard/invite/')
      || pathname?.startsWith('/dashboard/settings')
      || (canManageOwnedStores && pathname?.startsWith('/dashboard/stores'));

    if (!isLoading && !isAuthenticated && !isInvitePage) {
      router.push('/auth/login');
    } else if (!isLoading && isAuthenticated && !canAccessActiveRoute) {
      router.replace('/dashboard/settings');
    } else if (!isLoading && isAuthenticated && !currentStore && !selectedStaffStoreId && !canOpenWithoutActiveStore) {
      // No active store context — always send everyone to Staff Space
      if (pathname !== '/dashboard/space') router.push('/dashboard/space');
    }
  }, [canAccessActiveRoute, canManageOwnedStores, isAuthenticated, isLoading, currentStore, selectedStaffStoreId, myStores.length, pathname, router]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // The Puck visual editor runs fullscreen — skip the dashboard shell
  const isEditorRoute = pathname?.includes('/editor');
  if (isEditorRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="fixed top-4 inset-s-4 z-40 md:hidden"
            size="icon"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="w-64 p-0">
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center border-b px-4">
              <h2 className="text-lg font-semibold">Dashboard</h2>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              <NavItems pathname={pathname} />
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:inset-s-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col grow border-r bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900">{t.header.ecommerce}</h1>
          </div>
          <div className="mt-8 grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              <NavItems pathname={pathname} />
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ps-64">
        {/* Top header */}
        <div className="sticky top-0 z-10 flex h-16 shrink-0 border-b bg-white shadow">
          <div className="flex flex-1 justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex flex-1">
              <div className="flex w-full items-center justify-between md:ml-0">
                <label htmlFor="search-field" className="sr-only">
                  Search
                </label>
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                    {/* Search icon would go here */}
                  </div>
                </div>
                {currentStore && (
                  <QuickStoreSwitcher />
                )}
              </div>
            </div>
            <div className="ms-4 flex items-center md:ms-6">
              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="me-2 flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs font-semibold uppercase">{lang}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>{t.header.language}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {LANG_OPTIONS.map((l) => (
                    <DropdownMenuItem
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className="flex items-center gap-2"
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                      {lang === l.code && <Check className="ms-auto h-4 w-4 text-blue-600" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(user as { image?: string })?.image ?? ''} alt={user?.email ?? ''} />
                      <AvatarFallback className="text-xs font-semibold">
                        {`${(user?.firstName || '')[0] ?? ''}${(user?.lastName || '')[0] ?? ''}`.toUpperCase() || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{t.header.myAccount}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings/profile">
                      <User className="me-2 h-4 w-4" />
                      <span>{t.header.profile}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings className="me-2 h-4 w-4" />
                      <span>{t.header.settings}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="me-2 h-4 w-4" />
                    <span>{t.header.logout}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {selectedStaffStoreId && (
                <div className="mb-4">
                  <StaffPlatformWidget />
                </div>
              )}
              {!isLoading && isAuthenticated && !canAccessActiveRoute ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                  <h2 className="text-lg font-semibold">Access limited by your role</h2>
                  <p className="mt-2 text-sm text-amber-800">
                    This page needs permissions your current role does not have. Open Settings to switch context or use areas that match your role.
                  </p>
                  <div className="mt-4">
                    <Button asChild>
                      <Link href="/dashboard/settings">Open Settings</Link>
                    </Button>
                  </div>
                </div>
              ) : children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}