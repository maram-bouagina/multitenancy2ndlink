'use client';

import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, Store, LoginResponse } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

interface AuthContextType {
  user: Tenant | null;
  currentStore: Store | null;
  stores: Store[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (response: LoginResponse) => void;
  logout: () => void;
  setCurrentStore: (store: Store) => void;
  refreshStores: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Tenant | null>(null);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const logout = useCallback(() => {
    void apiClient.logout().catch(() => undefined);
    setUser(null);
    setCurrentStore(null);
    setStores([]);

    setIsLoading(false);
  }, []);

  const loadStores = useCallback(async () => {
    try {
      const userStores = await apiClient.getStores();

      setStores(userStores);

      setCurrentStore((previousStore) => {
        if (previousStore || userStores.length === 0) {
          return previousStore;
        }
        return userStores[0];
      });
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
        setIsLoading(false);
        return;
      }

      try {
        const tenant = await apiClient.me();
        setUser(tenant);
        await loadStores();
      } catch {
        setUser(null);
        setStores([]);
        setCurrentStore(null);
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, [loadStores]);

  const login = (response: LoginResponse) => {
    setUser(response.tenant);

    void loadStores();
  };

  const refreshStores = async () => {
    if (user) {
      await loadStores();
    }
  };

  const value: AuthContextType = {
    user,
    currentStore,
    stores,
    isLoading,
    isAuthenticated,
    login,
    logout,
    setCurrentStore,
    refreshStores,
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