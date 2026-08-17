/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';
import MamadTubeLogo from './Logo';

export default function AuthPage() {
  const { signIn, signUp } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // UI States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation
  const validateForm = () => {
    setError(null);
    if (!email) {
      setError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (isSignUp && !displayName.trim()) {
      setError('Display name is required for registration.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const res = await signUp(email, password, displayName);
        if (res.success) {
          setSuccessMsg('Account created successfully! Welcome aboard.');
        } else {
          setError(res.error || 'Failed to sign up.');
        }
      } else {
        const res = await signIn(email, password);
        if (!res.success) {
          setError(res.error || 'Failed to sign in.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@example.com');
    setPassword('password123');
    setIsSignUp(false);
    setError(null);
  };

  return (
    <div id="auth-page-container" className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-zinc-950 px-4 transition-colors duration-300">
      
      {/* Background Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-md z-10 my-8">
        
        {/* Hub Logo & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-2 cursor-pointer hover:opacity-90 transition-opacity">
            <MamadTubeLogo size={52} showText={true} />
          </div>
          <p className="mt-1 text-xs text-zinc-400 font-normal">
            A unified core for streaming, archives, social, and chat
          </p>
        </div>

        {/* Card Component */}
        <motion.div
          id="auth-card"
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xs overflow-hidden p-6 sm:p-7"
        >
          {/* Tab Switcher */}
          <div className="flex border-b border-zinc-800 pb-3 mb-5">
            <button
              id="auth-tab-signin"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center py-1.5 text-xs font-semibold transition-colors relative cursor-pointer ${
                !isSignUp ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign In
              {!isSignUp && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                />
              )}
            </button>
            <button
              id="auth-tab-signup"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center py-1.5 text-xs font-semibold transition-colors relative cursor-pointer ${
                isSignUp ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign Up
              {isSignUp && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-banner"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-950/40 border border-red-900/60 text-red-400 rounded-lg p-2.5 text-xs font-medium mb-4 flex items-start gap-2 overflow-hidden"
              >
                <span>⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                key="success-banner"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 rounded-lg p-2.5 text-xs font-medium mb-4 flex items-center gap-2 overflow-hidden"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Display Name - Only on Sign Up */}
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1 overflow-hidden"
                >
                  <label className="text-[11px] font-semibold text-zinc-300">
                    Display Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="signup-name-input"
                      type="text"
                      placeholder="Jane Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 text-xs sm:text-sm rounded-lg focus:outline-none focus:border-zinc-600 text-zinc-100 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-300">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="auth-email-input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 text-xs sm:text-sm rounded-lg focus:outline-none focus:border-zinc-600 text-zinc-100 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-zinc-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-zinc-950 border border-zinc-800 text-xs sm:text-sm rounded-lg focus:outline-none focus:border-zinc-600 text-zinc-100 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium py-2.5 px-4 rounded-lg text-xs sm:text-sm transition-colors focus:outline-none flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
