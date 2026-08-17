/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  MessageCircle, 
  Repeat2, 
  Heart, 
  Bookmark, 
  Share2, 
  MoreHorizontal, 
  Check, 
  Quote, 
  Trash2, 
  Link as LinkIcon, 
  BadgeCheck, 
  Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SocialPost, SocialUserProfile } from '../../types/social';
import UserAvatar from '../common/UserAvatar';
import FormattedTweetText from './FormattedTweetText';
import MediaGrid from './MediaGrid';
import TweetComposer from './TweetComposer';

interface TweetCardProps {
  key?: React.Key;
  post: SocialPost;
  currentUser: SocialUserProfile;
  onLikeToggle: (postId: string) => void;
  onBookmarkToggle: (postId: string) => void;
  onRepost: (postId: string) => void;
  onQuotePost?: (post: SocialPost) => void;
  onDeletePost?: (postId: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onAddComment?: (postId: string, commentText: string) => void;
  onSelectPost: (post: SocialPost) => void;
  onTagClick?: (tag: string) => void;
  onMentionClick?: (handle: string) => void;
  isDetailedView?: boolean;
}

export default function TweetCard({
  post,
  currentUser,
  onLikeToggle,
  onBookmarkToggle,
  onRepost,
  onQuotePost,
  onDeletePost,
  onVotePoll,
  onAddComment,
  onSelectPost,
  onTagClick,
  onMentionClick,
  isDetailedView = false,
}: TweetCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showInlineReply, setShowInlineReply] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [likeAnimate, setLikeAnimate] = useState(false);

