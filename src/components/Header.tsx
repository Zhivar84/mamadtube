/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AppRoute } from '../types';
import { 
  Tv2, 
  FolderGit, 
  Heart, 
  MessageCircle, 
  ChevronDown, 
  Sun, 
  Moon, 
  Menu,
  LayoutGrid,
  ShieldCheck
} from 'lucide-react';
import ProfileDrawer from './ProfileDrawer';
import UserAvatar from './common/UserAvatar';
import MamadTubeLogo from './Logo';

export default function Header() {
  const { currentRoute, navigateTo, theme, toggleTheme, auth } = useApp();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile dropdown when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentRoute]);

  // Close mobile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!auth.isAuthenticated || !auth.user) return null;

  const user = auth.user;

  const navigationItems: { label: string; route: AppRoute; icon: any; adminOnly?: boolean }[] = [
    { label: 'Dashboard', route: '/dashboard', icon: LayoutGrid },
    { label: 'Streaming', route: '/stream', icon: Tv2 },
    { label: 'Archive', route: '/archive', icon: FolderGit },
    { label: 'Social Feed', route: '/social', icon: Heart },
    { label: 'Live Chat', route: '/chat', icon: MessageCircle },
    ...(user.role === 'admin' ? [{ label: 'Admin', route: '/admin' as AppRoute, icon: ShieldCheck, adminOnly: true }] : []),
  ];

  return (
    <>
      <header id="app-header" className="sticky top-0 z-30 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand/Logo */}
          <div 
            id="header-brand"
            onClick={() => navigateTo('/dashboard')}
            className="cursor-pointer group select-none"
          >
            <MamadTubeLogo size={36} showText={true} />
          </div>

          {/* Desktop Navigation Modules */}
          <nav id="desktop-nav" className="hidden md:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  id={`nav-item-${item.route.substring(1)}`}
                  onClick={() => navigateTo(item.route)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium tracking-normal transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700 font-semibold' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Controls: Mode Toggle & Profile Avatar & Mobile Dropdown */}
          <div className="flex items-center gap-2.5">
            
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* User Profile Trigger Button */}
            <button
              id="profile-trigger-btn"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-all text-left cursor-pointer"
            >
              <UserAvatar
                name={user.displayName}
                avatarUrl={user.avatarUrl}
                size="sm"
              />
              <span className="hidden sm:inline text-xs font-semibold text-zinc-300 max-w-[80px] truncate">
                {user.displayName.split(' ')[0]}
              </span>
            </button>

            {/* Mobile Switcher Drawer/Dropdown Trigger */}
            <div className="relative md:hidden" ref={mobileMenuRef}>
              <button
                id="mobile-switcher-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center gap-1.5 p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-all cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mobile Dropdown Menu */}
              {isMobileMenuOpen && (
                <div 
                  id="mobile-navigation-dropdown"
                  className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1.5"
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 mb-1 pb-1">
                    Modules Switcher
                  </div>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentRoute === item.route;
                    return (
                      <button
                        key={item.route}
                        onClick={() => navigateTo(item.route)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                          isActive 
                            ? 'bg-zinc-800 text-zinc-100 font-semibold' 
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Profile Side Drawer */}
      <ProfileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
