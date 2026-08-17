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
      // Initialize registered users in local storage if not present
      const existingUsersStr = localStorage.getItem('portal_registered_users');
      let registeredUsers: any[] = [];

      if (!existingUsersStr) {
        registeredUsers = [MASTER_ADMIN_SEED];
        localStorage.setItem('portal_registered_users', JSON.stringify(registeredUsers));
      } else {
        try {
          registeredUsers = JSON.parse(existingUsersStr);
          if (!Array.isArray(registeredUsers)) registeredUsers = [];
        } catch {
          registeredUsers = [MASTER_ADMIN_SEED];
        }

        // Ensure master admin exists
        const hasAdmin = registeredUsers.some((u) => u.role === 'admin' || isDefaultAdminEmail(u.email));
        if (!hasAdmin) {
          registeredUsers.unshift(MASTER_ADMIN_SEED);
          localStorage.setItem('portal_registered_users', JSON.stringify(registeredUsers));
        }
      }

      // Check for active session
      const activeSession = localStorage.getItem('portal_active_session');
      if (activeSession) {
        try {
          const user = JSON.parse(activeSession) as UserProfile;

          // Try to get fresh status from server
          let serverUser: UserProfile | null = null;
          try {
            const res = await fetch(`/api/auth/user/${user.id || user.email}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.user) {
                serverUser = data.user;
              }
            }
          } catch (netErr) {
            // Ignore server offline error during init
          }

          // Match with server or live registered users data for newest role & status
          const liveUser = serverUser || registeredUsers.find(
            (u) => (user.id && u.id === user.id) || (user.email && u.email?.toLowerCase() === user.email.toLowerCase())
          );

          const role: UserRole = liveUser?.role || (isDefaultAdminEmail(user.email) ? 'admin' : (user.role || 'user'));
          const status: UserStatus = liveUser?.status || (role === 'admin' ? 'approved' : (user.status || 'approved'));

          const updatedUser: UserProfile = {
            id: liveUser?.id || user.id || ('usr_' + (user.email ? user.email.split('@')[0] : 'user')),
            email: user.email,
            displayName: liveUser?.displayName || user.displayName,
            handle: liveUser?.handle || user.handle || `@${(user.displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            avatarUrl: liveUser?.avatarUrl || user.avatarUrl || '',
            bio: liveUser?.bio || user.bio || '',
            badge: liveUser?.badge || user.badge || 'verified',
            role,
            status,
            createdAt: liveUser?.createdAt || user.createdAt || new Date().toISOString(),
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

  // Sign In implementation
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      let serverUser: UserProfile | null = null;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          serverUser = data.user;
        }
      } catch (netErr) {
        console.warn('Backend login fetch failed, falling back to local store:', netErr);
      }

      const usersStr = localStorage.getItem('portal_registered_users') || '[]';
      let users: any[] = [];
      try {
        users = JSON.parse(usersStr);
      } catch {
        users = [];
      }

      const foundLocal = users.find(
        (u: any) => u.email.toLowerCase() === cleanEmail && u.password === password
      );

      if (!serverUser && !foundLocal) {
        return { success: false, error: 'Invalid email or password.' };
      }

      const activeUser = serverUser || foundLocal;
      const isAdmin = isDefaultAdminEmail(activeUser.email) || activeUser.role === 'admin';
      const role: UserRole = isAdmin ? 'admin' : (activeUser.role || 'user');
      const status: UserStatus = isAdmin ? 'approved' : (activeUser.status || 'pending');

      const profile: UserProfile = {
        id: activeUser.id || ('usr_' + activeUser.email.split('@')[0]),
        email: activeUser.email,
        displayName: activeUser.displayName,
        handle: activeUser.handle || (`@${activeUser.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}`),
        avatarUrl: activeUser.avatarUrl || '',
        bio: activeUser.bio || 'Hub User Explorer',
        badge: activeUser.badge || 'verified',
        role,
        status,
        createdAt: activeUser.createdAt || new Date().toISOString(),
      };

      const matchedIdx = users.findIndex((u) => u.email?.toLowerCase() === cleanEmail);
      if (matchedIdx >= 0) {
        users[matchedIdx] = { ...users[matchedIdx], ...profile };
      } else {
        users.push({ ...profile, password });
      }
      localStorage.setItem('portal_registered_users', JSON.stringify(users));

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
      return { success: false, error: err.message || 'Login failed.' };
    }
  };

  // Sign Up implementation (Defaults new users to status: 'pending', role: 'user')
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

      // Call backend API to persist to disk
      let serverUser: UserProfile | null = null;
      let serverMsg: string | undefined;

      try {
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
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to register.' };
        }
        serverUser = data.user;
        serverMsg = data.message;
      } catch (netErr) {
        console.warn('Backend register fetch failed, fallback to local store:', netErr);
      }

      const isMaster = isDefaultAdminEmail(cleanEmail);
      const role: UserRole = serverUser?.role || (isMaster ? 'admin' : 'user');
      const status: UserStatus = serverUser?.status || (isMaster ? 'approved' : 'pending');

      const newUser: UserProfile = {
        id: serverUser?.id || ('usr_' + Date.now().toString(36)),
        email: cleanEmail,
        displayName: cleanDisplayName,
        handle: cleanHandle,
        avatarUrl: serverUser?.avatarUrl || '',
        bio: serverUser?.bio || 'Explore modules, manage files, stream and communicate with peers.',
        badge: 'verified',
        role,
        status,
        createdAt: serverUser?.createdAt || new Date().toISOString(),
      };

      // Save to local storage
      const usersStr = localStorage.getItem('portal_registered_users') || '[]';
      let users: any[] = [];
      try {
        users = JSON.parse(usersStr);
        if (!Array.isArray(users)) users = [];
      } catch {
        users = [];
      }

      const existingIdx = users.findIndex((u) => u.email?.toLowerCase() === cleanEmail);
      if (existingIdx >= 0) {
        users[existingIdx] = { ...users[existingIdx], ...newUser, password };
      } else {
        users.push({ ...newUser, password });
      }
      localStorage.setItem('portal_registered_users', JSON.stringify(users));

      // Auto-login active session
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
        message: serverMsg || 'Account created successfully! Your request is currently waiting for admin approval.',
      };
    } catch (err: any) {
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
      let liveStatus: UserStatus | null = null;
      let liveRole: UserRole | null = null;

      // Try server API first
      try {
        const res = await fetch(`/api/auth/user/${auth.user.id || auth.user.email}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            liveStatus = data.user.status;
            liveRole = data.user.role;
          }
        }
      } catch (e) {
        console.warn('Failed to query server user endpoint:', e);
      }

      // Check local storage if server not available
      if (!liveStatus) {
        const usersStr = localStorage.getItem('portal_registered_users') || '[]';
        const users = JSON.parse(usersStr);
        const found = users.find(
          (u: any) =>
            (auth.user?.id && u.id === auth.user.id) ||
            (auth.user?.email && u.email.toLowerCase() === auth.user.email.toLowerCase())
        );
        if (found) {
          liveStatus = found.status || 'pending';
          liveRole = found.role || 'user';
        }
      }

      if (liveStatus) {
        const updated: UserProfile = {
          ...auth.user,
          status: liveStatus,
          role: liveRole || auth.user.role,
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
    } catch (e) {
      console.error('Failed to refresh user status:', e);
    }
    return null;
  };

  // Admin user queries & actions (syncs with server)
  const getAllRegisteredUsers = (): UserProfile[] => {
    try {
      const usersStr = localStorage.getItem('portal_registered_users') || '[]';
      let users = JSON.parse(usersStr);
      if (!Array.isArray(users)) users = [];

      // If empty, return master admin
      if (users.length === 0) {
        users = [MASTER_ADMIN_SEED];
        localStorage.setItem('portal_registered_users', JSON.stringify(users));
      }

      return users.map((u: any) => ({
        id: u.id || ('usr_' + (u.email ? u.email.split('@')[0] : 'user')),
        email: u.email,
        displayName: u.displayName || 'Unknown User',
        handle: u.handle || (`@${(u.displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}`),
        avatarUrl: u.avatarUrl || '',
        bio: u.bio || '',
        badge: u.badge || 'verified',
        role: (u.role || (isDefaultAdminEmail(u.email) ? 'admin' : 'user')) as UserRole,
        status: (u.status || (isDefaultAdminEmail(u.email) ? 'approved' : 'pending')) as UserStatus,
        createdAt: u.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  };

  const fetchAdminUsers = async (): Promise<UserProfile[]> => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
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

          // Sync with local storage
          localStorage.setItem('portal_registered_users', JSON.stringify(mappedUsers));
          return mappedUsers;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch admin users from server:', err);
    }
    return getAllRegisteredUsers();
  };

  const updateUserStatus = async (userId: string, newStatus: UserStatus, userEmail?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Send to server
      try {
        await fetch('/api/admin/users/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, email: userEmail, status: newStatus }),
        });
      } catch (netErr) {
        console.warn('Server status update warning:', netErr);
      }

      // Update local storage
      const usersStr = localStorage.getItem('portal_registered_users') || '[]';
      let users: any[] = [];
      try {
        users = JSON.parse(usersStr);
      } catch {
        users = [];
      }

      const targetId = (userId || '').toLowerCase().trim();
      const targetEmail = (userEmail || '').toLowerCase().trim();

      let matched = false;
      const updatedUsers = users.map((u: any) => {
        const uId = (u.id || '').toLowerCase().trim();
        const uEmail = (u.email || '').toLowerCase().trim();

        const isMatch =
          (targetId && uId === targetId) ||
          (targetEmail && uEmail === targetEmail) ||
          (targetId && uEmail && targetId.includes(uEmail)) ||
          (uId && targetEmail && uId.includes(targetEmail.split('@')[0]));

        if (isMatch) {
          matched = true;
          return {
            ...u,
            id: u.id || userId,
            status: newStatus,
          };
        }
        return u;
      });

      if (!matched && userEmail) {
        updatedUsers.push({
          id: userId,
          email: userEmail.toLowerCase().trim(),
          displayName: userEmail.split('@')[0],
          handle: `@${userEmail.split('@')[0]}`,
          status: newStatus,
          role: isDefaultAdminEmail(userEmail) ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        });
      }

      localStorage.setItem('portal_registered_users', JSON.stringify(updatedUsers));

      // Sync active session if the current user was updated
      if (
        auth.user &&
        (auth.user.id === userId ||
          (auth.user.email && targetEmail && auth.user.email.toLowerCase() === targetEmail))
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
      // Send to server
      try {
        await fetch(`/api/admin/users/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });
      } catch (netErr) {
        console.warn('Server role update warning:', netErr);
      }

      const usersStr = localStorage.getItem('portal_registered_users') || '[]';
      let users: any[] = [];
      try {
        users = JSON.parse(usersStr);
      } catch {
        users = [];
      }

      const targetId = (userId || '').toLowerCase().trim();
      const targetEmail = (userEmail || '').toLowerCase().trim();

      const updatedUsers = users.map((u: any) => {
        const uId = (u.id || '').toLowerCase().trim();
        const uEmail = (u.email || '').toLowerCase().trim();

        const isMatch =
          (targetId && uId === targetId) ||
          (targetEmail && uEmail === targetEmail);

        if (isMatch) {
          return { ...u, role: newRole };
        }
        return u;
      });

      localStorage.setItem('portal_registered_users', JSON.stringify(updatedUsers));

      // Sync active session if the current user was updated
      if (
        auth.user &&
        (auth.user.id === userId ||
          (auth.user.email && targetEmail && auth.user.email.toLowerCase() === targetEmail))
      ) {
        const updatedProfile: UserProfile = { ...auth.user, role: newRole };
        localStorage.setItem('portal_active_session', JSON.stringify(updatedProfile));
        setAuth((prev) => ({ ...prev, user: updatedProfile }));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteUser = async (userId: string, userEmail?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Send to server
      try {
        await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });
      } catch (netErr) {
        console.warn('Server delete user warning:', netErr);
      }

      const usersStr = localStorage.getItem('portal_registered_users') || '[]';
      let users: any[] = [];
      try {
        users = JSON.parse(usersStr);
      } catch {
        users = [];
      }

      const targetId = (userId || '').toLowerCase().trim();
      const targetEmail = (userEmail || '').toLowerCase().trim();

      const updatedUsers = users.filter((u: any) => {
        const uId = (u.id || '').toLowerCase().trim();
        const uEmail = (u.email || '').toLowerCase().trim();
        const isMatch =
          (targetId && uId === targetId) ||
          (targetEmail && uEmail === targetEmail);
        return !isMatch;
      });

      localStorage.setItem('portal_registered_users', JSON.stringify(updatedUsers));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
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

    // Update inside registered users list too
    const usersStr = localStorage.getItem('portal_registered_users') || '[]';
    const users = JSON.parse(usersStr);
    const updatedUsers = users.map((u: any) => {
      if (u.email.toLowerCase() === auth.user!.email.toLowerCase()) {
        return { 
          ...u, 
          displayName, 
          handle: formattedHandle, 
          avatarUrl, 
          bio, 
          badge: updatedUser.badge 
        };
      }
      return u;
    });
    localStorage.setItem('portal_registered_users', JSON.stringify(updatedUsers));

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

