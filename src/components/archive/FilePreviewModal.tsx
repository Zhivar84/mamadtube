/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Download, Trash2, Edit3, Share2, Copy, Check, 
  ZoomIn, ZoomOut, RotateCcw, Play, Pause, Volume2, 
  VolumeX, Maximize2, FileText, Image as ImageIcon, 
  Music, Film, Archive, ExternalLink, Calendar, HardDrive, Tag
} from 'lucide-react';
import { ArchiveFile } from '../../types/archive';
import { downloadArchiveFile } from '../../utils/archiveUtils';

interface FilePreviewModalProps {
  file: ArchiveFile | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (file: ArchiveFile) => void;
  onDelete: (file: ArchiveFile) => void;
  onShare: (file: ArchiveFile) => void;
}

export default function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onRename,
  onDelete,
  onShare,
}: FilePreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [copiedText, setCopiedText] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!isOpen || !file) return null;

  const handleDownload = () => {
    downloadArchiveFile(file.name, file.url || file.content, file.mimeType);
  };

  const handleCopyContent = () => {
    if (file.content) {
      navigator.clipboard.writeText(file.content);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setAudioProgress(isNaN(progress) ? 0 : progress);
  };

  return (
    <AnimatePresence>
      <div 
        id="file-preview-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {file.category === 'image' && <ImageIcon className="w-4 h-4 text-emerald-500" />}
                {file.category === 'video' && <Film className="w-4 h-4 text-rose-500" />}
                {file.category === 'audio' && <Music className="w-4 h-4 text-indigo-500" />}
                {file.category === 'document' && <FileText className="w-4 h-4 text-amber-500" />}
                {file.category === 'archive' && <Archive className="w-4 h-4 text-purple-500" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate leading-tight">{file.name}</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {file.formattedSize} • {file.mimeType} • Updated {file.updatedAt}
                </p>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                id="preview-download-btn"
                onClick={handleDownload}
                title="Download file"
                className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                id="preview-share-btn"
                onClick={() => onShare(file)}
                title="Share link"
                className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                id="preview-rename-btn"
                onClick={() => onRename(file)}
                title="Rename file"
                className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                id="preview-delete-btn"
                onClick={() => onDelete(file)}
                title="Delete file"
                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
              <button
                id="preview-close-btn"
                onClick={onClose}
                title="Close viewer"
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Viewer Body */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-zinc-100/50 dark:bg-zinc-950/40 min-h-[360px]">
            {/* 1. IMAGE VIEWER */}
            {file.category === 'image' && (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-4">
                <div className="relative overflow-hidden max-h-[500px] flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-900/5 dark:bg-zinc-900/50 p-2">
                  <img
                    src={file.url || file.previewUrl}
                    alt={file.name}
                    style={{ transform: `scale(${zoomLevel})` }}
                    className="max-h-[460px] w-auto max-w-full object-contain rounded transition-transform duration-200"
                  />
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs text-xs">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300 min-w-[48px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300 ml-1 cursor-pointer"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. VIDEO PLAYER */}
            {file.category === 'video' && (
              <div className="w-full max-w-2xl bg-black rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-lg">
                <video
                  src={file.url}
                  controls
                  autoPlay
                  className="w-full aspect-video object-contain"
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>
            )}

            {/* 3. AUDIO PLAYER */}
            {file.category === 'audio' && (
              <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-xs space-y-5">
                <audio
                  ref={audioRef}
                  src={file.url}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={() => setIsPlayingAudio(false)}
                />
                
                {/* Audio Info & Artwork */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Music className="w-8 h-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold truncate">{file.name}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Duration: {file.duration || '03:30'}</p>
                  </div>
                </div>

                {/* Wave Visualization Animation */}
                <div className="h-10 flex items-center justify-between gap-1 px-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {[40, 70, 25, 90, 50, 80, 30, 60, 95, 45, 85, 30, 65, 75, 40, 85, 55, 90, 20, 70].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: isPlayingAudio ? `${h}%` : '25%' }}
                      className="flex-1 bg-indigo-500 rounded-full transition-all duration-150"
                    />
                  ))}
                </div>

                {/* Scrubber & Controls */}
                <div className="space-y-3">
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${audioProgress}%` }}
                      className="h-full bg-indigo-600 rounded-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlayAudio}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 rounded-full transition-transform hover:scale-105 cursor-pointer"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>
                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.muted = !isMuted;
                            setIsMuted(!isMuted);
                          }
                        }}
                        className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      {file.duration || 'Audio track'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. DOCUMENTS & PDF & CODE */}
            {file.category === 'document' && (
              <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col h-[480px]">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                    Preview: {file.extension.toUpperCase()} Format
                  </span>
                  {file.content && (
                    <button
                      onClick={handleCopyContent}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-auto p-5 font-mono text-xs leading-relaxed bg-zinc-50/40 dark:bg-zinc-950/40 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap select-text">
                  {file.content || (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                      <FileText className="w-12 h-12 text-zinc-400" />
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {file.name}
                      </p>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        Binary PDF document cataloged on mamadtube Cloud Archive. Click download to view complete multi-page document locally.
                      </p>
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download {file.formattedSize}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. ARCHIVES (.ZIP, .TAR.GZ) */}
            {file.category === 'archive' && (
              <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                  <Archive className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold">{file.name}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Compressed Archive Bundle • {file.formattedSize}
                  </p>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
                  This compressed package contains project assets, build outputs, and cataloged documentation. Download to extract and explore contents locally.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Archive Bundle ({file.formattedSize})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Metadata Drawer */}
          <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Size: {file.formattedSize}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Created: {file.createdAt}</span>
              </span>
            </div>

            {file.tags && file.tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                {file.tags.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 rounded-md border border-zinc-200 dark:border-zinc-700"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
