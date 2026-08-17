/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppRoute = '/auth' | '/dashboard' | '/stream' | '/archive' | '/social' | '/chat' | '/admin' | '/auth/pending' | '/auth/pending-approval';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'banned';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  badge?: 'verified' | 'creator' | 'pro';
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type Theme = 'light' | 'dark';

export interface ModuleCard {
  id: string;
  title: string;
  description: string;
  iconName: string;
  route: AppRoute;
  colorClass: string;
  badge?: string;
}
