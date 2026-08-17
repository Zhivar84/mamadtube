/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import StreamLayout from './components/stream/StreamLayout';
import CloudArchive from './components/archive/CloudArchive';
import SocialFeed from './components/social/SocialFeed';
import ChatLayout from './components/chat/ChatLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import PendingApprovalPage from './components/PendingApprovalPage';

function AppContent() {
  const { currentRoute, auth } = useApp();

  if (auth.isLoading) {
    return (
      <div id="loading-container" className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-9 h-9 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Restoring active session...</p>
        </div>
      </div>
    );
  }

  // Enforce Route Guard: unauthenticated users always get the AuthPage
  if (!auth.isAuthenticated || !auth.user) {
    return <AuthPage />;
  }

  // Enforce Status Guard: unapproved/pending/banned users get the pending screen
  if (auth.user.status !== 'approved') {
    return <PendingApprovalPage />;
  }

  // Active route matching for approved users
  const renderRouteContent = () => {
    switch (currentRoute) {
      case '/dashboard':
        return <Dashboard />;
      case '/stream':
        return <StreamLayout />;
      case '/archive':
        return <CloudArchive />;
      case '/social':
        return <SocialFeed />;
      case '/chat':
        return <ChatLayout />;
      case '/admin':
        return auth.user?.role === 'admin' ? <AdminDashboard /> : <Dashboard />;
      case '/auth/pending':
      case '/auth/pending-approval':
        return <PendingApprovalPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* Global Top Switcher and Profile Header */}
      <Header />
      
      {/* Scrollable module panel container */}
      <main id="main-content" className="flex-1 w-full pb-12">
        {renderRouteContent()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

