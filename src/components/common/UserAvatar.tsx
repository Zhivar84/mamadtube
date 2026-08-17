/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'offline' | 'live';
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base font-semibold',
  xl: 'w-16 h-16 text-lg font-bold'
};

const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
};

const STATUS_SIZES = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5'
};

// Deterministic subtle dark bg accent based on name
function getSubtleAccent(name: string = ''): string {
  const colors = [
    'bg-zinc-800 text-zinc-200 border-zinc-700',
    'bg-indigo-950/70 text-indigo-300 border-indigo-800/60',
    'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
    'bg-cyan-950/70 text-cyan-300 border-cyan-800/60',
    'bg-violet-950/70 text-violet-300 border-violet-800/60',
    'bg-amber-950/70 text-amber-300 border-amber-800/60'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserAvatar({
  name = 'User',
  avatarUrl,
  size = 'md',
  className = '',
  status
}: UserAvatarProps) {
  // Only render <img> if it is a valid non-empty URL
  const isUploadedImage = typeof avatarUrl === 'string' && avatarUrl.trim() !== '' && (
    avatarUrl.startsWith('data:image') || 
    avatarUrl.startsWith('blob:') || 
    avatarUrl.startsWith('/') || 
    avatarUrl.startsWith('http://') || 
    avatarUrl.startsWith('https://')
  );
  const initials = getInitials(name);
  const accentClass = getSubtleAccent(name);

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {isUploadedImage ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${SIZE_CLASSES[size]} rounded-full object-cover border border-zinc-800 shadow-xs`}
        />
      ) : (
        <div
          className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center font-medium border select-none transition-colors ${accentClass} shadow-xs`}
          title={name}
        >
          {initials ? (
            <span>{initials}</span>
          ) : (
            <User className={ICON_SIZES[size]} />
          )}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-zinc-950 ${STATUS_SIZES[size]} ${
            status === 'live' 
              ? 'bg-red-500 animate-pulse ring-1 ring-red-400/50' 
              : status === 'online' 
                ? 'bg-emerald-500' 
                : 'bg-zinc-600'
          }`}
        />
      )}
    </div>
  );
}
