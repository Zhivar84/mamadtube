/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MessageCircle, 
  Repeat2, 
  Heart, 
  Bookmark, 
  Share2, 
  BadgeCheck, 
  Sparkles, 
  MoreHorizontal, 
  Check, 
  Link as LinkIcon, 
  Trash2 
} from 'lucide-react';
import { motion } from 'motion/react';
import { SocialPost, SocialUserProfile, PostComment, CommentReply } from '../../types/social';
import UserAvatar from '../common/UserAvatar';
import FormattedTweetText from './FormattedTweetText';
import MediaGrid from './MediaGrid';
import TweetComposer from './TweetComposer';

interface TweetDetailThreadProps {
  post: SocialPost;
  allPosts: SocialPost[];
  currentUser: SocialUserProfile;
  onBack: () => void;
  onLikeToggle: (postId: string) => void;
  onBookmarkToggle: (postId: string) => void;
  onRepost: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onLikeComment?: (postId: string, commentId: string) => void;
  onAddCommentReply?: (postId: string, commentId: string, replyText: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onDeletePost?: (postId: string) => void;
  onSelectPost: (post: SocialPost) => void;
  onTagClick?: (tag: string) => void;
  onMentionClick?: (handle: string) => void;
}

export default function TweetDetailThread({
  post,
  allPosts,
  currentUser,
  onBack,
  onLikeToggle,
  onBookmarkToggle,
  onRepost,
  onAddComment,
  onLikeComment,
  onAddCommentReply,
  onVotePoll,
  onDeletePost,
  onSelectPost,
  onTagClick,
  onMentionClick,
}: TweetDetailThreadProps) {
  const [replyText, setReplyText] = useState('');
  const [activeReplyToCommentId, setActiveReplyToCommentId] = useState<string | null>(null);
  const [commentReplyText, setCommentReplyText] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [likeAnimate, setLikeAnimate] = useState(false);

  // Find parent post if this post is a reply to another post
  const parentPost = post.replyToId ? allPosts.find((p) => p.id === post.replyToId) : null;

  const handleLike = () => {
    setLikeAnimate(true);
    setTimeout(() => setLikeAnimate(false), 500);
    onLikeToggle(post.id);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/social/status/${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onAddComment(post.id, replyText.trim());
    setReplyText('');
  };

  const handleNestedReplySubmit = (commentId: string) => {
    if (!commentReplyText.trim() || !onAddCommentReply) return;
    onAddCommentReply(post.id, commentId, commentReplyText.trim());
    setCommentReplyText('');
    setActiveReplyToCommentId(null);
  };

  const formattedDate = new Date(post.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' · ' + new Date(post.timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-zinc-100 text-lg leading-tight">Post</h1>
          <p className="text-xs text-zinc-500">Conversation thread</p>
        </div>
      </div>

      {/* Parent Post (if thread chain exists) */}
      {parentPost && (
        <div
          onClick={() => onSelectPost(parentPost)}
          className="p-4 border-b border-zinc-800/80 hover:bg-zinc-900/40 transition-colors cursor-pointer relative"
        >
          {/* Thread Connector Line */}
          <div className="absolute left-[34px] top-12 bottom-0 w-0.5 bg-zinc-700" />

          <div className="flex items-start gap-3">
            <UserAvatar name={parentPost.authorName} avatarUrl={parentPost.authorAvatar} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-bold text-zinc-100 text-sm">{parentPost.authorName}</span>
                <span className="text-zinc-500 text-xs">{parentPost.authorHandle}</span>
                <span className="text-zinc-600 text-xs">·</span>
                <span className="text-zinc-500 text-xs">{parentPost.createdAt}</span>
              </div>
              <FormattedTweetText
                text={parentPost.caption}
                onTagClick={onTagClick}
                onMentionClick={onMentionClick}
                className="text-sm text-zinc-300"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Tweet Large Detail */}
      <article className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950">
        {/* Author Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <UserAvatar name={post.authorName} avatarUrl={post.authorAvatar} size="lg" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-100 text-base hover:underline">{post.authorName}</span>
                {post.authorBadge === 'verified' && (
                  <BadgeCheck className="w-4 h-4 text-sky-400 fill-sky-400/20" />
                )}
                {post.authorBadge === 'creator' && (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-zinc-500 text-sm">{post.authorHandle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {(post.authorId === currentUser.id || post.authorHandle === currentUser.handle || currentUser.role === 'admin') && onDeletePost && (
              <button
                onClick={() => {
                  onDeletePost(post.id);
                  onBack();
                }}
                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer"
                title={currentUser.role === 'admin' && post.authorId !== currentUser.id ? 'Delete Post (Admin)' : 'Delete Post'}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              title="Share post"
            >
              {copiedToast ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Caption */}
        <FormattedTweetText
          text={post.caption}
          onTagClick={onTagClick}
          onMentionClick={onMentionClick}
          className="text-base sm:text-lg text-zinc-100 leading-relaxed font-normal my-3 whitespace-pre-wrap"
        />

        {/* Poll */}
        {post.poll && (
          <div className="my-4 p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2.5">
            {post.poll.question && (
              <p className="text-sm font-semibold text-zinc-200 mb-1">{post.poll.question}</p>
            )}
            <div className="space-y-2">
              {post.poll.options.map((opt) => {
                const total = post.poll!.totalVotes || 0;
                const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                const isVoted = post.poll!.userVotedOptionId === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => onVotePoll && onVotePoll(post.id, opt.id)}
                    className={`w-full relative overflow-hidden text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isVoted ? 'border-sky-500 bg-sky-950/30' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950'
                    }`}
                  >
                    <div
                      style={{ width: `${pct}%` }}
                      className={`absolute inset-y-0 left-0 ${
                        isVoted ? 'bg-sky-500/25' : 'bg-zinc-800/60'
                      } transition-all duration-500`}
                    />
                    <div className="relative z-10 flex items-center justify-between text-sm font-medium">
                      <span className={`flex items-center gap-1.5 ${isVoted ? 'text-sky-300 font-bold' : 'text-zinc-200'}`}>
                        {opt.text}
                        {isVoted && <Check className="w-4 h-4 text-sky-400" />}
                      </span>
                      <span className="font-mono text-zinc-400 font-semibold">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>{post.poll.totalVotes.toLocaleString()} votes</span>
              <span>{post.poll.expiresAt}</span>
            </div>
          </div>
        )}

        {/* Media Grid */}
        <MediaGrid media={post.media} />

        {/* Timestamp & Meta */}
        <div className="py-3 border-b border-zinc-800 text-xs text-zinc-500 flex items-center gap-2">
          <span>{formattedDate}</span>
          <span>·</span>
          <span className="text-zinc-400 font-medium">
            {((post.likesCount * 12) + 340).toLocaleString()} Views
          </span>
        </div>

        {/* Stats Row (Reposts, Likes, Bookmarks) */}
        <div className="py-3 border-b border-zinc-800 flex items-center gap-6 text-xs text-zinc-400">
          <div>
            <strong className="text-zinc-100 font-bold">{post.repostsCount || 0}</strong> Reposts
          </div>
          <div>
            <strong className="text-zinc-100 font-bold">{post.likesCount || 0}</strong> Likes
          </div>
          <div>
            <strong className="text-zinc-100 font-bold">{post.commentsCount || 0}</strong> Replies
          </div>
        </div>

        {/* Large Action Bar */}
        <div className="py-2 flex items-center justify-around text-zinc-400 border-b border-zinc-800">
          <button
            title="Reply"
            className="p-2.5 hover:text-sky-400 hover:bg-sky-500/10 rounded-full transition-colors cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          <button
            onClick={() => onRepost(post.id)}
            title="Repost"
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              post.isReposted ? 'text-emerald-400 bg-emerald-500/10' : 'hover:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <Repeat2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleLike}
            title="Like"
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              post.isLiked ? 'text-rose-500 bg-rose-500/10' : 'hover:text-rose-500 hover:bg-rose-500/10'
            }`}
          >
            <motion.div animate={likeAnimate ? { scale: [1, 1.4, 1] } : { scale: 1 }}>
              <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            </motion.div>
          </button>

          <button
            onClick={() => onBookmarkToggle(post.id)}
            title="Bookmark"
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              post.isBookmarked ? 'text-sky-400 bg-sky-500/10' : 'hover:text-sky-400 hover:bg-sky-500/10'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${post.isBookmarked ? 'fill-sky-400 text-sky-400' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            title="Share"
            className="p-2.5 hover:text-sky-400 hover:bg-sky-500/10 rounded-full transition-colors cursor-pointer"
          >
            {copiedToast ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Inline Thread Reply Input Box */}
        <form onSubmit={handleCommentSubmit} className="mt-4 flex items-start gap-3">
          <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} size="md" />
          <div className="flex-1 min-w-0">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Post your reply..."
              rows={2}
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 p-3 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs rounded-full transition-colors cursor-pointer"
              >
                Reply
              </button>
            </div>
          </div>
        </form>
      </article>

      {/* Conversation Comments / Replies List */}
      <div className="divide-y divide-zinc-800/60">
        {post.comments && post.comments.length > 0 ? (
          post.comments.map((comment) => (
            <div key={comment.id} className="p-4 hover:bg-zinc-900/30 transition-colors">
              <div className="flex items-start gap-3">
                <UserAvatar name={comment.authorName} avatarUrl={comment.authorAvatar} size="md" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-zinc-200 text-sm">{comment.authorName}</span>
                      <span className="text-zinc-500 text-xs">{comment.authorHandle}</span>
                      <span className="text-zinc-600 text-xs">·</span>
                      <span className="text-zinc-500 text-xs">{comment.createdAt}</span>
                    </div>
                  </div>

                  <FormattedTweetText
                    text={comment.content}
                    onTagClick={onTagClick}
                    onMentionClick={onMentionClick}
                    className="text-sm text-zinc-200 leading-relaxed"
                  />

                  {/* Comment Action Bar */}
                  <div className="mt-2.5 flex items-center gap-6 text-zinc-500 text-xs">
                    <button
                      onClick={() =>
                        setActiveReplyToCommentId(
                          activeReplyToCommentId === comment.id ? null : comment.id
                        )
                      }
                      className="hover:text-sky-400 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>

                    <button
                      onClick={() => onLikeComment && onLikeComment(post.id, comment.id)}
                      className={`hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors ${
                        comment.isLiked ? 'text-rose-500 font-semibold' : ''
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-rose-500' : ''}`} />
                      <span>{comment.likesCount || 0}</span>
                    </button>
                  </div>

                  {/* Nested Reply Box */}
                  {activeReplyToCommentId === comment.id && (
                    <div className="mt-3 pl-3 border-l-2 border-zinc-800 space-y-2">
                      <input
                        type="text"
                        value={commentReplyText}
                        onChange={(e) => setCommentReplyText(e.target.value)}
                        placeholder={`Reply to ${comment.authorHandle}...`}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-sky-500 rounded-lg text-xs text-zinc-100 outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveReplyToCommentId(null)}
                          className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNestedReplySubmit(comment.id)}
                          disabled={!commentReplyText.trim()}
                          className="px-3 py-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs rounded-full cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nested Replies Rendering */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-zinc-800 space-y-3">
                      {comment.replies.map((nested) => (
                        <div key={nested.id} className="flex items-start gap-2.5 pt-1">
                          <UserAvatar name={nested.authorName} avatarUrl={nested.authorAvatar} size="xs" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-zinc-200">{nested.authorName}</span>
                              <span className="text-zinc-500">{nested.authorHandle}</span>
                              <span className="text-zinc-600">·</span>
                              <span className="text-zinc-500">{nested.createdAt}</span>
                            </div>
                            <p className="text-xs text-zinc-300 mt-0.5">{nested.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-zinc-500 text-xs">
            No replies yet. Be the first to join the conversation!
          </div>
        )}
      </div>
    </div>
  );
}