  const isAuthor = post.authorId === currentUser.id || post.authorHandle === currentUser.handle;
  const isAdmin = currentUser.role === 'admin' || (currentUser as any).badge === 'verified' && (currentUser as any).role === 'admin';

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if not clicking interactive action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('video')) {
      return;
    }
    onSelectPost(post);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikeAnimate(true);
    setTimeout(() => setLikeAnimate(false), 500);
    onLikeToggle(post.id);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmarkToggle(post.id);
  };

  const handleRepostClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRepost(post.id);
    setShowRepostMenu(false);
  };

  const handleQuoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuotePost) {
      onQuotePost(post);
    }
    setShowRepostMenu(false);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/social/status/${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedToast(true);
    setShowMenu(false);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeletePost) {
      onDeletePost(post.id);
    }
    setShowMenu(false);
  };

  const handleVote = (e: React.MouseEvent, optionId: string) => {
    e.stopPropagation();
    if (onVotePoll) {
      onVotePoll(post.id, optionId);
    }
  };

  return (
    <article
      id={`tweet-${post.id}`}
      onClick={handleCardClick}
      className={`border-b border-zinc-800/80 hover:bg-zinc-900/40 transition-colors cursor-pointer ${
        isDetailedView ? 'p-4 sm:p-6 bg-zinc-900/20' : 'p-4 sm:p-4'
      }`}
    >
      {/* Repost Header Banner */}
      {post.repostedBy && (
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-2 pl-9">
          <Repeat2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {post.repostedBy.id === currentUser.id ? 'You' : post.repostedBy.name} reposted
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Author Avatar */}
        <div onClick={(e) => e.stopPropagation()}>
          <UserAvatar
            name={post.authorName}
            avatarUrl={post.authorAvatar}
            size={isDetailedView ? 'md' : 'md'}
            className="flex-shrink-0 mt-0.5"
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row: Author Name, Handle, Timestamp, Menu */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-bold text-zinc-100 text-sm sm:text-base hover:underline truncate">
                {post.authorName}
              </span>

              {post.authorBadge === 'verified' && (
                <BadgeCheck className="w-4 h-4 text-sky-400 fill-sky-400/20 flex-shrink-0" />
              )}
              {post.authorBadge === 'creator' && (
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              )}
              {post.authorBadge === 'pro' && (
                <span className="px-1 py-0.2 text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 rounded">
                  PRO
                </span>
              )}

              <span className="text-zinc-500 text-xs sm:text-sm truncate">
                {post.authorHandle}
              </span>
              <span className="text-zinc-600 text-xs">·</span>
              <span className="text-zinc-500 text-xs whitespace-nowrap hover:underline">
                {post.createdAt}
              </span>
            </div>

            {/* Post Options Menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 z-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 w-44">
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                    Copy link to post
                  </button>
                  <button
                    onClick={handleBookmark}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-zinc-400" />
                    {post.isBookmarked ? 'Remove Bookmark' : 'Bookmark Post'}
                  </button>
                  {(isAuthor || isAdmin) && onDeletePost && (
                    <button
                      id={`delete-tweet-${post.id}-btn`}
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer border-t border-zinc-800 mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      {isAdmin && !isAuthor ? 'Delete Post (Admin)' : 'Delete Post'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reply indicator */}
          {post.replyToHandle && (
            <div className="text-xs text-zinc-500 mb-1.5">
              Replying to <span className="text-sky-400">{post.replyToHandle}</span>
            </div>
          )}

          {/* Tweet Caption */}
          <FormattedTweetText
            text={post.caption}
            onTagClick={onTagClick}
            onMentionClick={onMentionClick}
            className={`text-zinc-100 leading-relaxed ${
              isDetailedView ? 'text-base sm:text-lg my-2 font-normal' : 'text-sm'
            }`}
          />

          {/* Poll Component (if post has poll) */}
          {post.poll && (
            <div className="mt-3 p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2" onClick={(e) => e.stopPropagation()}>
              {post.poll.question && (
                <p className="text-xs font-semibold text-zinc-300 mb-1">{post.poll.question}</p>
              )}
              <div className="space-y-1.5">
                {(() => {
                  const totalVotes = Array.isArray(post.poll.options)
                    ? post.poll.options.reduce(
                        (sum, opt) =>
                          sum +
                          (Array.isArray(opt.votes)
                            ? opt.votes.length
                            : typeof (opt as any).votes === 'number'
                            ? (opt as any).votes
                            : 0),
                        0
                      )
                    : post.poll.totalVotes || 0;

                  const hasUserVotedOnPoll =
                    Array.isArray(post.poll.options) &&
                    post.poll.options.some(
                      (opt) =>
                        Array.isArray(opt.votes) &&
                        (opt.votes.includes(currentUser.id) || opt.votes.includes(currentUser.handle))
                    );

                  return post.poll.options.map((opt) => {
                    const optVoteCount = Array.isArray(opt.votes)
                      ? opt.votes.length
                      : typeof (opt as any).votes === 'number'
                      ? (opt as any).votes
                      : 0;
                    const pct = totalVotes > 0 ? Math.round((optVoteCount / totalVotes) * 100) : 0;
                    const isVoted =
                      Array.isArray(opt.votes) &&
                      (opt.votes.includes(currentUser.id) || opt.votes.includes(currentUser.handle));

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={(e) => handleVote(e, opt.id)}
                        disabled={hasUserVotedOnPoll}
                        className={`w-full relative overflow-hidden text-left p-2.5 rounded-lg border transition-all ${
                          hasUserVotedOnPoll ? 'cursor-default' : 'cursor-pointer hover:border-sky-500/60'
                        } ${
                          isVoted
                            ? 'border-sky-500 bg-sky-950/30'
                            : hasUserVotedOnPoll
                            ? 'border-zinc-800/80 bg-zinc-900/40'
                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                        }`}
                      >
                        {/* Percentage background fill if user voted */}
                        {hasUserVotedOnPoll && (
                          <div
                            style={{ width: `${pct}%` }}
                            className={`absolute inset-y-0 left-0 ${
                              isVoted ? 'bg-sky-500/25' : 'bg-zinc-800/60'
                            } transition-all duration-500`}
                          />
                        )}

                        <div className="relative z-10 flex items-center justify-between text-xs font-medium">
                          <span className={`flex items-center gap-1.5 ${isVoted ? 'text-sky-300 font-bold' : 'text-zinc-200'}`}>
                            {opt.text}
                            {isVoted && <Check className="w-3.5 h-3.5 text-sky-400" />}
                          </span>
                          {hasUserVotedOnPoll ? (
                            <span className="font-mono text-zinc-400 font-semibold">{pct}%</span>
                          ) : (
                            <span className="text-[11px] text-zinc-500 font-normal">Vote</span>
                          )}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span>
                  {(
                    Array.isArray(post.poll.options)
                      ? post.poll.options.reduce(
                          (sum, opt) =>
                            sum +
                            (Array.isArray(opt.votes)
                              ? opt.votes.length
                              : typeof (opt as any).votes === 'number'
                              ? (opt as any).votes
                              : 0),
                          0
                        )
                      : post.poll.totalVotes || 0
                  ).toLocaleString()}{' '}
                  votes
                </span>
                <span>{post.poll.expiresAt || '1 day left'}</span>
              </div>
            </div>
          )}

          {/* Media Grid */}
          <MediaGrid media={post.media} />

          {/* Quoted Post (if present) */}
          {post.quotedPost && (
            <div className="mt-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-1.5 mb-1 text-xs">
                <UserAvatar name={post.quotedPost.authorName} avatarUrl={post.quotedPost.authorAvatar} size="xs" />
                <span className="font-bold text-zinc-200">{post.quotedPost.authorName}</span>
                <span className="text-zinc-500">{post.quotedPost.authorHandle}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">{post.quotedPost.createdAt}</span>
              </div>
              <p className="text-xs text-zinc-300 line-clamp-3">{post.quotedPost.caption}</p>
              {post.quotedPost.media && post.quotedPost.media.length > 0 && (
                <div className="mt-2 rounded-lg overflow-hidden max-h-36">
                  <img src={post.quotedPost.media[0].url} alt="Quoted media" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* Action Bar (Reply, Repost, Like, Bookmark, Share) */}
          <div className="mt-3 pt-2 flex items-center justify-between text-zinc-500 max-w-md" onClick={(e) => e.stopPropagation()}>
            {/* Reply */}
            <button
              onClick={() => setShowInlineReply(!showInlineReply)}
              title="Reply"
              className="flex items-center gap-1.5 text-xs hover:text-sky-400 group transition-colors cursor-pointer"
            >
              <div className="p-1.5 rounded-full group-hover:bg-sky-500/10 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-[11px]">{post.commentsCount || 0}</span>
            </button>

            {/* Repost */}
            <div className="relative">
              <button
                onClick={() => setShowRepostMenu(!showRepostMenu)}
                title="Repost"
                className={`flex items-center gap-1.5 text-xs group transition-colors cursor-pointer ${
                  post.isReposted ? 'text-emerald-400 font-semibold' : 'hover:text-emerald-400'
                }`}
              >
                <div className="p-1.5 rounded-full group-hover:bg-emerald-500/10 transition-colors">
                  <Repeat2 className="w-4 h-4" />
                </div>
                <span className="text-[11px]">{post.repostsCount || 0}</span>
              </button>

              {showRepostMenu && (
                <div className="absolute left-0 bottom-8 z-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 w-36">
                  <button
                    onClick={handleRepostClick}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer"
                  >
                    <Repeat2 className="w-3.5 h-3.5 text-emerald-400" />
                    {post.isReposted ? 'Undo Repost' : 'Repost'}
                  </button>
                  <button
                    onClick={handleQuoteClick}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer"
                  >
                    <Quote className="w-3.5 h-3.5 text-sky-400" />
                    Quote Post
                  </button>
                </div>
              )}
            </div>

            {/* Like with heart micro-animation */}
            <button
              onClick={handleLike}
              title="Like"
              className={`flex items-center gap-1.5 text-xs group transition-colors cursor-pointer ${
                post.isLiked ? 'text-rose-500 font-semibold' : 'hover:text-rose-500'
              }`}
            >
              <motion.div
                animate={likeAnimate ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="p-1.5 rounded-full group-hover:bg-rose-500/10 transition-colors"
              >
                <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </motion.div>
              <span className="text-[11px]">{post.likesCount || 0}</span>
            </button>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              title="Bookmark"
              className={`flex items-center gap-1.5 text-xs group transition-colors cursor-pointer ${
                post.isBookmarked ? 'text-sky-400' : 'hover:text-sky-400'
              }`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-sky-500/10 transition-colors">
                <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-sky-400 text-sky-400' : ''}`} />
              </div>
            </button>

            {/* Share / Copy link */}
            <button
              onClick={handleCopyLink}
              title="Share link"
              className="p-1.5 rounded-full hover:bg-sky-500/10 hover:text-sky-400 transition-colors cursor-pointer"
            >
              {copiedToast ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Inline Reply Composer */}
          <AnimatePresence>
            {showInlineReply && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <TweetComposer
                  currentUser={currentUser}
                  replyToPost={post}
                  isInlineReply={true}
                  placeholder="Post your reply"
                  onCancel={() => setShowInlineReply(false)}
                  onPostCreated={(replyPost) => {
                    if (onAddComment && replyPost.caption) {
                      onAddComment(post.id, replyPost.caption);
                    }
                    setShowInlineReply(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </article>
  );
}
