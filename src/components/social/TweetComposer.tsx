/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  BarChart2, 
  Smile, 
  X, 
  Plus, 
  Sparkles, 
  Film, 
  MapPin, 
  Globe2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SocialMediaItem, Poll, SocialPost, SocialUserProfile } from '../../types/social';
import UserAvatar from '../common/UserAvatar';

interface TweetComposerProps {
  currentUser: SocialUserProfile;
  onPostCreated: (newPost: Partial<SocialPost>) => void;
  placeholder?: string;
  replyToPost?: SocialPost;
  isInlineReply?: boolean;
  onCancel?: () => void;
}

const COMMON_EMOJIS = [
  '😀', '😂', '🔥', '🚀', '✨', '💡', '❤️', '👍',
  '🙌', '🎉', '💻', '⚡', '🎨', '👀', '💯', '👏',
  '☕', '🧠', '🌿', '🛠️', '📈', '🤝', '🎯', '🌟'
];

export default function TweetComposer({
  currentUser,
  onPostCreated,
  placeholder = "What is happening?!",
  replyToPost,
  isInlineReply = false,
  onCancel,
}: TweetComposerProps) {
  const [text, setText] = useState('');
  const [mediaItems, setMediaItems] = useState<SocialMediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_CHARS = 280;
  const charsRemaining = MAX_CHARS - text.length;
  const isOverLimit = charsRemaining < 0;
  const charPercent = Math.min(100, Math.max(0, (text.length / MAX_CHARS) * 100));

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(60, textareaRef.current.scrollHeight)}px`;
    }
  }, [text]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    setIsUploading(true);

    fileList.forEach((file: File) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) return;

      // If video, we only allow 1 media item
      if (isVideo) {
        const videoUrl = URL.createObjectURL(file);
        setMediaItems([
          {
            id: 'med_' + Date.now(),
            type: 'video',
            url: videoUrl,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          },
        ]);
        setIsUploading(false);
        return;
      }

      // If image, read as base64 data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaItems((prev) => {
            const currentImages = prev.filter((m) => m.type === 'image');
            if (currentImages.length >= 4) return prev;
            return [
              ...currentImages,
              {
                id: 'med_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                type: 'image',
                url: event.target!.result as string,
                fileSize: `${(file.size / 1024).toFixed(0)} KB`,
              },
            ];
          });
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const next = [...pollOptions];
    next[index] = val;
    setPollOptions(next);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverLimit) return;
    if (!text.trim() && mediaItems.length === 0 && !showPollCreator) return;

    // Extract tags
    const tagsMatch = text.match(/#[a-zA-Z0-9_]+/g);
    const tags = tagsMatch ? tagsMatch.map((t) => t.substring(1).toLowerCase()) : [];

    // Construct poll if active
    let pollData: Poll | undefined = undefined;
    if (showPollCreator) {
      const validOptions = pollOptions.filter((o) => o.trim().length > 0);
      if (validOptions.length >= 2) {
        pollData = {
          id: 'poll_' + Date.now(),
          options: validOptions.map((opt, idx) => ({
            id: `opt_${idx + 1}`,
            text: opt.trim(),
            votes: 0,
          })),
          totalVotes: 0,
          expiresAt: '1 day left',
        };
      }
    }

    onPostCreated({
      caption: text.trim(),
      media: mediaItems,
      tags,
      poll: pollData,
      replyToId: replyToPost ? replyToPost.id : undefined,
      replyToHandle: replyToPost ? replyToPost.authorHandle : undefined,
    });

    // Reset
    setText('');
    setMediaItems([]);
    setShowPollCreator(false);
    setPollOptions(['', '']);
    setShowEmojiPicker(false);
  };

  const hasContent = text.trim().length > 0 || mediaItems.length > 0 || (showPollCreator && pollOptions.some((o) => o.trim().length > 0));
  const canSubmit = hasContent && !isOverLimit && !isUploading;

  return (
    <div
      className={`bg-zinc-900/90 border border-zinc-800 ${
        isInlineReply ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'
      } shadow-xs transition-colors`}
    >
      {replyToPost && (
        <div className="text-xs text-zinc-500 mb-2.5 flex items-center gap-1">
          <span>Replying to</span>
          <span className="text-sky-400 font-medium">{replyToPost.authorHandle}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3">
          <UserAvatar
            name={currentUser.name}
            avatarUrl={currentUser.avatarUrl}
            size="md"
            className="flex-shrink-0 mt-1"
          />

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-sm md:text-base resize-none outline-none border-none leading-relaxed"
            />

            {/* Media Upload Previews */}
            {mediaItems.length > 0 && (
              <div className="mt-2 mb-3">
                {mediaItems[0].type === 'video' ? (
                  <div className="relative rounded-xl overflow-hidden bg-black max-h-56 border border-zinc-800">
                    <video src={mediaItems[0].url} className="w-full max-h-56 object-cover" controls />
                    <button
                      type="button"
                      onClick={() => removeMedia(mediaItems[0].id)}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`grid gap-1.5 rounded-xl overflow-hidden ${
                      mediaItems.length === 1
                        ? 'grid-cols-1 max-h-72'
                        : mediaItems.length === 2
                        ? 'grid-cols-2 max-h-56'
                        : 'grid-cols-2 max-h-64'
                    }`}
                  >
                    {mediaItems.map((item) => (
                      <div key={item.id} className="relative group overflow-hidden rounded-lg bg-zinc-950 max-h-48">
                        <img
                          src={item.url}
                          alt="Upload preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeMedia(item.id)}
                          className="absolute top-2 right-2 p-1 bg-black/75 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Poll Creator Box */}
            <AnimatePresence>
              {showPollCreator && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 mb-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 mb-1">
                    <span>Create a Poll</span>
                    <button
                      type="button"
                      onClick={() => setShowPollCreator(false)}
                      className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        maxLength={25}
                        onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-sky-500 rounded-lg text-xs text-zinc-100 outline-none"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(idx)}
                          className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {pollOptions.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Controls Bar */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 text-sky-400 relative">
                {/* Media Attachment Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="tweet-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Media (up to 4 images or 1 video)"
                  className="p-2 hover:bg-sky-500/10 rounded-full transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Poll Creator Button */}
                <button
                  type="button"
                  onClick={() => setShowPollCreator(!showPollCreator)}
                  title="Poll"
                  className={`p-2 hover:bg-sky-500/10 rounded-full transition-colors cursor-pointer ${
                    showPollCreator ? 'bg-sky-500/20 text-sky-300' : ''
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                {/* Emoji Picker Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Emoji"
                    className="p-2 hover:bg-sky-500/10 rounded-full transition-colors cursor-pointer"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute left-0 bottom-10 z-50 p-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-56 grid grid-cols-6 gap-1">
                      {COMMON_EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          className="p-1.5 hover:bg-zinc-800 rounded text-base cursor-pointer text-center"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Character Counter & Post Button */}
              <div className="flex items-center gap-3">
                {text.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {/* SVG Radial progress */}
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-zinc-800"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={
                            isOverLimit
                              ? 'text-rose-500'
                              : charsRemaining < 20
                              ? 'text-amber-500'
                              : 'text-sky-500'
                          }
                          strokeDasharray={`${charPercent}, 100`}
                          strokeWidth="3"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                    </div>

                    {charsRemaining <= 20 && (
                      <span
                        className={`text-xs font-semibold ${
                          isOverLimit ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      >
                        {charsRemaining}
                      </span>
                    )}
                  </div>
                )}

                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-full transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                  {replyToPost ? 'Reply' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
