/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Sparkles, BadgeCheck, X, TrendingUp, UserPlus, Check } from 'lucide-react';
import { TrendingTopic, RecommendedUser } from '../../types/social';
import UserAvatar from '../common/UserAvatar';

interface RightSidebarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  trendingTopics: TrendingTopic[];
  recommendedUsers: RecommendedUser[];
  onSelectTag: (tag: string) => void;
  onToggleFollowUser: (userId: string) => void;
}

export default function RightSidebar({
  searchQuery,
  onSearchChange,
  trendingTopics,
  recommendedUsers,
  onSelectTag,
  onToggleFollowUser,
}: RightSidebarProps) {
  return (
    <aside className="w-80 lg:w-88 flex-shrink-0 p-4 space-y-4 hidden lg:block border-l border-zinc-800/80 min-h-screen sticky top-0 self-start">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search MamadTube..."
          className="w-full pl-10 pr-9 py-2.5 bg-zinc-900 focus:bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-full text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Trends Panel */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-zinc-100 text-base flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            Trends for you
          </h2>
        </div>

        {trendingTopics.length > 0 ? (
          <div className="divide-y divide-zinc-800/60 -mx-4">
            {trendingTopics.map((trend) => (
              <div
                key={trend.id}
                onClick={() => onSelectTag(trend.tag)}
                className="px-4 py-3 hover:bg-zinc-800/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-0.5">
                  <span>{trend.category}</span>
                </div>
                <p className="font-bold text-zinc-200 text-sm hover:underline">{trend.topic}</p>
                <span className="text-[11px] text-zinc-500">{trend.postsCountFormatted}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-2">No trending topics right now.</p>
        )}
      </div>

      {/* Who to follow Panel */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
        <h2 className="font-extrabold text-zinc-100 text-base">Who to follow</h2>

        {recommendedUsers.length > 0 ? (
          <div className="divide-y divide-zinc-800/60 -mx-4">
            {recommendedUsers.map((user) => (
              <div
                key={user.id}
                className="px-4 py-3 hover:bg-zinc-800/40 transition-colors flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" className="flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-zinc-200 text-xs truncate hover:underline">{user.name}</span>
                      {user.badge === 'verified' && (
                        <BadgeCheck className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20 flex-shrink-0" />
                      )}
                      {user.badge === 'creator' && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs truncate">{user.handle}</p>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{user.bio}</p>
                  </div>
                </div>

                <button
                  onClick={() => onToggleFollowUser(user.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer flex-shrink-0 ${
                    user.isFollowing
                      ? 'bg-transparent border border-zinc-700 text-zinc-300 hover:border-rose-900/80 hover:text-rose-400 hover:bg-rose-950/20'
                      : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                  }`}
                >
                  {user.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-2">No creators found.</p>
        )}
      </div>

      {/* Subtle Footer Links */}
      <div className="px-2 text-[11px] text-zinc-500 space-x-2 leading-relaxed">
        <a href="#" className="hover:underline">Terms of Service</a>
        <span>·</span>
        <a href="#" className="hover:underline">Privacy Policy</a>
        <span>·</span>
        <a href="#" className="hover:underline">Cookie Policy</a>
        <span>·</span>
        <a href="#" className="hover:underline">Accessibility</a>
        <span>·</span>
        <span>© 2026 MamadTube</span>
      </div>
    </aside>
  );
}
