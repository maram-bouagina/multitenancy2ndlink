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
  User,
  Users,
  BarChart3,
  ChevronDown,
  Globe,
  Check,
  Database,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';
import { type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { key: 'dashboard' as const, href: '/dashboard', icon: BarChart3 },
  { key: 'stores' as const, href: '/dashboard/stores', icon: Store },
  { key: 'products' as const, href: '/dashboard/products', icon: Package },
  { key: 'categories' as const, href: '/dashboard/categories', icon: FolderOpen },
  { key: 'collections' as const, href: '/dashboard/collections', icon: FolderOpen },
  { key: 'tags' as const, href: '/dashboard/tags', icon: Tag },
  { key: 'catalog' as const, href: '/dashboard/catalog', icon: Database },
  { key: 'customers' as const, href: '/dashboard/customers', icon: Users },
  { key: 'customerGroups' as const, href: '/dashboard/customer-groups', icon: Users },
  { key: 'settings' as const, href: '/dashboard/settings', icon: Settings },
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
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname?.startsWith(item.href) ?? false;
        return (
          <Link
            key={item.href}
            href={item.href}
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
    </>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, currentStore, stores, logout, setCurrentStore, isAuthenticated, isLoading } = useAuth();
  const { t, lang, setLang, dir } = useLanguage();

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && isAuthenticated && !currentStore) {
      router.push('/dashboard/stores');
    }
  }, [isAuthenticated, isLoading, currentStore, router]);

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
              <div className="flex w-full md:ml-0">
                <label htmlFor="search-field" className="sr-only">
                  Search
                </label>
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                    {/* Search icon would go here */}
                  </div>
                </div>
              </div>
            </div>
            <div className="ms-4 flex items-center md:ms-6">
              {/* Store Selector */}
              {currentStore && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="me-4 flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span className="hidden sm:inline">{currentStore.name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t.header.yourStores}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {stores.map((store) => (
                      <DropdownMenuItem
                        key={store.id}
                        onClick={() => setCurrentStore(store)}
                        className={store.id === currentStore.id ? 'bg-gray-100' : ''}
                      >
                        <Store className="me-2 h-4 w-4" />
                        {store.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

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
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{t.header.yourStores}</DropdownMenuLabel>
                  {stores.map((store) => (
                    <DropdownMenuItem
                      key={store.id}
                      onClick={() => setCurrentStore(store)}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Store className="h-3.5 w-3.5" />
                        <span className="text-sm">{store.name}</span>
                      </span>
                      {currentStore?.id === store.id && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </DropdownMenuItem>
                  ))}
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
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}