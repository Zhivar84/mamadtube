/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Sparkles, 
  Search, 
  Flame, 
  Bookmark, 
  Grid, 
  X, 
  TrendingUp, 
  RefreshCw, 
  SlidersHorizontal,
  Feather,
  ArrowLeft,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SocialPost, 
  SocialUserProfile, 
  TrendingTopic, 
  RecommendedUser 
} from '../../types/social';
import { 
  INITIAL_SOCIAL_POSTS, 
  TRENDING_TOPICS, 
  RECOMMENDED_USERS 
} from '../../data/socialSeedData';
import { useApp } from '../../context/AppContext';
import TweetComposer from './TweetComposer';
import TweetCard from './TweetCard';
import TweetDetailThread from './TweetDetailThread';
import RightSidebar from './RightSidebar';
import UserAvatar from '../common/UserAvatar';

const STORAGE_KEY_POSTS = 'mamadtube_social_posts_v3';
const STORAGE_KEY_FOLLOWS = 'mamadtube_social_follows_v3';

export default function SocialFeed() {
  const { auth } = useApp();
  const authUser = auth.user;

  const currentUser: SocialUserProfile = {
    id: authUser?.id || 'usr_me',
    name: authUser?.displayName || 'User',
    handle: authUser?.handle || '@user',
    avatarUrl: authUser?.avatarUrl || '',
    badge: authUser?.badge || 'verified',
    role: authUser?.role || 'user',
    bio: authUser?.bio || '',
    location: 'Global Hub',
    website: '',
    joinedDate: authUser?.createdAt
      ? `Joined ${new Date(authUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
      : 'Joined 2026',
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  };

  const [posts, setPosts] = useState<SocialPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved social posts', e);
    }
    return [];
  });

  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOLLOWS);
      if (saved) return JSON.parse(saved);
      // Populate from registered users if available
      const registered = localStorage.getItem('portal_registered_users');
      if (registered) {
        const users = JSON.parse(registered);
        return users
          .filter((u: any) => u.id !== authUser?.id && u.email !== authUser?.email)
          .map((u: any) => ({
            id: u.id,
            name: u.displayName,
            handle: u.handle,
            avatarUrl: u.avatarUrl,
            bio: u.bio || 'Hub Community Member',
            badge: u.badge || 'verified',
            isFollowing: false,
          }));
      }
    } catch (e) {
      console.error('Failed to load recommended users', e);
    }
    return [];
  });

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'for_you' | 'following' | 'bookmarks'>('for_you');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [quoteTargetPost, setQuoteTargetPost] = useState<SocialPost | null>(null);
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts));
    } catch (e) {
      console.error('Failed to persist social posts', e);
    }
  }, [posts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FOLLOWS, JSON.stringify(recommendedUsers));
    } catch (e) {
      console.error('Failed to persist recommended users', e);
    }
  }, [recommendedUsers]);

  // Handle URL hashtag or route params if any
  const selectedPost = posts.find((p) => p.id === selectedPostId);

  // Filter & Search computation
  const filteredPosts = React.useMemo(() => {
    let list = [...posts];

    if (activeTab === 'following') {
      // Filter posts from followed users or current user
      const followedHandles = new Set(
        recommendedUsers.filter((u) => u.isFollowing).map((u) => u.handle)
      );
      followedHandles.add(currentUser.handle);
      list = list.filter((p) => followedHandles.has(p.authorHandle));
    } else if (activeTab === 'bookmarks') {
      list = list.filter((p) => p.isBookmarked);
    }

    if (selectedTag) {
      const clean = selectedTag.toLowerCase().replace(/^#/, '');
      list = list.filter((p) => p.tags && p.tags.some((t) => t.toLowerCase() === clean));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.caption.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.authorHandle.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sort by timestamp desc
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [posts, activeTab, selectedTag, searchQuery, recommendedUsers, currentUser]);

  const displayedPosts = filteredPosts.slice(0, visibleCount);
  const hasMorePosts = visibleCount < filteredPosts.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 5);
      setIsLoadingMore(false);
    }, 400);
  };

  // Action Handlers
  const handleCreatePost = (newPostData: Partial<SocialPost>) => {
    const newPost: SocialPost = {
      id: 'tweet_' + Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorHandle: currentUser.handle,
      authorAvatar: currentUser.avatarUrl,
      authorBadge: currentUser.badge,
      createdAt: 'Just now',
      timestamp: Date.now(),
      caption: newPostData.caption || '',
      media: newPostData.media || [],
      tags: newPostData.tags || [],
      likesCount: 0,
      isLiked: false,
      isBookmarked: false,
      repostsCount: 0,
      isReposted: false,
      commentsCount: 0,
      sharesCount: 0,
      poll: newPostData.poll,
      quotedPost: quoteTargetPost || undefined,
      replyToId: newPostData.replyToId,
      replyToHandle: newPostData.replyToHandle,
      comments: [],
    };

    setPosts((prev) => [newPost, ...prev]);
    setQuoteTargetPost(null);
    setIsMobileComposerOpen(false);
  };

  const handleLikeToggle = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likesCount: Math.max(0, p.likesCount + (isLiked ? 1 : -1)),
          };
        }
        return p;
      })
    );
  };

  const handleBookmarkToggle = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, isBookmarked: !p.isBookmarked };
        }
        return p;
      })
    );
  };

  const handleRepost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isReposted = !p.isReposted;
          return {
            ...p,
            isReposted,
            repostsCount: Math.max(0, (p.repostsCount || 0) + (isReposted ? 1 : -1)),
            repostedBy: isReposted
              ? { id: currentUser.id, name: currentUser.name, handle: currentUser.handle }
              : undefined,
          };
        }
        return p;
      })
    );
  };

  const handleQuotePost = (postToQuote: SocialPost) => {
    setQuoteTargetPost(postToQuote);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedPostId === postId) {
      setSelectedPostId(null);
    }
  };

  const handleVotePoll = (postId: string, optionId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId && p.poll) {
          // If already voted, ignore
          if (p.poll.userVotedOptionId) return p;

          const updatedOptions = p.poll.options.map((opt) => {
            if (opt.id === optionId) {
              return { ...opt, votes: opt.votes + 1 };
            }
            return opt;
          });

          return {
            ...p,
            poll: {
              ...p.poll,
              options: updatedOptions,
              totalVotes: p.poll.totalVotes + 1,
              userVotedOptionId: optionId,
            },
          };
        }
        return p;
      })
    );
  };

  const handleAddComment = (postId: string, commentText: string) => {
    const newComment = {
      id: 'c_' + Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorHandle: currentUser.handle,
      authorAvatar: currentUser.avatarUrl,
      authorBadge: currentUser.badge,
      content: commentText,
      createdAt: 'Just now',
      timestamp: Date.now(),
      likesCount: 0,
      isLiked: false,
      replies: [],
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: (p.commentsCount || 0) + 1,
            comments: [newComment, ...(p.comments || [])],
          };
        }
        return p;
      })
    );
  };

  const handleLikeComment = (postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: (p.comments || []).map((c) => {
              if (c.id === commentId) {
                const isLiked = !c.isLiked;
                return {
                  ...c,
                  isLiked,
                  likesCount: Math.max(0, c.likesCount + (isLiked ? 1 : -1)),
                };
              }
              return c;
            }),
          };
        }
        return p;
      })
    );
  };

  const handleAddCommentReply = (postId: string, commentId: string, replyText: string) => {
    const newReply = {
      id: 'r_' + Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorHandle: currentUser.handle,
      authorAvatar: currentUser.avatarUrl,
      authorBadge: currentUser.badge,
      content: replyText,
      createdAt: 'Just now',
      timestamp: Date.now(),
      likesCount: 0,
      isLiked: false,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: (p.commentsCount || 0) + 1,
            comments: (p.comments || []).map((c) => {
              if (c.id === commentId) {
                return {
                  ...c,
                  replies: [...(c.replies || []), newReply],
                };
              }
              return c;
            }),
          };
        }
        return p;
      })
    );
  };

  const handleToggleFollowUser = (userId: string) => {
    setRecommendedUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return { ...u, isFollowing: !u.isFollowing };
        }
        return u;
      })
    );
  };

  const handleSelectTag = (tag: string) => {
    setSelectedTag(tag);
    setSelectedPostId(null);
  };

  const handleMentionClick = (handle: string) => {
    setSearchQuery(handle);
    setSelectedPostId(null);
  };

  return (
    <div className="flex justify-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Central Timeline Column */}
      <main className="w-full max-w-2xl min-h-screen border-x border-zinc-800/80 flex flex-col">
        {selectedPostId && selectedPost ? (
          /* Detailed Thread View */
          <TweetDetailThread
            post={selectedPost}
            allPosts={posts}
            currentUser={currentUser}
            onBack={() => setSelectedPostId(null)}
            onLikeToggle={handleLikeToggle}
            onBookmarkToggle={handleBookmarkToggle}
            onRepost={handleRepost}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onAddCommentReply={handleAddCommentReply}
            onVotePoll={handleVotePoll}
            onDeletePost={handleDeletePost}
            onSelectPost={(post) => setSelectedPostId(post.id)}
            onTagClick={handleSelectTag}
            onMentionClick={handleMentionClick}
          />
        ) : (
          /* Main Timeline Feed View */
          <>
            {/* Top Navigation Tabs Header */}
            <header className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80">
              <div className="px-4 py-3 flex items-center justify-between">
                <h1 className="font-extrabold text-lg text-zinc-100 tracking-tight">Home</h1>
                <div className="flex items-center gap-2">
                  <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} size="sm" />
                </div>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-3 text-center border-t border-zinc-800/40 text-sm font-bold">
                <button
                  onClick={() => {
                    setActiveTab('for_you');
                    setSelectedTag(null);
                  }}
                  className={`py-3.5 hover:bg-zinc-900/50 transition-colors relative cursor-pointer ${
                    activeTab === 'for_you' && !selectedTag ? 'text-zinc-100' : 'text-zinc-500'
                  }`}
                >
                  <span>For you</span>
                  {activeTab === 'for_you' && !selectedTag && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 inset-x-0 mx-auto w-14 h-1 bg-sky-500 rounded-full"
                    />
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab('following');
                    setSelectedTag(null);
                  }}
                  className={`py-3.5 hover:bg-zinc-900/50 transition-colors relative cursor-pointer ${
                    activeTab === 'following' && !selectedTag ? 'text-zinc-100' : 'text-zinc-500'
                  }`}
                >
                  <span>Following</span>
                  {activeTab === 'following' && !selectedTag && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 inset-x-0 mx-auto w-14 h-1 bg-sky-500 rounded-full"
                    />
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab('bookmarks');
                    setSelectedTag(null);
                  }}
                  className={`py-3.5 hover:bg-zinc-900/50 transition-colors relative cursor-pointer ${
                    activeTab === 'bookmarks' && !selectedTag ? 'text-zinc-100' : 'text-zinc-500'
                  }`}
                >
                  <span>Bookmarks</span>
                  {activeTab === 'bookmarks' && !selectedTag && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 inset-x-0 mx-auto w-14 h-1 bg-sky-500 rounded-full"
                    />
                  )}
                </button>
              </div>

              {/* Active Filter Chips */}
              {(selectedTag || searchQuery) && (
                <div className="px-4 py-2 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Filtering by:</span>
                    {selectedTag && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold">
                        #{selectedTag}
                        <button
                          onClick={() => setSelectedTag(null)}
                          className="hover:text-white cursor-pointer ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 font-medium">
                        "{searchQuery}"
                        <button
                          onClick={() => setSearchQuery('')}
                          className="hover:text-white cursor-pointer ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTag(null);
                      setSearchQuery('');
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </header>

            {/* Quoted Post Notice in Composer */}
            {quoteTargetPost && (
              <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span>Quoting</span>
                  <strong className="text-sky-400">{quoteTargetPost.authorHandle}</strong>
                  <span className="text-zinc-500 truncate max-w-xs">"{quoteTargetPost.caption}"</span>
                </div>
                <button
                  onClick={() => setQuoteTargetPost(null)}
                  className="text-zinc-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tweet Composer Pinned Top */}
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-950">
              <TweetComposer
                currentUser={currentUser}
                onPostCreated={handleCreatePost}
                placeholder="What is happening?!"
              />
            </div>

            {/* Vertical Timeline Feed */}
            <div className="divide-y divide-zinc-800/80 flex-1">
              {displayedPosts.length > 0 ? (
                displayedPosts.map((post) => (
                  <TweetCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onLikeToggle={handleLikeToggle}
                    onBookmarkToggle={handleBookmarkToggle}
                    onRepost={handleRepost}
                    onQuotePost={handleQuotePost}
                    onDeletePost={handleDeletePost}
                    onVotePoll={handleVotePoll}
                    onAddComment={handleAddComment}
                    onSelectPost={(p) => setSelectedPostId(p.id)}
                    onTagClick={handleSelectTag}
                    onMentionClick={handleMentionClick}
                  />
                ))
              ) : (
                <div className="p-12 text-center text-zinc-500 space-y-3 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                    <MessageSquare className="w-6 h-6 text-zinc-500" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-300">
                    {searchQuery || selectedTag
                      ? 'No posts matched your search filters.'
                      : activeTab === 'bookmarks'
                      ? 'No bookmarks yet'
                      : 'No posts yet. Be the first to share something!'}
                  </p>
                  <p className="text-xs text-zinc-500 max-w-xs">
                    {searchQuery || selectedTag
                      ? 'Try adjusting your search query or removing the filter tag.'
                      : activeTab === 'bookmarks'
                      ? 'Bookmark posts you want to refer back to later.'
                      : 'Share an update, attach media, or run a poll using the composer above.'}
                  </p>
                </div>
              )}

              {/* Load More Trigger */}
              {hasMorePosts && (
                <div className="p-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-sky-400 rounded-full transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isLoadingMore && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isLoadingMore ? 'Loading posts...' : 'Show more posts'}</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Right Sidebar: Trends & Recommendations */}
      <RightSidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        trendingTopics={TRENDING_TOPICS}
        recommendedUsers={recommendedUsers}
        onSelectTag={handleSelectTag}
        onToggleFollowUser={handleToggleFollowUser}
      />

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden z-40">
        <button
          onClick={() => setIsMobileComposerOpen(true)}
          className="w-14 h-14 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-2xl transition-transform active:scale-95 cursor-pointer"
        >
          <Feather className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Composer Modal */}
      <AnimatePresence>
        {isMobileComposerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setIsMobileComposerOpen(false)}
                className="text-zinc-400 hover:text-white p-2"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-zinc-100">Compose Tweet</h2>
              <div className="w-8" />
            </div>

            <div className="flex-1">
              <TweetComposer
                currentUser={currentUser}
                onPostCreated={handleCreatePost}
                placeholder="What is happening?!"
                onCancel={() => setIsMobileComposerOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
