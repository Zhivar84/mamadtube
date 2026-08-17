/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppRoute, UserProfile, AuthState, Theme, UserRole, UserStatus } from '../types';

export const ADMIN_EMAILS = [
  'admin@mamadtube.com',
  'admin@example.com',
  'zhivarmohammadzadeh@gmail.com',
];

export const isDefaultAdminEmail = (email: string): boolean => {
  const envAdmin = ((import.meta as any).env?.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase();
  const lower = (email || '').toLowerCase().trim();
  return (
    ADMIN_EMAILS.includes(lower) ||
    lower.startsWith('admin@') ||
    (Boolean(envAdmin) && lower === envAdmin)
  );
};

const MASTER_ADMIN_SEED: any = {
  id: 'usr_master_admin',
  email: 'admin@mamadtube.com',
  password: 'admin123',
  displayName: 'System Admin',
  handle: '@admin',
  avatarUrl: '',
  bio: 'Platform Master Administrator with full privileges.',
  badge: 'verified' as const,
  role: 'admin' as UserRole,
  status: 'approved' as UserStatus,
  createdAt: '2026-01-01T00:00:00.000Z',
};

interface AppContextType {
  currentRoute: AppRoute;
  navigateTo: (route: AppRoute) => void;
  auth: AuthState;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, displayName: string, handle?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  updateProfile: (displayName: string, handle: string, avatarUrl: string, bio?: string, badge?: 'verified' | 'creator' | 'pro') => { success: boolean };
  theme: Theme;
  toggleTheme: () => void;
  // User Management & Admin Actions
  refreshUserStatus: () => Promise<UserStatus | null>;
  getAllRegisteredUsers: () => UserProfile[];
  fetchAdminUsers: () => Promise<UserProfile[]>;
  updateUserStatus: (userId: string, newStatus: UserStatus, userEmail?: string) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (userId: string, newRole: UserRole, userEmail?: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string, userEmail?: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Theme state - forced/default dark
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('portal_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  });

  // Auth state
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Routing state
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname as AppRoute;
      const validRoutes: AppRoute[] = [
        '/auth',
        '/dashboard',
        '/stream',
        '/archive',
        '/social',
        '/chat',
        '/admin',
        '/auth/pending',
        '/auth/pending-approval'
      ];
      if (validRoutes.includes(path)) return path;
    }
    return '/dashboard';
  });

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('portal_theme', theme);
  }, [theme]);

  // Initial authentication restore and sync path
  useEffect(() => {
    const initializeAuth = async () => {
      // Check for active session
      const activeSession = localStorage.getItem('portal_active_session');
      if (activeSession) {
        try {
          const user = JSON.parse(activeSession) as UserProfile;

          // Query fresh status and role from server
          let serverUser: UserProfile | null = null;
          try {
            const res = await fetch(`/api/auth/user/${encodeURIComponent(user.id || user.email)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.user) {
                serverUser = data.user;
              }
            }
          } catch (netErr) {
            console.warn('Could not contact auth server during init:', netErr);
          }

          const liveUser = serverUser || user;
          const isAdmin = isDefaultAdminEmail(liveUser.email) || liveUser.role === 'admin';
          const role: UserRole = isAdmin ? 'admin' : (liveUser.role || 'user');
          const status: UserStatus = isAdmin ? 'approved' : (liveUser.status || 'approved');

          const updatedUser: UserProfile = {
            id: liveUser.id || user.id || ('usr_' + (user.email ? user.email.split('@')[0] : 'user')),
            email: liveUser.email || user.email,
            displayName: liveUser.displayName || user.displayName,
            handle: liveUser.handle || user.handle || `@${(user.displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            avatarUrl: liveUser.avatarUrl || user.avatarUrl || '',
            bio: liveUser.bio || user.bio || '',
            badge: liveUser.badge || user.badge || 'verified',
            role,
            status,
            createdAt: liveUser.createdAt || user.createdAt || new Date().toISOString(),
          };

          localStorage.setItem('portal_active_session', JSON.stringify(updatedUser));
          setAuth({
            user: updatedUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (e) {
          localStorage.removeItem('portal_active_session');
          setAuth({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        setAuth({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  // Sync state with URL history and guard routes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as AppRoute;
      const validRoutes: AppRoute[] = [
        '/auth',
        '/dashboard',
        '/stream',
        '/archive',
        '/social',
        '/chat',
        '/admin',
        '/auth/pending',
        '/auth/pending-approval'
      ];
      if (validRoutes.includes(path)) {
        setCurrentRoute(path);
      } else {
        setCurrentRoute('/dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route: AppRoute) => {
    if (typeof window !== 'undefined' && window.location.pathname !== route) {
      window.history.pushState(null, '', route);
    }
    setCurrentRoute(route);
  };

  // Guard routing logic
  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.isAuthenticated) {
      if (currentRoute !== '/auth') {
        navigateTo('/auth');
      }
      return;
    }

    if (auth.user) {
      const isApproved = auth.user.status === 'approved';
      const isAdmin = auth.user.role === 'admin';

      if (!isApproved) {
        if (currentRoute !== '/auth/pending' && currentRoute !== '/auth/pending-approval') {
          navigateTo('/auth/pending');
        }
      } else {
        if (currentRoute === '/auth' || currentRoute === '/auth/pending' || currentRoute === '/auth/pending-approval') {
          navigateTo('/dashboard');
        } else if (currentRoute === '/admin' && !isAdmin) {
          navigateTo('/dashboard');
        }
      }
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user?.status, auth.user?.role, currentRoute]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sign In implementation (Server-Side Auth)
  const signIn = async (emailOrUsername: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanIdentifier = emailOrUsername.toLowerCase().trim();

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanIdentifier, username: cleanIdentifier, password }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      if (!res.ok || !data || !data.success || !data.user) {
        return { success: false, error: data?.error || 'Invalid credentials or server error.' };
      }

      const activeUser: UserProfile = data.user;
      const isAdmin = isDefaultAdminEmail(activeUser.email) || activeUser.role === 'admin';
      const role: UserRole = isAdmin ? 'admin' : (activeUser.role || 'user');
      const status: UserStatus = isAdmin ? 'approved' : (activeUser.status || 'pending');

      const profile: UserProfile = {
        id: activeUser.id,
        email: activeUser.email,
        displayName: activeUser.displayName,
        handle: activeUser.handle || `@${(activeUser.displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        avatarUrl: activeUser.avatarUrl || '',
        bio: activeUser.bio || 'Hub User Explorer',
        badge: activeUser.badge || 'verified',
        role,
        status,
        createdAt: activeUser.createdAt || new Date().toISOString(),
      };

      // Persist active session only
      localStorage.setItem('portal_active_session', JSON.stringify(profile));
      setAuth({
        user: profile,
        isAuthenticated: true,
        isLoading: false,
      });

      if (profile.status === 'pending' || profile.status === 'rejected' || profile.status === 'banned') {
        navigateTo('/auth/pending');
      } else {
        navigateTo('/dashboard');
      }

      return { success: true };
    } catch (err: any) {
      console.error('Sign in error:', err);
      return { success: false, error: err.message || 'Login failed. Please check network connection.' };
    }
  };

  // Sign Up implementation (Server-Side Global Registration)
  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    handle?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanDisplayName = displayName.trim();
      const cleanHandle = handle 
        ? (handle.startsWith('@') ? handle : `@${handle}`)
        : `@${cleanDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}`;

      // Call backend API to persist globally on disk/database
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          displayName: cleanDisplayName,
          handle: cleanHandle,
        }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      if (!res.ok || !data || !data.success || !data.user) {
        return { success: false, error: data?.error || 'Failed to register account.' };
      }

      const serverUser: UserProfile = data.user;
      const isMaster = isDefaultAdminEmail(cleanEmail);
      const role: UserRole = serverUser.role || (isMaster ? 'admin' : 'user');
      const status: UserStatus = serverUser.status || (isMaster ? 'approved' : 'pending');

      const newUser: UserProfile = {
        id: serverUser.id,
        email: cleanEmail,
        displayName: cleanDisplayName,
        handle: cleanHandle,
        avatarUrl: serverUser.avatarUrl || '',
        bio: serverUser.bio || 'Explore modules, manage files, stream and communicate with peers.',
        badge: 'verified',
        role,
        status,
        createdAt: serverUser.createdAt || new Date().toISOString(),
      };

      // Save only current session
      localStorage.setItem('portal_active_session', JSON.stringify(newUser));
      setAuth({
        user: newUser,
        isAuthenticated: true,
        isLoading: false,
      });

      if (status === 'pending' || status === 'rejected' || status === 'banned') {
        navigateTo('/auth/pending');
      } else {
        navigateTo('/dashboard');
      }

      return {
        success: true,
        message: data.message || 'Account created successfully! Your request is currently waiting for admin approval.',
      };
    } catch (err: any) {
      console.error('Registration error:', err);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  // Logout implementation
  const logout = () => {
    localStorage.removeItem('portal_active_session');
    setAuth({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    navigateTo('/auth');
  };

  // Refresh status helper (for pending approval check button)
  const refreshUserStatus = async (): Promise<UserStatus | null> => {
    if (!auth.user) return null;
    try {
      const res = await fetch(`/api/auth/user/${encodeURIComponent(auth.user.id || auth.user.email)}`);
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        if (data.success && data.user) {
          const liveStatus: UserStatus = data.user.status || 'pending';
          const liveRole: UserRole = data.user.role || auth.user.role;

          const updated: UserProfile = {
            ...auth.user,
            status: liveStatus,
            role: liveRole,
          };

          localStorage.setItem('portal_active_session', JSON.stringify(updated));
          setAuth((prev) => ({
            ...prev,
            user: updated,
          }));

          if (liveStatus === 'approved' && (currentRoute === '/auth/pending' || currentRoute === '/auth/pending-approval')) {
            navigateTo('/dashboard');
          }

          return liveStatus;
        }
      }
    } catch (e) {
      console.error('Failed to refresh user status:', e);
    }
    return null;
  };

  // Admin user queries & actions (100% Server-backed)
  const fetchAdminUsers = async (): Promise<UserProfile[]> => {
    try {
      const res = await fetch('/api/admin/users');
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          const mappedUsers: UserProfile[] = data.users.map((u: any) => ({
            id: u.id,
            email: u.email,
            displayName: u.displayName,
            handle: u.handle || `@${u.username || 'user'}`,
            avatarUrl: u.avatarUrl || '',
            bio: u.bio || '',
            badge: u.badge || 'verified',
            role: u.role,
            status: u.status,
            createdAt: u.createdAt || new Date().toISOString(),
          }));
          return mappedUsers;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch admin users from server:', err);
    }
    return [];
  };

  const getAllRegisteredUsers = (): UserProfile[] => {
    return [];
  };

  const updateUserStatus = async (userId: string, newStatus: UserStatus, userEmail?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: userEmail, status: newStatus }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      if (!res.ok || !data || !data.success) {
        return { success: false, error: data?.error || 'Failed to update user status on server.' };
      }

      // Sync active session if the current user was updated
      if (
        auth.user &&
        (auth.user.id === userId ||
          (auth.user.email && userEmail && auth.user.email.toLowerCase() === userEmail.toLowerCase()))
      ) {
        const updatedProfile: UserProfile = { ...auth.user, status: newStatus };
        localStorage.setItem('portal_active_session', JSON.stringify(updatedProfile));
        setAuth((prev) => ({ ...prev, user: updatedProfile }));
      }

      return { success: true };
    } catch (err: any) {
      console.error('updateUserStatus error:', err);
      return { success: false, error: err.message || 'Failed to update user status' };
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole, userEmail?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      if (!res.ok || !data || !data.success) {
        return { success: false, error: data?.error || 'Failed to update user role on server.' };
      }

      // Sync active session if the current user was updated
      if (
        auth.user &&
        (auth.user.id === userId ||
          (auth.user.email && userEmail && auth.user.email.toLowerCase() === userEmail.toLowerCase()))
      ) {
        const updatedProfile: UserProfile = { ...auth.user, role: newRole };
        localStorage.setItem('portal_active_session', JSON.stringify(updatedProfile));
        setAuth((prev) => ({ ...prev, user: updatedProfile }));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update role' };
    }
  };

  const deleteUser = async (userId: string, userEmail?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      if (!res.ok || !data || !data.success) {
        return { success: false, error: data?.error || 'Failed to delete user on server.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete user' };
    }
  };

  // Update profile details
  const updateProfile = (
    displayName: string,
    handle: string,
    avatarUrl: string,
    bio?: string,
    badge?: 'verified' | 'creator' | 'pro'
  ) => {
    if (!auth.user) return { success: false };

    const formattedHandle = handle 
      ? (handle.startsWith('@') ? handle : `@${handle}`)
      : auth.user.handle;

    const updatedUser: UserProfile = {
      ...auth.user,
      displayName,
      handle: formattedHandle,
      avatarUrl,
      bio,
      badge: badge || auth.user.badge || 'verified',
    };

    // Save in session
    localStorage.setItem('portal_active_session', JSON.stringify(updatedUser));

    // Update current State
    setAuth((prev) => ({
      ...prev,
      user: updatedUser,
    }));

    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigateTo,
        auth,
        signIn,
        signUp,
        logout,
        updateProfile,
        theme,
        toggleTheme,
        refreshUserStatus,
        getAllRegisteredUsers,
        fetchAdminUsers,
        updateUserStatus,
        updateUserRole,
        deleteUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

