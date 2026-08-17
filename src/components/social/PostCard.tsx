/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  MoreHorizontal,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SocialPost, SocialUserProfile } from '../../types/social';
import CommentSection from './CommentSection';

interface PostCardProps {
  key?: string;
  post: SocialPost;
  currentUser: SocialUserProfile;
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onAddReply: (postId: string, commentId: string, content: string) => void;
  onToggleCommentLike: (postId: string, commentId: string) => void;
  onToggleReplyLike: (postId: string, commentId: string, replyId: string) => void;
  onTagClick?: (tag: string) => void;
  onAuthorClick?: (authorId: string) => void;
}

export default function PostCard({
  post,
  currentUser,
  onToggleLike,
  onToggleBookmark,
  onAddComment,
  onAddReply,
  onToggleCommentLike,
  onToggleReplyLike,
  onTagClick,
  onAuthorClick
}: PostCardProps): React.JSX.Element {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showLikeHeartAnim, setShowLikeHeartAnim] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const lastTapRef = useRef<number>(0);

  const handleMediaDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!post.isLiked) {
        onToggleLike(post.id);
      }
      setShowLikeHeartAnim(true);
      setTimeout(() => setShowLikeHeartAnim(false), 800);
    }
    lastTapRef.current = now;
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/social#${post.id}`);
    }
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2500);
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlideIndex < post.media.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  // Format caption text highlighting #hashtags
  const renderCaptionWithHashtags = (caption: string) => {
    const parts = caption.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const cleanTag = part.slice(1).toLowerCase();
        return (
          <button
            key={index}
            onClick={() => onTagClick && onTagClick(cleanTag)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold inline hover:underline mr-1"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part} </span>;
    });
  };

  const aspectRatioClassMap = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '16:9': 'aspect-video'
  };

  const currentMedia = post.media[currentSlideIndex];

  return (
    <div 
      id={`post-card-${post.id}`}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:shadow-md"
    >
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onAuthorClick && onAuthorClick(post.authorId)}
            className="relative group focus:outline-none"
          >
            {post.authorAvatar && post.authorAvatar.trim() !== '' ? (
              <img 
                src={post.authorAvatar} 
                alt={post.authorName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-indigo-300 transition-all"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm ring-2 ring-slate-100 group-hover:ring-indigo-300 transition-all">
                {post.authorName?.charAt(0) || 'U'}
              </div>
            )}
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => onAuthorClick && onAuthorClick(post.authorId)}
                className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
              >
                {post.authorName}
              </button>

              {post.authorBadge === 'verified' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
              )}
              {post.authorBadge === 'creator' && (
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              )}

              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-400">{post.createdAt}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{post.authorHandle}</span>
              {post.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {post.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button 
          id={`post-menu-btn-${post.id}`}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Media Carousel / Single Media Frame */}
      {post.media && post.media.length > 0 && (
        <div 
          onClick={handleMediaDoubleTap}
          className={`relative w-full bg-slate-950 overflow-hidden select-none cursor-pointer flex items-center justify-center ${
            aspectRatioClassMap[post.aspectRatio || '4:5']
          }`}
        >
          {currentMedia.type === 'image' && currentMedia.url && currentMedia.url.trim() !== '' ? (
            <img 
              src={currentMedia.url} 
              alt={currentMedia.altText || post.caption} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300"
            />
          ) : currentMedia.type === 'video' && currentMedia.url && currentMedia.url.trim() !== '' ? (
            <div className="relative w-full h-full">
              <video 
                src={currentMedia.url}
                muted={isMuted}
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xs transition-colors"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <div className="w-full h-full p-8 flex items-center justify-center text-slate-400 text-xs text-center">
              {post.caption}
            </div>
          )}

          {/* Double-tap animated heart overlay */}
          <AnimatePresence>
            {showLikeHeartAnim && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.25, opacity: 1 }}
                exit={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <Heart className="w-24 h-24 text-white fill-rose-500 drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Carousel navigation buttons */}
          {post.media.length > 1 && (
            <>
              {currentSlideIndex > 0 && (
                <button 
                  onClick={prevSlide}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/75 text-white rounded-full backdrop-blur-xs transition-all opacity-80 hover:opacity-100 shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {currentSlideIndex < post.media.length - 1 && (
                <button 
                  onClick={nextSlide}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/75 text-white rounded-full backdrop-blur-xs transition-all opacity-80 hover:opacity-100 shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Dots indicator */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
                {post.media.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentSlideIndex === idx ? 'bg-white w-4' : 'bg-white/50 w-1.5'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button
              id={`like-post-btn-${post.id}`}
              onClick={() => onToggleLike(post.id)}
              className="flex items-center gap-1.5 text-slate-700 hover:text-rose-600 transition-colors group"
            >
              <motion.div
                whileTap={{ scale: 0.8 }}
                animate={{ scale: post.isLiked ? [1, 1.3, 1] : 1 }}
                transition={{ duration: 0.2 }}
              >
                <Heart 
                  className={`w-5 h-5 transition-colors ${
                    post.isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-700 group-hover:text-rose-500'
                  }`} 
                />
              </motion.div>
              <span className={`text-xs font-semibold ${post.isLiked ? 'text-rose-600' : 'text-slate-700'}`}>
                {post.likesCount.toLocaleString()}
              </span>
            </button>

            {/* Comment Toggle Button */}
            <button
              id={`comment-toggle-btn-${post.id}`}
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-semibold">
                {post.comments.length > 0 ? post.comments.length : (post.commentsCount || 0)}
              </span>
            </button>

            {/* Share Button */}
            <button
              id={`share-post-btn-${post.id}`}
              onClick={handleShare}
              className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 transition-colors relative"
              title="Share link"
            >
              <Share2 className="w-5 h-5" />
              {post.sharesCount > 0 && (
                <span className="text-xs font-semibold text-slate-600">{post.sharesCount}</span>
              )}

              {/* Toast Feedback */}
              <AnimatePresence>
                {showShareToast && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg whitespace-nowrap z-30"
                  >
                    Link copied to clipboard!
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            id={`bookmark-post-btn-${post.id}`}
            onClick={() => onToggleBookmark(post.id)}
            className="text-slate-700 hover:text-amber-600 transition-colors"
            title="Save post"
          >
            <Bookmark 
              className={`w-5 h-5 transition-colors ${
                post.isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-slate-700 hover:text-amber-500'
              }`} 
            />
          </button>
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="text-xs text-slate-800 leading-relaxed">
            <span className="font-semibold text-slate-900 mr-2">{post.authorName}</span>
            {renderCaptionWithHashtags(post.caption)}
          </div>
        )}

        {/* Tag pills */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map(tag => (
              <button
                key={tag}
                onClick={() => onTagClick && onTagClick(tag)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-medium rounded-md transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Comments Section Toggle View */}
        {showComments ? (
          <CommentSection 
            comments={post.comments}
            currentUser={currentUser}
            onAddComment={(content) => onAddComment(post.id, content)}
            onAddReply={(commentId, content) => onAddReply(post.id, commentId, content)}
            onToggleCommentLike={(commentId) => onToggleCommentLike(post.id, commentId)}
            onToggleReplyLike={(commentId, replyId) => onToggleReplyLike(post.id, commentId, replyId)}
          />
        ) : (
          post.comments.length > 0 && (
            <button
              onClick={() => setShowComments(true)}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors block pt-1"
            >
              View all {post.comments.length} comments
            </button>
          )
        )}
      </div>
    </div>
  );
}
