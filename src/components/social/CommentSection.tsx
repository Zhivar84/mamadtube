/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, CornerDownRight, Send, MessageCircle } from 'lucide-react';
import { PostComment, CommentReply, SocialUserProfile } from '../../types/social';

interface CommentSectionProps {
  comments: PostComment[];
  currentUser: SocialUserProfile;
  onAddComment: (content: string) => void;
  onAddReply: (commentId: string, content: string) => void;
  onToggleCommentLike: (commentId: string) => void;
  onToggleReplyLike: (commentId: string, replyId: string) => void;
}

export default function CommentSection({
  comments,
  currentUser,
  onAddComment,
  onAddReply,
  onToggleCommentLike,
  onToggleReplyLike
}: CommentSectionProps) {
  const [commentInput, setCommentInput] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(commentInput.trim());
    setCommentInput('');
  };

  const handleReplySubmit = (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    onAddReply(commentId, replyInput.trim());
    setReplyInput('');
    setReplyingToId(null);
  };

  return (
    <div className="pt-3 border-t border-slate-100 space-y-3">
      {/* Existing Comments List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-2 group">
              {/* Main Comment Row */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  {comment.authorAvatar && comment.authorAvatar.trim() !== '' ? (
                    <img 
                      src={comment.authorAvatar} 
                      alt={comment.authorName}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                      {comment.authorName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="font-semibold text-slate-900 mr-1.5">{comment.authorName}</span>
                    <span className="text-slate-700 leading-relaxed">{comment.content}</span>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span>{comment.createdAt}</span>
                      {comment.likesCount > 0 && (
                        <span>{comment.likesCount} {comment.likesCount === 1 ? 'like' : 'likes'}</span>
                      )}
                      <button
                        onClick={() => {
                          setReplyingToId(replyingToId === comment.id ? null : comment.id);
                          setReplyInput('');
                        }}
                        className="font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comment Like Button */}
                <button
                  onClick={() => onToggleCommentLike(comment.id)}
                  className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                    comment.isLiked ? 'text-rose-500' : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title="Like comment"
                >
                  <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-rose-500' : ''}`} />
                </button>
              </div>

              {/* Threaded Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-9 space-y-2 border-l-2 border-slate-100 ml-3.5">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {reply.authorAvatar && reply.authorAvatar.trim() !== '' ? (
                          <img 
                            src={reply.authorAvatar} 
                            alt={reply.authorName}
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[8px] flex-shrink-0 mt-0.5">
                            {reply.authorName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900 mr-1.5">{reply.authorName}</span>
                          <span className="text-slate-700 leading-relaxed">{reply.content}</span>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                            <span>{reply.createdAt}</span>
                            {reply.likesCount > 0 && (
                              <span>{reply.likesCount} {reply.likesCount === 1 ? 'like' : 'likes'}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleReplyLike(comment.id, reply.id)}
                        className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                          reply.isLiked ? 'text-rose-500' : 'text-slate-300 hover:text-slate-500'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${reply.isLiked ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Reply Input */}
              {replyingToId === comment.id && (
                <form 
                  onSubmit={(e) => handleReplySubmit(e, comment.id)}
                  className="pl-9 flex items-center gap-2 mt-2"
                >
                  <div className="flex items-center gap-1.5 flex-1 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
                    <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder={`Reply to ${comment.authorName}...`}
                      autoFocus
                      className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!replyInput.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyingToId(null)}
                    className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>

      {/* Main Comment Submission Field */}
      <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-100">
        {currentUser.avatarUrl && currentUser.avatarUrl.trim() !== '' ? (
          <img 
            src={currentUser.avatarUrl} 
            alt={currentUser.name}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {currentUser.name?.charAt(0) || 'U'}
          </div>
        )}
        <div className="flex-1 relative flex items-center">
          <input
            id="comment-submission-input"
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Write a comment..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!commentInput.trim()}
            className="absolute right-2 p-1 text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
