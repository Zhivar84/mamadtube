import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile, UserRole, UserStatus } from '../../types';
import UserAvatar from '../common/UserAvatar';
import {
  Users,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Search,
  Check,
  X,
  Ban,
  Shield,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Mail,
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmVariant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white',
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl z-10 space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              confirmVariant === 'danger' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-base font-bold text-zinc-100">{title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700/80 rounded-xl border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 ${variantStyles[confirmVariant]}`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function AdminDashboard() {
  const { 
    auth, 
    getAllRegisteredUsers, 
    fetchAdminUsers,
    updateUserStatus, 
    updateUserRole, 
    deleteUser 
  } = useApp();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'approved' | 'banned' | 'rejected'>('all');
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Per-user loading state
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal confirmation state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: '',
    confirmVariant: 'danger',
    action: () => {},
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const refreshUsers = async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data.users || []);
        const mappedUsers: UserProfile[] = rawList.map((u: any) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName || u.username || 'User',
          handle: u.handle || `@${u.username || 'user'}`,
          avatarUrl: u.avatarUrl || '',
          bio: u.bio || '',
          badge: u.badge || 'verified',
          role: u.role || 'user',
          status: u.status || 'pending',
          createdAt: u.createdAt || new Date().toISOString(),
        }));
        setUsersList(mappedUsers);
      }
    } catch (err: any) {
      console.error('Failed to load users from VPS server:', err);
    } finally {
      if (!silent) {
        setTimeout(() => setIsRefreshing(false), 200);
      }
    }
  };

  useEffect(() => {
    refreshUsers();
    // 5-second automatic polling to sync new registrations from VPS disk in real time
    const interval = setInterval(() => {
      refreshUsers(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = usersList.length;
    const pending = usersList.filter(u => u.status === 'pending').length;
    const approved = usersList.filter(u => u.status === 'approved').length;
    const banned = usersList.filter(u => u.status === 'banned').length;
    const rejected = usersList.filter(u => u.status === 'rejected').length;
    const admins = usersList.filter(u => u.role === 'admin').length;

    return { total, pending, approved, banned, rejected, admins };
  }, [usersList]);

  // Filtered & Searched Users
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchesFilter = selectedFilter === 'all' ? true : u.status === selectedFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (u.displayName && u.displayName.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) || 
        (u.handle && u.handle.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  }, [usersList, selectedFilter, searchQuery]);

  // ==========================================
  // Core Action Handlers with Optimistic Updates
  // ==========================================

  // 1. APPROVE USER
  const handleApprove = async (e: React.MouseEvent, user: UserProfile) => {
    e.preventDefault();
    e.stopPropagation();

    if (processingUserId) return;
    setProcessingUserId(user.id);

    // Optimistic UI Update: immediately update state
    setUsersList(prev => prev.map(u => 
      (u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()))
        ? { ...u, status: 'approved' }
        : u
    ));

    try {
      const res = await updateUserStatus(user.id, 'approved', user.email);
      if (res.success) {
        showToast(`User ${user.displayName} is now approved!`, 'success');
      } else {
        showToast(res.error || 'Could not update user status.', 'error');
        refreshUsers(); // Rollback if failed
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred while approving user.', 'error');
      refreshUsers();
    } finally {
      setProcessingUserId(null);
    }
  };

  // 2. REJECT USER (Direct Instant Action)
  const handleReject = async (e: React.MouseEvent, user: UserProfile) => {
    e.preventDefault();
    e.stopPropagation();

    if (processingUserId) return;
    setProcessingUserId(user.id);

    // Optimistic UI Update: immediately set status to rejected
    setUsersList(prev => prev.map(u => 
      (u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()))
        ? { ...u, status: 'rejected' }
        : u
    ));

    try {
      const res = await updateUserStatus(user.id, 'rejected', user.email);
      if (res.success) {
        showToast(`User ${user.displayName} has been rejected.`, 'info');
      } else {
        showToast(res.error || 'Could not reject user.', 'error');
        refreshUsers(); // Rollback if failed
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred while rejecting user.', 'error');
      refreshUsers();
    } finally {
      setProcessingUserId(null);
    }
  };

  // 3. BAN / UNBAN TOGGLE
  const handleToggleBan = async (e: React.MouseEvent, user: UserProfile) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlyBanned = user.status === 'banned';
    const targetStatus: UserStatus = isCurrentlyBanned ? 'approved' : 'banned';

    if (isCurrentlyBanned) {
      // Unban directly
      setProcessingUserId(user.id);
      setUsersList(prev => prev.map(u => 
        (u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()))
          ? { ...u, status: targetStatus }
          : u
      ));

      try {
        const res = await updateUserStatus(user.id, targetStatus, user.email);
        if (res.success) {
          showToast(`User ${user.displayName} unbanned & restored.`, 'success');
        } else {
          showToast(res.error || 'Failed to unban user.', 'error');
          refreshUsers();
        }
      } catch (err: any) {
        showToast(err.message || 'Error unbanning user.', 'error');
        refreshUsers();
      } finally {
        setProcessingUserId(null);
      }
      return;
    }

    // Show modal confirmation for Banning
    setModalConfig({
      isOpen: true,
      title: `Ban Account: ${user.displayName}?`,
      description: `Are you sure you want to suspend access for ${user.displayName} (${user.email})? Their active sessions will be invalidated.`,
      confirmLabel: 'Confirm Ban',
      confirmVariant: 'danger',
      action: async () => {
        setProcessingUserId(user.id);
        setUsersList(prev => prev.map(u => 
          (u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()))
            ? { ...u, status: 'banned' }
            : u
        ));

        try {
          const res = await updateUserStatus(user.id, 'banned', user.email);
          if (res.success) {
            showToast(`User ${user.displayName} has been banned.`, 'info');
          } else {
            showToast(res.error || 'Failed to ban user.', 'error');
            refreshUsers();
          }
        } catch (err: any) {
          showToast(err.message || 'Error banning user.', 'error');
          refreshUsers();
        } finally {
          setProcessingUserId(null);
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 4. TOGGLE ADMIN ROLE
  const handleToggleRole = (e: React.MouseEvent, user: UserProfile) => {
    e.preventDefault();
    e.stopPropagation();

    const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    const isDemotingSelf = user.id === auth.user?.id && newRole === 'user';

    if (isDemotingSelf && metrics.admins <= 1) {
      showToast('Cannot remove admin privileges: you are the only administrator.', 'error');
      return;
    }

    setModalConfig({
      isOpen: true,
      title: `${newRole === 'admin' ? 'Promote to Admin' : 'Demote to Member'}: ${user.displayName}?`,
      description: `Are you sure you want to set ${user.displayName}'s role to ${newRole === 'admin' ? 'Administrator (full platform access & approval rights)' : 'Standard Member'}?`,
      confirmLabel: newRole === 'admin' ? 'Grant Admin Privileges' : 'Demote to Member',
      confirmVariant: newRole === 'admin' ? 'primary' : 'warning',
      action: async () => {
        setProcessingUserId(user.id);
        setUsersList(prev => prev.map(u => 
          (u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()))
            ? { ...u, role: newRole }
            : u
        ));

        try {
          const res = await updateUserRole(user.id, newRole, user.email);
          if (res.success) {
            showToast(`Updated ${user.displayName}'s role to ${newRole}.`, 'success');
          } else {
            showToast(res.error || 'Failed to update role.', 'error');
            refreshUsers();
          }
        } catch (err: any) {
          showToast(err.message || 'Error updating role.', 'error');
          refreshUsers();
        } finally {
          setProcessingUserId(null);
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 5. DIRECT STATUS SELECTOR HANDLER
  const handleDirectStatusChange = async (user: UserProfile, newStatus: UserStatus) => {
    if (user.status === newStatus || processingUserId) return;
    setProcessingUserId(user.id);

    // Optimistic UI update
    setUsersList(prev => prev.map(u => 
      (u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()))
        ? { ...u, status: newStatus }
        : u
    ));

    try {
      const res = await updateUserStatus(user.id, newStatus, user.email);
      if (res.success) {
        showToast(`Status updated to ${newStatus} for ${user.displayName}`, 'success');
      } else {
        showToast(res.error || 'Failed to update status', 'error');
        refreshUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Status change error', 'error');
      refreshUsers();
    } finally {
      setProcessingUserId(null);
    }
  };

  // 6. DELETE USER
  const handleDelete = (e: React.MouseEvent, user: UserProfile) => {
    e.preventDefault();
    e.stopPropagation();

    if (user.id === auth.user?.id) {
      showToast('You cannot delete your own active administrator account.', 'error');
      return;
    }

    setModalConfig({
      isOpen: true,
      title: `Permanently Delete User: ${user.displayName}?`,
      description: `This action will remove ${user.displayName} (${user.email}) permanently. This cannot be undone.`,
      confirmLabel: 'Delete Record',
      confirmVariant: 'danger',
      action: async () => {
        setProcessingUserId(user.id);
        setUsersList(prev => prev.filter(u => 
          !(u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()))
        ));

        try {
          const res = await deleteUser(user.id, user.email);
          if (res.success) {
            showToast(`User ${user.displayName} deleted successfully.`, 'success');
          } else {
            showToast(res.error || 'Failed to delete user.', 'error');
            refreshUsers();
          }
        } catch (err: any) {
          showToast(err.message || 'Error deleting user.', 'error');
          refreshUsers();
        } finally {
          setProcessingUserId(null);
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold border ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border-rose-800/80'
                : 'bg-zinc-900/90 text-zinc-200 border-zinc-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        description={modalConfig.description}
        confirmLabel={modalConfig.confirmLabel}
        confirmVariant={modalConfig.confirmVariant}
        isLoading={Boolean(processingUserId)}
        onConfirm={modalConfig.action}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                Admin Management Panel
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Admin Exclusive
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                Review registrations, approve new users, manage roles, and enforce moderation.
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refreshUsers}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Table</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Users */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium">Total Accounts</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-xl font-extrabold text-zinc-100">{metrics.total}</p>
        </div>

        {/* Pending Requests */}
        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-900/30 space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-medium">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-extrabold text-amber-400">{metrics.pending}</p>
            {metrics.pending > 0 && (
              <span className="text-[10px] text-amber-400/80 font-semibold animate-pulse">
                Needs Action
              </span>
            )}
          </div>
        </div>

        {/* Approved Members */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-medium">Approved Users</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-400">{metrics.approved}</p>
        </div>

        {/* Platform Admins */}
        <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-900/30 space-y-1">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[11px] font-medium">Administrators</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-extrabold text-purple-300">{metrics.admins}</p>
        </div>

        {/* Banned Users */}
        <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/30 space-y-1">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-medium">Banned Accounts</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-extrabold text-rose-400">{metrics.banned}</p>
        </div>

        {/* Rejected Requests */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium">Rejected</span>
            <X className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-xl font-extrabold text-zinc-300">{metrics.rejected}</p>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Controls Bar: Filters & Search */}
        <div className="p-4 border-b border-zinc-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-950/40">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-xs'
                  : 'bg-zinc-800/80 text-zinc-300 hover:text-zinc-100'
              }`}
            >
              All Users ({metrics.total})
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('pending')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'pending'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : 'bg-zinc-800/80 text-amber-400/90 hover:text-amber-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selectedFilter === 'pending' ? 'bg-zinc-950' : 'bg-amber-400 animate-pulse'}`} />
              Pending ({metrics.pending})
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'approved'
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-xs'
                  : 'bg-zinc-800/80 text-emerald-400/90 hover:text-emerald-300'
              }`}
            >
              Approved ({metrics.approved})
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('banned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'banned'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'bg-zinc-800/80 text-rose-400/90 hover:text-rose-300'
              }`}
            >
              Banned ({metrics.banned})
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'rejected'
                  ? 'bg-zinc-700 text-zinc-100 font-bold shadow-xs'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Rejected ({metrics.rejected})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, email or handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/50 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">User / Account</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Contact & Handle</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Registered</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-normal text-zinc-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-zinc-300">No users match criteria</p>
                      <p className="text-[11px] text-zinc-500">
                        Try changing the search query or status filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentAuthUser = user.id === auth.user?.id || (Boolean(user.email) && user.email.toLowerCase() === auth.user?.email.toLowerCase());
                  const isPending = user.status === 'pending';
                  const isApproved = user.status === 'approved';
                  const isBanned = user.status === 'banned';
                  const isRejected = user.status === 'rejected';
                  const isAdmin = user.role === 'admin';
                  const isProcessing = processingUserId === user.id;

                  const regDate = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Earlier';

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        isPending ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Avatar & Display Name */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={user.displayName}
                            avatarUrl={user.avatarUrl}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-zinc-100 truncate">
                                {user.displayName}
                              </span>
                              {isCurrentAuthUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400 sm:hidden block truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Handle */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-mono text-zinc-300 text-xs truncate select-all">{user.email}</p>
                          <p className="font-mono text-indigo-400/90 text-[11px]">{user.handle}</p>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-zinc-400 text-xs">
                        {regDate}
                      </td>

                      {/* Status Dropdown / Badge */}
                      <td className="py-3.5 px-4">
                        <div className="relative inline-block">
                          <select
                            value={user.status}
                            disabled={isProcessing}
                            onChange={(e) => handleDirectStatusChange(user, e.target.value as UserStatus)}
                            className={`appearance-none text-[11px] font-semibold pl-2.5 pr-6 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors ${
                              isPending
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : isApproved
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isBanned
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            <option value="pending" className="bg-zinc-900 text-amber-400">● Pending</option>
                            <option value="approved" className="bg-zinc-900 text-emerald-400">✓ Approved</option>
                            <option value="rejected" className="bg-zinc-900 text-zinc-400">✕ Rejected</option>
                            <option value="banned" className="bg-zinc-900 text-rose-400">⊘ Banned</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                            Member
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          
                          {/* Approve Action Button */}
                          {!isApproved && (
                            <button
                              id={`approve-user-${user.id}`}
                              type="button"
                              title="Approve User Registration"
                              disabled={isProcessing}
                              onClick={(e) => handleApprove(e, user)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Reject Action Button (for pending users) */}
                          {isPending && (
                            <button
                              id={`reject-user-${user.id}`}
                              type="button"
                              title="Reject Registration"
                              disabled={isProcessing}
                              onClick={(e) => handleReject(e, user)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-300 hover:text-white font-semibold rounded-lg text-[11px] border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Ban / Unban Toggle */}
                          {!isPending && !isCurrentAuthUser && (
                            <button
                              id={`toggle-ban-user-${user.id}`}
                              type="button"
                              title={isBanned ? 'Unban User' : 'Ban User'}
                              disabled={isProcessing}
                              onClick={(e) => handleToggleBan(e, user)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                                isBanned 
                                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/50' 
                                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30'
                              }`}
                            >
                              {isBanned ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Role Toggle Button */}
                          {!isCurrentAuthUser && (
                            <button
                              id={`toggle-role-user-${user.id}`}
                              type="button"
                              title={isAdmin ? 'Demote to Member' : 'Promote to Admin'}
                              disabled={isProcessing}
                              onClick={(e) => handleToggleRole(e, user)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                                isAdmin 
                                  ? 'bg-purple-950/40 border-purple-800/60 text-purple-400 hover:bg-purple-900/50' 
                                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-purple-400 hover:bg-purple-950/30'
                              }`}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {!isCurrentAuthUser && (
                            <button
                              id={`delete-user-${user.id}`}
                              type="button"
                              title="Delete Record"
                              disabled={isProcessing}
                              onClick={(e) => handleDelete(e, user)}
                              className="p-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2">
          <span>Showing {filteredUsers.length} of {metrics.total} registered users</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Live Optimistic Updates Enabled
          </span>
        </div>
      </div>
    </div>
  );
}
