/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Film, 
  MapPin, 
  Hash, 
  Sparkles, 
  Plus, 
  Trash2, 
  SlidersHorizontal,
  Crop,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SocialPost, SocialMediaItem, PostAspectRatio, SocialUserProfile } from '../../types/social';

interface PostCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SocialUserProfile;
  onPostCreated: (newPost: SocialPost) => void;
}

export default function PostCreationModal({
  isOpen,
  onClose,
  currentUser,
  onPostCreated
}: PostCreationModalProps) {
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<PostAspectRatio>('4:5');
  const [mediaItems, setMediaItems] = useState<SocialMediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: SocialMediaItem[] = [];
    Array.from(files).forEach((file: File) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isImage || isVideo) {
        const objectUrl = URL.createObjectURL(file);
        newItems.push({
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: isVideo ? 'video' : 'image',
          url: objectUrl,
          aspectRatio: aspectRatio,
          altText: file.name
        });
      }
    });

    if (newItems.length > 0) {
      setMediaItems(prev => [...prev, ...newItems]);
      setErrorMsg(null);
    }
  };

  const handleAddSampleImage = (url: string) => {
    setMediaItems(prev => [
      ...prev,
      {
        id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'image',
        url,
        aspectRatio: aspectRatio,
        altText: 'Sample photo'
      }
    ]);
    setErrorMsg(null);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaItems(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (activeMediaIndex >= updated.length) {
        setActiveMediaIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleAddTag = () => {
    const cleaned = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      setTags(prev => [...prev, cleaned]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = () => {
    if (mediaItems.length === 0 && !caption.trim()) {
      setErrorMsg('Please attach at least one photo/video or write a caption.');
      return;
    }

    setIsSubmitting(true);

    // Extract hashtags from caption as well
    const autoTags = caption.match(/#[a-z0-9_]+/gi)?.map(t => t.slice(1).toLowerCase()) || [];
    const mergedTags = Array.from(new Set([...tags, ...autoTags]));

    setTimeout(() => {
      const newPost: SocialPost = {
        id: `post_${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatarUrl,
        authorBadge: 'creator',
        createdAt: 'Just now',
        timestamp: Date.now(),
        caption: caption.trim(),
        media: mediaItems.map(item => ({ ...item, aspectRatio })),
        aspectRatio: aspectRatio,
        location: location.trim() || undefined,
        tags: mergedTags,
        likesCount: 0,
        isLiked: false,
        isBookmarked: false,
        commentsCount: 0,
        sharesCount: 0,
        comments: []
      };

      onPostCreated(newPost);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  const aspectRatioClassMap = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '16:9': 'aspect-video'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Create New Post</h2>
              <p className="text-xs text-slate-500">Share high-fidelity visuals and stories with your community</p>
            </div>
          </div>

          <button 
            id="close-create-post-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Left Column: Media Stage & Aspect Ratio Selector */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5" /> Media Canvas & Ratio
                </span>

                {/* Aspect Ratio Buttons */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
                  {(['1:1', '4:5', '16:9'] as PostAspectRatio[]).map(ratio => (
                    <button
                      key={ratio}
                      id={`aspect-ratio-btn-${ratio.replace(':', '-')}`}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                        aspectRatio === ratio 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Media Preview Frame */}
              <div className={`relative w-full bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center ${aspectRatioClassMap[aspectRatio]}`}>
                {mediaItems.length > 0 ? (
                  <div className="w-full h-full relative group">
                    {mediaItems[activeMediaIndex].type === 'image' && mediaItems[activeMediaIndex].url && mediaItems[activeMediaIndex].url.trim() !== '' ? (
                      <img 
                        src={mediaItems[activeMediaIndex].url} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : mediaItems[activeMediaIndex].type === 'video' && mediaItems[activeMediaIndex].url && mediaItems[activeMediaIndex].url.trim() !== '' ? (
                      <video 
                        src={mediaItems[activeMediaIndex].url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-400 text-xs">
                        No Media Preview Available
                      </div>
                    )}

                    {/* Delete Item Overlay */}
                    <button 
                      id="remove-active-media-item-btn"
                      onClick={() => handleRemoveMedia(activeMediaIndex)}
                      className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xs"
                      title="Remove slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Multi-item pagination dots */}
                    {mediaItems.length > 1 && (
                      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
                        {mediaItems.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveMediaIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              activeMediaIndex === idx ? 'bg-white w-4' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-medium text-slate-200">No media attached yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Upload images/videos or pick from sample creative assets below</p>
                    
                    <button 
                      id="post-media-picker-btn"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Select from Computer
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail tray & Sample Quick Add */}
            <div className="mt-4 pt-3 border-t border-slate-200/60">
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">
                  {mediaItems.length > 0 ? `${mediaItems.length} media item(s)` : 'Quick Samples:'}
                </span>

                <button 
                  id="add-more-media-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Files
                </button>
              </div>

              {mediaItems.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {mediaItems.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                        activeMediaIndex === idx ? 'border-indigo-600 ring-2 ring-indigo-100 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      {item.type === 'image' && item.url && item.url.trim() !== '' ? (
                        <img src={item.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                          <Film className="w-5 h-5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-1 text-xs text-zinc-500">
                  <span>Upload your photos or videos using the file picker above.</span>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Metadata, Caption, Location, Tags & Submit */}
          <div className="md:col-span-5 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Author Preview */}
              <div className="flex items-center gap-3">
                {currentUser.avatarUrl && currentUser.avatarUrl.trim() !== '' ? (
                  <img 
                    src={currentUser.avatarUrl} 
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm ring-2 ring-slate-100">
                    {currentUser.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{currentUser.name}</h4>
                  <p className="text-xs text-slate-500">{currentUser.handle}</p>
                </div>
              </div>

              {/* Caption Textarea */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Caption & Story
                </label>
                <textarea
                  id="create-post-caption-textarea"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write an engaging caption... Use #hashtags to increase discoverability."
                  rows={4}
                  className="w-full text-sm rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Add-ons toggle: Location & Tags */}
              <div className="space-y-3 pt-1">
                {/* Location Input */}
                {showLocationInput ? (
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="create-post-location-input"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Add location (e.g., Kyoto, Japan)"
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <button 
                      onClick={() => { setLocation(''); setShowLocationInput(false); }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    id="toggle-location-input-btn"
                    onClick={() => setShowLocationInput(true)}
                    className="w-full py-2 px-3 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500" /> 
                      {location ? location : 'Add Location'}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}

                {/* Tag Input */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">Tags</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center p-2 rounded-xl border border-slate-200 bg-slate-50/50 min-h-[38px]">
                    {tags.map(tag => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100"
                      >
                        #{tag}
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-indigo-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      id="create-post-tag-input"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDownTag}
                      placeholder={tags.length === 0 ? "Type tag & press enter..." : "Add more..."}
                      className="text-xs bg-transparent focus:outline-none flex-1 min-w-[100px] text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 mt-4">
              <button 
                id="cancel-create-post-btn"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button 
                id="publish-post-submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Share Post
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
}
