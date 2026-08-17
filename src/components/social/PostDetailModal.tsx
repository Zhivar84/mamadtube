/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  MapPin, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SocialPost, SocialUserProfile } from '../../types/social';
import CommentSection from './CommentSection';

interface PostDetailModalProps {
  post: SocialPost | null;
  currentUser: SocialUserProfile;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onAddReply: (postId: string, commentId: string, content: string) => void;
  onToggleCommentLike: (postId: string, commentId: string) => void;
  onToggleReplyLike: (postId: string, commentId: string, replyId: string) => void;
  onTagClick?: (tag: string) => void;
}

export default function PostDetailModal({
  post,
  currentUser,
  onClose,
  onToggleLike,
  onToggleBookmark,
  onAddComment,
  onAddReply,
  onToggleCommentLike,
  onToggleReplyLike,
  onTagClick
}: PostDetailModalProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);

  if (!post) return null;

  const currentMedia = post.media && post.media[currentSlideIndex];

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/social#${post.id}`);
    }
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
      >
        {/* Left Side: Media Carousel */}
        <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[350px] md:min-h-[550px]">
          {currentMedia && currentMedia.url && currentMedia.url.trim() !== '' ? (
            currentMedia.type === 'image' ? (
              <img 
                src={currentMedia.url} 
                alt="" 
                referrerPolicy="no-referrer"
                className="max-h-[85vh] w-full object-contain"
              />
            ) : (
              <video 
                src={currentMedia.url} 
                controls 
                autoPlay 
                className="max-h-[85vh] w-full object-contain"
              />
            )
          ) : (
            <div className="text-white p-8 text-center text-sm">{post.caption}</div>
          )}

          {/* Slide Navigation */}
          {post.media && post.media.length > 1 && (
            <>
              {currentSlideIndex > 0 && (
                <button 
                  onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {currentSlideIndex < post.media.length - 1 && (
                <button 
                  onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Right Side: Header, Caption, Comments, Actions */}
        <div className="md:w-2/5 flex flex-col justify-between h-full bg-white divide-y divide-slate-100 max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              {post.authorAvatar && post.authorAvatar.trim() !== '' ? (
                <img 
                  src={post.authorAvatar} 
                  alt={post.authorName} 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm ring-2 ring-slate-100">
                  {post.authorName?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900">{post.authorName}</h4>
                  {post.authorBadge === 'verified' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
                  )}
                  {post.authorBadge === 'creator' && (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>{post.authorHandle}</span>
                  {post.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-slate-500">
                        <MapPin className="w-3 h-3" /> {post.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button 
              id="close-post-detail-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Middle: Caption & Comments */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {/* Caption */}
            <div className="flex items-start gap-3">
              {post.authorAvatar && post.authorAvatar.trim() !== '' ? (
                <img 
                  src={post.authorAvatar} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {post.authorName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="text-xs text-slate-800 leading-relaxed">
                <span className="font-semibold text-slate-900 mr-2">{post.authorName}</span>
                {post.caption}
                <div className="text-[11px] text-slate-400 mt-1">{post.createdAt}</div>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-11">
                {post.tags.map(t => (
                  <button
                    key={t}
                    onClick={() => { onTagClick && onTagClick(t); onClose(); }}
                    className="text-indigo-600 hover:underline text-xs font-medium"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {/* Threaded Comments Section */}
            <div className="pt-2 border-t border-slate-100">
              <CommentSection 
                comments={post.comments}
                currentUser={currentUser}
                onAddComment={(content) => onAddComment(post.id, content)}
                onAddReply={(commentId, content) => onAddReply(post.id, commentId, content)}
                onToggleCommentLike={(commentId) => onToggleCommentLike(post.id, commentId)}
                onToggleReplyLike={(commentId, replyId) => onToggleReplyLike(post.id, commentId, replyId)}
              />
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 bg-slate-50/50 flex-shrink-0 space-y-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onToggleLike(post.id)}
                  className="flex items-center gap-1.5 text-slate-700 hover:text-rose-600"
                >
                  <Heart className={`w-5 h-5 ${post.isLiked ? 'text-rose-500 fill-rose-500' : ''}`} />
                  <span className="text-xs font-semibold">{post.likesCount}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="text-slate-700 hover:text-indigo-600 relative"
                >
                  <Share2 className="w-5 h-5" />
                  <AnimatePresence>
                    {showShareToast && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded whitespace-nowrap"
                      >
                        Copied link!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              <button
                onClick={() => onToggleBookmark(post.id)}
                className="text-slate-700 hover:text-amber-600"
              >
                <Bookmark className={`w-5 h-5 ${post.isBookmarked ? 'text-amber-500 fill-amber-500' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
