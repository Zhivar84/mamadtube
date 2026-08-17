/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Grid, 
  Bookmark, 
  Heart, 
  MessageCircle, 
  MapPin, 
  Link as LinkIcon, 
  Calendar, 
  Layers, 
  Film,
  Edit3,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { SocialPost, SocialUserProfile } from '../../types/social';

interface ProfileGridViewProps {
  user: SocialUserProfile;
  posts: SocialPost[];
  currentUser: SocialUserProfile;
  onPostSelect: (post: SocialPost) => void;
  onFollowToggle?: (userId: string) => void;
}

export default function ProfileGridView({
  user,
  posts,
  currentUser,
  onPostSelect,
  onFollowToggle
}: ProfileGridViewProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const isOwnProfile = user.id === currentUser.id;

  const userPosts = posts.filter(p => p.authorId === user.id);
  const savedPosts = posts.filter(p => p.isBookmarked);

  const displayPosts = activeTab === 'posts' ? userPosts : savedPosts;

  const handleFollowClick = () => {
    setIsFollowing(!isFollowing);
    if (onFollowToggle) onFollowToggle(user.id);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          {/* Avatar with gradient ring */}
          <div className="relative group flex-shrink-0">
            <div className="p-1 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shadow-md">
              {user.avatarUrl && user.avatarUrl.trim() !== '' ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-2xl border-2 border-white">
                  {user.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">{user.name}</h2>
                <p className="text-sm font-medium text-slate-500">{user.handle}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center md:justify-end gap-2.5">
                {isOwnProfile ? (
                  <button 
                    id="edit-profile-btn"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                ) : (
                  <button
                    id="follow-toggle-btn"
                    onClick={handleFollowClick}
                    className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                      isFollowing
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Follow
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Counts Counter Bar */}
            <div className="flex items-center justify-center md:justify-start gap-8 py-2 border-y border-slate-100">
              <div className="text-center md:text-left">
                <span className="block text-base font-bold text-slate-900">{userPosts.length}</span>
                <span className="text-xs text-slate-500">posts</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-base font-bold text-slate-900">
                  {user.followersCount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-base font-bold text-slate-900">
                  {user.followingCount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">following</span>
              </div>
            </div>

            {/* Bio & Meta */}
            <div className="space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed max-w-xl">
                {user.bio}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-500 pt-1">
                {user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {user.location}
                  </span>
                )}
                {user.website && (
                  <a 
                    href={user.website} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {user.joinedDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Tabs: Posts vs Saved */}
      <div className="flex justify-center border-b border-slate-200">
        <button
          id="profile-tab-posts-btn"
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'posts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Grid className="w-4 h-4" /> Posts ({userPosts.length})
        </button>

        {isOwnProfile && (
          <button
            id="profile-tab-saved-btn"
            onClick={() => setActiveTab('saved')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'saved'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Bookmark className="w-4 h-4" /> Saved ({savedPosts.length})
          </button>
        )}
      </div>

      {/* 3-Column Photo Grid */}
      {displayPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            {activeTab === 'posts' ? <Grid className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
          </div>
          <p className="text-sm font-medium text-slate-700">
            {activeTab === 'posts' ? 'No posts yet' : 'No saved posts'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'posts' 
              ? 'Share photos and videos to see them listed in your grid.' 
              : 'Bookmark posts from your feed to view them later here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 md:gap-4">
          {displayPosts.map((post) => {
            const firstMedia = post.media && post.media[0];
            const isMultiMedia = post.media && post.media.length > 1;
            const isVideo = firstMedia && firstMedia.type === 'video';

            return (
              <div
                key={post.id}
                id={`grid-item-${post.id}`}
                onClick={() => onPostSelect(post)}
                className="group relative aspect-square bg-slate-900 rounded-lg md:rounded-xl overflow-hidden cursor-pointer shadow-xs"
              >
                {/* Media Image / Video Poster */}
                {firstMedia && firstMedia.url && firstMedia.url.trim() !== '' ? (
                  firstMedia.type === 'image' ? (
                    <img 
                      src={firstMedia.url} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <video 
                      src={firstMedia.url}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full p-4 bg-indigo-900/40 flex items-center justify-center text-xs text-slate-200 text-center">
                    {post.caption.substring(0, 60)}...
                  </div>
                )}

                {/* Multi-media / Video Badges in Top Right */}
                <div className="absolute top-2 right-2 text-white drop-shadow-md pointer-events-none">
                  {isMultiMedia && (
                    <div className="p-1 bg-black/40 rounded-md backdrop-blur-xs">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isVideo && !isMultiMedia && (
                    <div className="p-1 bg-black/40 rounded-md backdrop-blur-xs">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Dark Hover Overlay with Likes & Comments count */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white font-bold text-sm">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4 fill-white" />
                    <span>{post.likesCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>{post.comments.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
