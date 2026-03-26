'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';
import { setCustomerSessionToken, clearCustomerSessionToken } from '@/lib/api/customer-client';

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  accepts_marketing?: boolean;
  role: string;
  storeId?: string | null;
  storeSlug?: string | null;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isApiReady: boolean;
  slug: string;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children, slug }: { children: ReactNode; slug: string }) {
  const { data: session, isPending } = authClient.useSession();
  const [ready, setReady] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const user = session?.user as (CustomerProfile & { accepts_marketing?: boolean }) | null ?? null;
  const sessionToken = (session as { session?: { token?: string } } | null)?.session?.token ?? null;

  // Only consider authenticated if user has customer role and matches this store
  const isCustomer = user?.role === 'customer' && (user?.storeSlug === slug || !user?.storeSlug);
  const isAuthenticated = !!user && isCustomer;

  // Sync Better Auth session token to the customer API client
  useEffect(() => {
    if (sessionToken && isAuthenticated) {
      setCustomerSessionToken(sessionToken);
      setApiReady(true);
    } else if (!isPending && !isAuthenticated) {
      clearCustomerSessionToken();
      setApiReady(true);
    } else {
      setApiReady(false);
    }
  }, [sessionToken, isAuthenticated, isPending]);

  useEffect(() => {
    if (!isPending) setReady(true);
  }, [isPending]);

  const customer: CustomerProfile | null = isAuthenticated && user ? {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    accepts_marketing: user.accepts_marketing,
    role: user.role,
    storeId: user.storeId,
    storeSlug: user.storeSlug,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  } : null;

  const logout = useCallback(async () => {
    await authClient.signOut();
    clearCustomerSessionToken();
  }, []);

  const refresh = useCallback(async () => {
    // Better Auth auto-refreshes via useSession
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isLoading: !ready,
        isAuthenticated,
        isApiReady: apiReady,
        slug,
        logout,
        refresh,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
