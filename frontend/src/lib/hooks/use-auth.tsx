'use client';

import { createContext, useCallback, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Store, StoreWithRole } from '@/lib/types';
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

/** Build a minimal synthetic Store object from a StoreWithRole membership entry. */
export function storeWithRoleToStore(s: StoreWithRole): Store {
  return {
    id: s.id,
    tenant_id: '',
    name: s.name,
    slug: s.slug,
    logo: s.logo ?? undefined,
    currency: s.currency,
    timezone: 'UTC',
    language: 'en',
    theme_primary_color: s.theme_primary_color,
    theme_secondary_color: '',
    theme_mode: 'light',
    theme_font_family: '',
    storefront_layout_draft: '',
    storefront_layout_published: '',
    theme_version: 0,
    status: 'active',
  };
}

interface AuthContextType {
  user: AuthUser | null;
  currentStore: Store | null;
  stores: Store[];
  // Staff-specific: stores the user was invited to (as staff)
  myStores: StoreWithRole[];
  // The store the staff member is currently working in (null = in Staff Space)
  selectedStaffStoreId: string | null;
  setSelectedStaffStore: (storeId: string | null) => void;
  // Effective permissions for the current staff store (null = owner/not in staff mode = no filter)
  currentMemberPermissions: string[] | null;
  // Store favourites (IDs, max 5) and recently accessed (IDs, last 5)
  favoriteStores: string[];
  recentStores: string[];
  toggleFavoriteStore: (id: string) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  resolvedRole: string | null;
  canUseTenantWorkspace: boolean;
  hasOwnedStoreAccess: boolean;
  logout: () => void;
  setCurrentStore: (store: Store | null) => void;
  refreshStores: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORE_KEY = 'currentStoreId';
const STAFF_STORE_KEY = 'selectedStaffStoreId';
const FAVORITES_KEY = 'favoriteStores';
const RECENT_STORES_KEY = 'recentStores';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [currentStore, _setCurrentStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [myStores, setMyStores] = useState<StoreWithRole[]>([]);
  const [resolvedRole, setResolvedRole] = useState<string | null>(null);
  const [hasTenantWorkspace, setHasTenantWorkspace] = useState(false);
  const [hasOwnedStoreAccess, setHasOwnedStoreAccess] = useState(false);
  const [selectedStaffStoreId, _setSelectedStaffStoreId] = useState<string | null>(null);
  const [favoriteStores, setFavoriteStores] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
  });
  const [recentStores, setRecentStores] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(RECENT_STORES_KEY) || '[]'); } catch { return []; }
  });

  const sessionToken = (session as { session?: { token?: string } } | null)?.session?.token ?? null;
  const user = session?.user as AuthUser | null ?? null;
  const isAuthenticated = !!user;
  const canUseTenantWorkspace = !!user && (resolvedRole === 'admin' || hasTenantWorkspace || hasOwnedStoreAccess);
  const isStaff = !!user && !canUseTenantWorkspace;

  // Track the current user ID so we can detect actual user changes
  // (login/logout/switch) vs brief session flickers.
  const lastUserIdRef = useRef<string | null>(null);

  const pushToRecent = useCallback((storeId: string) => {
    setRecentStores((prev) => {
      const next = [storeId, ...prev.filter((id) => id !== storeId)].slice(0, 5);
      try { localStorage.setItem(RECENT_STORES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const toggleFavoriteStore = useCallback((storeId: string) => {
    setFavoriteStores((prev) => {
      const next = prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : prev.length < 5 ? [...prev, storeId] : prev;
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const setSelectedStaffStore = useCallback((storeId: string | null) => {
    _setSelectedStaffStoreId(storeId);
    apiClient.setStoreId(storeId);
    if (storeId) {
      localStorage.setItem(STAFF_STORE_KEY, storeId);
      pushToRecent(storeId);
      // Synthesize currentStore so ALL dashboard pages work for staff
      const staffStore = myStores.find((s) => s.id === storeId);
      if (staffStore) _setCurrentStore(storeWithRoleToStore(staffStore));
    } else {
      localStorage.removeItem(STAFF_STORE_KEY);
      apiClient.setStoreId(null);
      // Restore merchant's owned store if available (so the nav stays open
      // when a merchant returns to My Spaces after visiting a staff store).
      // For pure staff users, stores is empty and currentStore becomes null.
      const savedId = localStorage.getItem(STORE_KEY);
      const ownedStore = (savedId ? stores.find((s) => s.id === savedId) : null) ?? stores[0] ?? null;
      _setCurrentStore(ownedStore);
    }
  }, [myStores, stores, pushToRecent]);

  // Wrap setCurrentStore to also persist to localStorage
  const setCurrentStore = useCallback((store: Store | null) => {
    _setSelectedStaffStoreId(null);
    localStorage.removeItem(STAFF_STORE_KEY);
    if (store) {
      localStorage.setItem(STORE_KEY, store.id);
      apiClient.setStoreId(store.id);
      pushToRecent(store.id);
    } else {
      localStorage.removeItem(STORE_KEY);
      apiClient.setStoreId(null);
    }
    _setCurrentStore(store);
  }, [pushToRecent]);

  // Sync the token to the API client immediately so it's always set before any API call
  apiClient.setAuthToken(sessionToken);

  const loadStores = useCallback(async () => {
    try {
      const accountContext = await apiClient.getAccountContext();
      setResolvedRole(accountContext.role);
      setHasTenantWorkspace(accountContext.has_tenant_workspace);
      setHasOwnedStoreAccess(accountContext.has_owned_store_access);

      // Always load staff stores — any role could have staff memberships
      const { stores: staffStores } = await apiClient.getMyStores();
      setMyStores(staffStores);

      // Restore previously selected staff store
      const savedStaffId = localStorage.getItem(STAFF_STORE_KEY);
      if (savedStaffId && staffStores.some((s) => s.id === savedStaffId)) {
        _setSelectedStaffStoreId(savedStaffId);
        apiClient.setStoreId(savedStaffId);
        const staffStore = staffStores.find((s) => s.id === savedStaffId);
        if (staffStore) {
          _setCurrentStore(storeWithRoleToStore(staffStore));
          return; // Staff store is the active context — skip merchant stores
        }
      }

      const isMerchantOrAdmin = accountContext.role === 'admin' || accountContext.has_tenant_workspace || accountContext.has_owned_store_access;

      if (!isMerchantOrAdmin) {
        // Staff/customer — they don't own stores, skip getStores()
        // which would hit TenantDB with no X-Store-Id and hang.
      } else {
        // Merchant/admin: load owned stores.
        // Clear any staff store header before querying — /api/stores uses the
        // owner path (no X-Store-Id) and will 400 if a stale header is present.
        apiClient.setStoreId(null);
        let userStores: Store[] = [];
        try {
          userStores = await apiClient.getStores();
        } catch (storeErr: unknown) {
          // A brand-new merchant has no tenant schema yet → backend returns
          // 400 STORE_ID_REQUIRED. Treat that as zero owned stores instead of
          // an unhandled error so they land on the Space page to create one.
          const code = (storeErr as { response?: { data?: { code?: string }; status?: number } })?.response?.data?.code;
          const status = (storeErr as { response?: { status?: number } })?.response?.status;
          if (status !== 400 || code !== 'STORE_ID_REQUIRED') throw storeErr;
        }
        setStores(userStores);
        if (userStores.length === 0) {
          _setCurrentStore(null);
          return;
        }
        const savedId = localStorage.getItem(STORE_KEY);
        const saved = savedId ? userStores.find((s) => s.id === savedId) : null;
        _setCurrentStore((prev) => {
          let next: Store;
          if (prev) {
            const matchingStore = userStores.find((s) => s.id === prev.id);
            next = matchingStore ?? saved ?? userStores[0];
          } else {
            next = saved ?? userStores[0];
          }
          apiClient.setStoreId(next.id);
          return next;
        });
      }
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response?.status === 401) return;
      console.error('Failed to load stores:', error);
    } finally {
      setStoresLoaded(true);
    }
  }, []);

  const userId = user?.id ?? null;

  // Effective permissions for the currently selected staff store.
  // null  = user is in owner mode (no filtering needed).
  // []    = staff mode but no permissions assigned.
  const selectedStaffStore = selectedStaffStoreId
    ? myStores.find((s) => s.id === selectedStaffStoreId) ?? null
    : null;
  const currentMemberPermissions: string[] | null =
    selectedStaffStore ? (selectedStaffStore.permissions ?? []) : null;

  // Extra guard: if we had a session and briefly lost it (Better Auth token
  // refresh flicker), keep isLoading=true until the session stabilises.
  // storesLoaded goes false on explicit logout(), which breaks this guard.
  const hadUserRef = lastUserIdRef;
  const isFlickering = !isAuthenticated && hadUserRef.current !== null && storesLoaded;
  const isLoading = isPending || (isAuthenticated && !storesLoaded) || isFlickering;

  useEffect(() => {
    // Detect real user change (login, logout, account switch)
    if (userId !== lastUserIdRef.current) {
      if (lastUserIdRef.current !== null && userId === null) {
        // User logged out or session definitively expired → clear everything
        setStores([]);
        setMyStores([]);
        setResolvedRole(null);
        setHasTenantWorkspace(false);
        setHasOwnedStoreAccess(false);
        _setCurrentStore(null);
        _setSelectedStaffStoreId(null);
        apiClient.setStoreId(null);
        localStorage.removeItem(STORE_KEY);
        localStorage.removeItem(STAFF_STORE_KEY);
        setStoresLoaded(false);
      } else if (userId !== null) {
        // New user or first login → reload stores
        setStoresLoaded(false);
      }
      lastUserIdRef.current = userId;
    }

    if (isAuthenticated && sessionToken && !storesLoaded) {
      void loadStores();
    }
  }, [isAuthenticated, storesLoaded, sessionToken, loadStores, userId]);

  // Only clear state on definitive logout (handled in the logout callback).
  // We no longer clear on session flickers (Better Auth may briefly report
  // !isAuthenticated during a token refresh, which would wipe stores and cause
  // redirect cascades / freezes).

  const logout = useCallback(() => {
    // Clear all state on explicit logout
    setStores([]);
    setMyStores([]);
    setResolvedRole(null);
    setHasTenantWorkspace(false);
    setHasOwnedStoreAccess(false);
    _setCurrentStore(null);
    _setSelectedStaffStoreId(null);
    setFavoriteStores([]);
    setRecentStores([]);
    apiClient.setStoreId(null);
    apiClient.setAuthToken(null);
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(STAFF_STORE_KEY);
    localStorage.removeItem(FAVORITES_KEY);
    localStorage.removeItem(RECENT_STORES_KEY);
    setStoresLoaded(false);
    void authClient.signOut();
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
    myStores,
    selectedStaffStoreId,
    setSelectedStaffStore,
    currentMemberPermissions,
    favoriteStores,
    recentStores,
    toggleFavoriteStore,
    isLoading,
    isAuthenticated,
    isStaff,
    resolvedRole,
    canUseTenantWorkspace,
    hasOwnedStoreAccess,
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
