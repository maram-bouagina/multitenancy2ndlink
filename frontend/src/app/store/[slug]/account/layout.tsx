'use client';

import { useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, MapPin, Shield, Eye, LogOut } from 'lucide-react';
import { CustomerAuthProvider, useCustomerAuth } from '@/lib/hooks/use-customer-auth';
import { useStorefrontLanguage } from '@/lib/hooks/use-storefront-language';

function AccountLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { customer, isLoading, isAuthenticated, isApiReady, logout } = useCustomerAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useStorefrontLanguage();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/store/${slug}/auth/login`);
    }
  }, [isLoading, isAuthenticated, router, slug]);

  if (isLoading || !isAuthenticated || !isApiReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-(--sf-primary) border-t-transparent rounded-full" />
      </div>
    );
  }

  const navLinks = [
    { href: `/store/${slug}/account`, icon: User, label: t.accountLayout.profile },
    { href: `/store/${slug}/account/addresses`, icon: MapPin, label: t.accountLayout.addresses },
    { href: `/store/${slug}/account/security`, icon: Shield, label: t.accountLayout.security },
    { href: `/store/${slug}/account/privacy`, icon: Eye, label: t.accountLayout.privacy },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{t.accountLayout.title}</h1>
          <p className="text-sm" style={{ color: 'var(--sf-text-muted)' }}>{t.accountLayout.welcome.replace('{name}', customer?.firstName ?? '')}</p>
        </div>
        <button
          onClick={async () => { await logout(); router.push(`/store/${slug}`); }}
          className="flex items-center gap-2 text-sm hover:text-red-600"
          style={{ color: 'var(--sf-text-muted)' }}
        >
          <LogOut className="h-4 w-4" /> {t.accountLayout.signOut}
        </button>
      </div>

      <div className="flex gap-8 flex-col md:flex-row">
        <nav className="w-full md:w-48 shrink-0 space-y-1">
          {navLinks.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href} href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive ? 'font-medium' : ''}`}
                style={isActive ? { backgroundColor: 'var(--sf-hover-bg)', color: 'var(--sf-text-primary)' } : { color: 'var(--sf-text-secondary)' }}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AccountLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  return (
    <CustomerAuthProvider slug={slug}>
      <AccountLayout>{children}</AccountLayout>
    </CustomerAuthProvider>
  );
}
