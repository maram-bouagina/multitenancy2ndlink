'use client';

import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { Store } from '@/lib/types';
import { apiClient } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';

// The user shape from Better Auth
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  plan: string;
  role: string;
  userStatus: string;
  createdAt: Date;
  updatedAt: Date;
  twoFactorEnabled?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  currentStore: Store | null;
  stores: Store[];
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  setCurrentStore: (store: Store | null) => void;
  refreshStores: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoaded, setStoresLoaded] = useState(false);

  const sessionToken = (session as { session?: { token?: string } } | null)?.session?.token ?? null;
  const user = session?.user as AuthUser | null ?? null;
  const isAuthenticated = !!user;
  const isLoading = isPending || (isAuthenticated && !storesLoaded);

  // Sync the token to the API client immediately (not in an effect) so it's
  // always set before any API call in the same render cycle.
  apiClient.setAuthToken(sessionToken);

  const loadStores = useCallback(async () => {
    try {
      const userStores = await apiClient.getStores();
      setStores(userStores);
      setCurrentStore((prev) => {
        if (userStores.length === 0) return null;
        if (prev) {
          const matchingStore = userStores.find((store) => store.id === prev.id);
          if (matchingStore) return matchingStore;
        }
        return userStores[0];
      });
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setStoresLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && sessionToken && !storesLoaded) {
      void loadStores();
    }
    if (!isAuthenticated && !isPending) {
      setStores([]);
      setCurrentStore(null);
      setStoresLoaded(false);
    }
  }, [isAuthenticated, isPending, storesLoaded, sessionToken, loadStores]);

  const logout = useCallback(() => {
    void authClient.signOut().then(() => {
      setStores([]);
      setCurrentStore(null);
      setStoresLoaded(false);
    });
  }, []);

  const refreshStores = async () => {
    if (isAuthenticated) {
      setStoresLoaded(false);
      await loadStores();
    }
  };

  const refreshSession = async () => {
    // Better Auth auto-refreshes sessions via useSession
  };

  const value: AuthContextType = {
    user,
    currentStore,
    stores,
    isLoading,
    isAuthenticated,
    logout,
    setCurrentStore,
    refreshStores,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}