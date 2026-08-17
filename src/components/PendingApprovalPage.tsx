import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import MamadTubeLogo from './Logo';
import { 
  Clock, 
  ShieldAlert, 
  XCircle, 
  LogOut, 
  RotateCw, 
  CheckCircle2, 
  Mail, 
  User, 
  Calendar,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PendingApprovalPage() {
  const { auth, logout, refreshUserStatus, navigateTo } = useApp();
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const user = auth.user;

  // 5-second auto-poll to detect approval in real-time
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const status = await refreshUserStatus();
        if (status === 'approved') {
          setStatusMessage('Your account has been approved! Redirecting...');
          setTimeout(() => {
            navigateTo('/dashboard');
          }, 800);
        }
      } catch (e) {
        // Silent background check failure
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, refreshUserStatus, navigateTo]);

  if (!user) return null;

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const status = await refreshUserStatus();
      if (status === 'approved') {
        setStatusMessage('Your account is approved! Redirecting to Dashboard...');
        setTimeout(() => {
          navigateTo('/dashboard');
        }, 1000);
      } else if (status === 'banned') {
        setStatusMessage('Account status: Suspended/Banned by administrator.');
      } else if (status === 'rejected') {
        setStatusMessage('Account status: Registration declined by administrator.');
      } else {
        setStatusMessage('Account status is currently waiting for admin approval.');
      }
    } catch {
      setStatusMessage('Unable to reach server. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const statusConfig = {
    pending: {
      title: 'Account Pending Approval',
      badge: 'Pending Review',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Clock,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      description: 'Account created successfully! Your request is currently waiting for admin approval. You will gain full access to all features once an administrator reviews and approves your account.',
      accentBorder: 'border-amber-500/30'
    },
    banned: {
      title: 'Account Suspended',
      badge: 'Banned',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20',
      description: 'Your account access has been suspended by an administrator. Please contact system support for more information.',
      accentBorder: 'border-rose-500/30'
    },
    rejected: {
      title: 'Registration Declined',
      badge: 'Rejected',
      badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: XCircle,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/10 border-red-500/20',
      description: 'Your registration request was not approved by an administrator. You may create a new request or contact support.',
      accentBorder: 'border-red-500/30'
    },
    approved: {
      title: 'Account Approved',
      badge: 'Approved',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      description: 'Your account has been verified and approved.',
      accentBorder: 'border-emerald-500/30'
    }
  };

  const currentStatus = user.status || 'pending';
  const config = statusConfig[currentStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Recently';

  return (
    <div id="pending-approval-view" className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Subtle Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 space-y-6">
        
        {/* Hub Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 cursor-pointer hover:opacity-90 transition-opacity">
            <MamadTubeLogo size={46} showText={true} />
          </div>
        </div>

        {/* Main Status Container */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`bg-zinc-900/90 border ${config.accentBorder} rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 text-left`}
        >
          {/* Header Badge & Title */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${config.iconBg} border flex items-center justify-center shrink-0`}>
              <StatusIcon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                  {config.title}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.badgeColor}`}>
                  {config.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          {/* User Details Summary Card */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Registered Account Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Display Name</span>
                <p className="text-xs font-semibold text-zinc-200 truncate">
                  {user.displayName}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Handle</span>
                <p className="text-xs font-mono font-medium text-indigo-400 truncate">
                  {user.handle}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Email Address</span>
                <p className="text-xs font-mono text-zinc-300 truncate">
                  {user.email}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500">Registered On</span>
                <p className="text-xs text-zinc-400">
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>

          {/* Feedback notification status */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                  statusMessage.includes('approved')
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                }`}
              >
                {statusMessage.includes('approved') ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{statusMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions: Check Status & Log Out */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              id="check-status-btn"
              type="button"
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Status...' : 'Check Status'}</span>
            </button>

            <button
              id="pending-logout-btn"
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-zinc-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Note */}
          <div className="pt-2 border-t border-zinc-800/80 text-center">
            <p className="text-[11px] text-zinc-500">
              Need immediate assistance? Contact the administrator at{' '}
              <span className="text-zinc-400 font-mono">admin@mamadtube.com</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
