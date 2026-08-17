/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Edit2, LogOut, Check, Calendar, Mail, Upload, Camera, Trash2, ImagePlus, AlertCircle, ShieldCheck, Shield } from 'lucide-react';
import UserAvatar from './common/UserAvatar';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { auth, updateProfile, logout, navigateTo } = useApp();
  const user = auth.user;

  // Edit fields
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [handle, setHandle] = useState(user?.handle || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [badge, setBadge] = useState<'verified' | 'creator' | 'pro'>(user?.badge || 'verified');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleProcessFile = (file: File, isQuickUpload = false) => {
    setUploadError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        if (isQuickUpload) {
          // Immediately save and update profile
          const res = updateProfile(user.displayName, user.handle, dataUrl, user.bio, user.badge);
          if (res.success) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
          }
        } else {
          setUploadedPhotoPreview(dataUrl);
          setSelectedAvatar(dataUrl);
          setCustomAvatarUrl('');
        }
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isQuick = false) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file, isQuick);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
  };

  const handleDrop = (e: React.DragEvent, isQuick = false) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file, isQuick);
    }
  };

  const handleSave = () => {
    const finalAvatar = uploadedPhotoPreview || customAvatarUrl.trim() || selectedAvatar;
    const res = updateProfile(displayName, handle, finalAvatar, bio, badge);
    if (res.success) {
      setSuccess(true);
      setIsEditing(false);
      setUploadedPhotoPreview(null);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  const handleStartEdit = () => {
    setDisplayName(user.displayName);
    setHandle(user.handle || '');
    setBio(user.bio || '');
    setBadge(user.badge || 'verified');
    setSelectedAvatar(user.avatarUrl);
    setCustomAvatarUrl('');
    setUploadedPhotoPreview(null);
    setUploadError(null);
    setIsEditing(true);
  };

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  const currentActiveAvatar = uploadedPhotoPreview || (customAvatarUrl.trim() || selectedAvatar);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            id="profile-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
          />

          {/* Drawer Body */}
          <motion.div
            id="profile-drawer-body"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-zinc-400" />
                <span>User Profile</span>
              </h2>
              <button
                id="close-profile-drawer"
                onClick={onClose}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Profile Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile Card View */}
              {!isEditing ? (
                <div className="flex flex-col items-center text-center space-y-3.5">
                  <div 
                    className="relative group cursor-pointer"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, true)}
                    onClick={() => quickFileInputRef.current?.click()}
                    title="Click or drag & drop to upload new profile photo"
                  >
                    <input
                      ref={quickFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, true)}
                    />
                    
                    <UserAvatar
                      name={user.displayName}
                      avatarUrl={user.avatarUrl}
                      size="xl"
                      className={`border-2 transition-all ${
                        isDraggingPhoto 
                          ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-105' 
                          : 'border-zinc-700 group-hover:border-zinc-500'
                      }`}
                    />
                    
                    {/* Hover Upload Overlay */}
                    <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-semibold">Change Photo</span>
                    </div>

                    {success && (
                      <div className="absolute inset-0 bg-emerald-500/90 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
                        <Check className="w-5 h-5" />
                      </div>
                    )}

                    {/* Badge trigger icon */}
                    <button
                      type="button"
                      aria-label="Upload profile image"
                      className="absolute bottom-0 right-0 p-1.5 bg-zinc-800 text-zinc-100 rounded-full shadow-xs border-2 border-zinc-900 hover:scale-110 transition-transform"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {uploadError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/40">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Upload photo button in view mode */}
                  <div className="flex items-center gap-2">
                    <button
                      id="quick-upload-photo-btn"
                      onClick={() => quickFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Upload New Photo</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <h3 className="text-lg font-bold text-zinc-100">
                        {user.displayName}
                      </h3>
                      {user.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-purple-400" />
                          Admin
                        </span>
                      )}
                      {user.badge === 'verified' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          ✓ Verified
                        </span>
                      )}
                      {user.badge === 'creator' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          ★ Creator
                        </span>
                      )}
                      {user.badge === 'pro' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ⚡ Pro
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-zinc-400">
                      {user.handle || `@${user.displayName.toLowerCase().replace(/\s+/g, '')}`}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {user.email}
                    </p>
                  </div>

                  {user.bio ? (
                    <p className="text-xs text-zinc-300 max-w-sm px-4 italic leading-relaxed font-normal">
                      "{user.bio}"
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      No bio specified.
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                    <button
                      id="edit-profile-btn"
                      onClick={handleStartEdit}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        id="drawer-admin-dashboard-btn"
                        onClick={() => {
                          onClose();
                          navigateTo('/admin');
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/60 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Editing Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Customize Profile
                    </h3>
                    <span className="text-[10px] text-zinc-500">MamadTube Account</span>
                  </div>

                  {/* Active Avatar Preview with Upload Overlay */}
                  <div className="flex flex-col items-center justify-center p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                    <div className="relative group mb-2">
                      <UserAvatar
                        name={displayName || user.displayName}
                        avatarUrl={currentActiveAvatar}
                        size="lg"
                        className="border-2 border-zinc-700"
                      />
                      {uploadedPhotoPreview && (
                        <span className="absolute top-0 right-0 px-1.5 py-0.5 bg-indigo-600 text-[9px] font-bold text-white rounded-full">
                          Uploaded
                        </span>
                      )}
                    </div>

                    {/* Direct Upload / Drag Zone for Profile Picture */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, false)}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
                        isDraggingPhoto
                          ? 'border-indigo-500 bg-indigo-950/20'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, false)}
                      />
                      <ImagePlus className="w-5 h-5 text-zinc-400 mb-1" />
                      <p className="text-xs font-semibold text-zinc-200">
                        Upload Profile Photo
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Click to browse or drag & drop (JPG, PNG, WEBP up to 5MB)
                      </p>
                    </div>

                    {uploadError && (
                      <div className="flex items-center gap-1.5 text-xs text-red-400 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {(uploadedPhotoPreview || customAvatarUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPhotoPreview(null);
                          setCustomAvatarUrl('');
                          setSelectedAvatar('');
                        }}
                        className="mt-2 text-[11px] text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Reset to default initials</span>
                      </button>
                    )}
                  </div>

                  {/* Custom Avatar URL */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">
                      Custom Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={customAvatarUrl}
                      onChange={(e) => {
                        setCustomAvatarUrl(e.target.value);
                        if (e.target.value.trim()) {
                          setUploadedPhotoPreview(null);
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-xs rounded-lg focus:outline-none focus:border-zinc-600 text-zinc-100 transition-colors"
                    />
                  </div>

                  {/* Display Name Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">
                      Display Name
                    </label>
                    <input
                      id="edit-profile-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-xs rounded-lg focus:outline-none focus:border-zinc-600 text-zinc-100 transition-colors font-medium"
                    />
                  </div>

                  {/* Handle Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">
                      User Handle / Tag
                    </label>
                    <input
                      id="edit-profile-handle"
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="@janedoe"
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-xs rounded-lg focus:outline-none focus:border-zinc-600 text-zinc-100 transition-colors font-mono"
                    />
                  </div>

                  {/* Badge Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">
                      Account Tier / Badge
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setBadge('verified')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          badge === 'verified'
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        ✓ Verified
                      </button>
                      <button
                        type="button"
                        onClick={() => setBadge('creator')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          badge === 'creator'
                            ? 'bg-purple-600/20 text-purple-400 border-purple-500'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        ★ Creator
                      </button>
                      <button
                        type="button"
                        onClick={() => setBadge('pro')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          badge === 'pro'
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        ⚡ Pro
                      </button>
                    </div>
                  </div>

                  {/* Bio Text Area */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">
                      Biography
                    </label>
                    <textarea
                      id="edit-profile-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-xs rounded-lg focus:outline-none focus:border-zinc-600 text-zinc-100 transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      id="cancel-edit-profile-btn"
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setUploadedPhotoPreview(null);
                        setUploadError(null);
                      }}
                      className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="save-profile-btn"
                      type="button"
                      onClick={handleSave}
                      className="flex-1 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Extra account metadata list */}
              <div className="pt-5 border-t border-zinc-800 space-y-2.5">
                <div className="flex items-center text-xs text-zinc-400 gap-3">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-normal">Primary Email:</span>
                  <span className="font-medium text-zinc-300 ml-auto select-all">{user.email}</span>
                </div>
                <div className="flex items-center text-xs text-zinc-400 gap-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-normal">Account Role:</span>
                  <span className={`font-semibold capitalize ml-auto ${user.role === 'admin' ? 'text-purple-400' : 'text-zinc-300'}`}>
                    {user.role || 'Member'}
                  </span>
                </div>
                <div className="flex items-center text-xs text-zinc-400 gap-3">
                  <Check className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-normal">Status:</span>
                  <span className={`font-semibold capitalize ml-auto ${
                    user.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {user.status || 'Approved'}
                  </span>
                </div>
                <div className="flex items-center text-xs text-zinc-400 gap-3">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-normal">Member Since:</span>
                  <span className="font-medium text-zinc-300 ml-auto">{formattedDate}</span>
                </div>
              </div>

            </div>

            {/* Footer containing Sign Out */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60">
              <button
                id="logout-btn"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-900/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Account</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
