/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useApp } from '../../context/AppContext';
import TweetComposer from './TweetComposer';
import TweetCard from './TweetCard';
import TweetDetailThread from './TweetDetailThread';
import RightSidebar from './RightSidebar';
import UserAvatar from '../common/UserAvatar';

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

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'for_you' | 'following' | 'bookmarks'>('for_you');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [quoteTargetPost, setQuoteTargetPost] = useState<SocialPost | null>(null);
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch real posts from server
  const loadPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      const params = new URLSearchParams();
      if (currentUser.id) params.append('userId', currentUser.id);
      if (selectedTag) params.append('tag', selectedTag);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/social/posts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Error loading posts from server:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [currentUser.id, selectedTag, searchQuery]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Fetch registered users dynamically from server
  useEffect(() => {
    let isMounted = true;
    fetch('/api/users')
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) return null;
        return res.json();
      })
      .then((data) => {
        if (isMounted && data && data.success && Array.isArray(data.users)) {
          setRecommendedUsers((prev) => {
            const followMap = new Map(prev.map((p) => [p.id, p.isFollowing]));
            return data.users
              .filter((u: any) => u.id !== authUser?.id && u.email !== authUser?.email && u.status !== 'banned')
              .map((u: any) => ({
                id: u.id,
                name: u.displayName || u.username || 'User',
                handle: u.handle || `@${(u.username || u.displayName || 'user').toLowerCase().replace(/\s+/g, '')}`,
                avatarUrl: u.avatarUrl || '',
                bio: u.bio || 'Hub Community Member',
                badge: u.badge || 'verified',
                isFollowing: Boolean(followMap.get(u.id)),
              }));
          });
        }
      })
      .catch((err) => console.warn('Could not load social peers:', err));

    return () => {
      isMounted = false;
    };
  }, [authUser?.id, authUser?.email]);

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
  const handleCreatePost = async (newPostData: Partial<SocialPost>) => {
    try {
      const payload = {
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatarUrl,
        authorBadge: currentUser.badge,
        caption: newPostData.caption || '',
        media: newPostData.media || [],
        tags: newPostData.tags || [],
        poll: newPostData.poll,
        quotedPost: quoteTargetPost || undefined,
        replyToId: newPostData.replyToId,
        replyToHandle: newPostData.replyToHandle,
      };

      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setPosts((prev) => [data.post, ...prev]);
        }
      }
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setQuoteTargetPost(null);
      setIsMobileComposerOpen(false);
    }
  };

  const handleLikeToggle = async (postId: string) => {
    // Optimistic UI update
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

    try {
      await fetch(`/api/social/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleBookmarkToggle = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, isBookmarked: !p.isBookmarked };
        }
        return p;
      })
    );

    try {
      await fetch(`/api/social/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const handleRepost = async (postId: string) => {
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

    try {
      await fetch(`/api/social/posts/${postId}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userHandle: currentUser.handle,
        }),
      });
    } catch (err) {
      console.error('Error reposting:', err);
    }
  };

  const handleQuotePost = (postToQuote: SocialPost) => {
    setQuoteTargetPost(postToQuote);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedPostId === postId) {
      setSelectedPostId(null);
    }

    try {
      await fetch(`/api/social/posts/${postId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleVotePoll = async (postId: string, optionId: string) => {
    const userId = currentUser.id;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId && p.poll) {
          const updatedOptions = p.poll.options.map((opt) => {
            const currentVotes: string[] = Array.isArray(opt.votes) ? opt.votes : [];
            const cleanVotes = currentVotes.filter((uId) => uId !== userId);
            if (opt.id === optionId) {
              return { ...opt, votes: [...cleanVotes, userId] };
            }
            return { ...opt, votes: cleanVotes };
          });

          const newTotalVotes = updatedOptions.reduce(
            (sum, opt) => sum + opt.votes.length,
            0
          );

          return {
            ...p,
            poll: {
              ...p.poll,
              options: updatedOptions,
              totalVotes: newTotalVotes,
            },
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/social/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, optionId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        }
      }
    } catch (err) {
      console.error('Error voting on poll:', err);
    }
  };

  const handleAddComment = async (postId: string, commentText: string) => {
    try {
      const payload = {
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatarUrl,
        authorBadge: currentUser.badge,
        content: commentText,
      };

      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        }
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
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

  const handleAddCommentReply = async (postId: string, commentId: string, replyText: string) => {
    try {
      const payload = {
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatarUrl,
        authorBadge: currentUser.badge,
        content: replyText,
        replyToCommentId: commentId,
      };

      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        }
      }
    } catch (err) {
      console.error('Error adding comment reply:', err);
    }
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

  const dynamicTrendingTopics: TrendingTopic[] = React.useMemo(() => {
    const tagMap = new Map<string, number>();
    posts.forEach((p) => {
      p.tags?.forEach((t) => {
        const clean = t.toLowerCase().replace(/^#/, '');
        tagMap.set(clean, (tagMap.get(clean) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count], idx) => ({
        id: `trend_${idx}_${tag}`,
        topic: `#${tag}`,
        tag: `#${tag}`,
        postsCount: count,
        postsCountFormatted: `${count} post${count > 1 ? 's' : ''}`,
        category: 'Trending in Tech',
      }));
  }, [posts]);

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
        trendingTopics={dynamicTrendingTopics}
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
