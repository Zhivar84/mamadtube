/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, CheckCircle2, AlertCircle, X, FileText, Image as ImageIcon, Film, Music, Archive, Loader2 } from 'lucide-react';
import { ArchiveFile, FileCategory, UploadQueueItem } from '../../types/archive';
import { detectFileCategory, formatBytes } from '../../utils/archiveUtils';

interface UploadDropzoneProps {
  currentFolderId: string | null;
  onUploadComplete: (newFiles: ArchiveFile[]) => void;
}

export default function UploadDropzone({
  currentFolderId,
  onUploadComplete,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (filesList: FileList | File[]) => {
    const rawFiles = Array.from(filesList);
    if (rawFiles.length === 0) return;

    const newQueueItems: UploadQueueItem[] = rawFiles.map((file) => {
      const { category } = detectFileCategory(file);
      return {
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'uploading',
        category,
      };
    });

    setUploadQueue((prev) => [...newQueueItems, ...prev]);

    // Process each upload with progress animation and FileReader
    newQueueItems.forEach((item) => {
      simulateAndStoreUpload(item);
    });
  };

  const simulateAndStoreUpload = (item: UploadQueueItem) => {
    const file = item.file;
    const { category, extension } = detectFileCategory(file);
    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 25) + 15;

      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);

        // Read file data
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;

          const createdFile: ArchiveFile = {
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: file.size,
            formattedSize: formatBytes(file.size),
            category,
            mimeType: file.type || 'application/octet-stream',
            extension: extension || 'bin',
            folderId: currentFolderId,
            createdAt: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            updatedAt: 'Just now',
            url: dataUrl,
            previewUrl: category === 'image' ? dataUrl : undefined,
            tags: [category.toUpperCase()],
          };

          // If it's a text/json file, read content
          if (
            file.type.includes('text') ||
            file.type.includes('json') ||
            ['md', 'txt', 'json', 'ts', 'js', 'html', 'css'].includes(extension)
          ) {
            const textReader = new FileReader();
            textReader.onload = (textEv) => {
              createdFile.content = (textEv.target?.result as string)?.slice(0, 10000);
              onUploadComplete([createdFile]);
            };
            textReader.readAsText(file);
          } else {
            onUploadComplete([createdFile]);
          }

          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: 100, status: 'completed' } : q))
          );
        };

        reader.onerror = () => {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'error', error: 'Failed to read file contents' } : q
            )
          );
        };

        // For audio, video, images, read as DataURL
        reader.readAsDataURL(file);
      } else {
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: currentProgress } : q))
        );
      }
    }, 120);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Zone */}
      <div
        id="archive-upload-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center min-h-[140px] select-none ${
          isDragging
            ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30'
            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="space-y-1.5 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mx-auto mb-1">
            <UploadCloud className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Drag & drop files here, or <span className="underline text-indigo-600 dark:text-indigo-400">browse system files</span>
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Supports Documents (PDF, DOCX, TXT), Images, Audio (MP3, WAV), Videos (MP4), and Archives (.zip, .tar)
          </p>
        </div>
      </div>

      {/* Upload Queue Activity List */}
      {uploadQueue.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Upload Activity ({uploadQueue.filter((q) => q.status === 'uploading').length} active)
            </span>
            <button
              onClick={() => setUploadQueue((prev) => prev.filter((q) => q.status === 'uploading'))}
              className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              Clear Completed
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.category === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                    {item.category === 'video' && <Film className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                    {item.category === 'audio' && <Music className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />}
                    {item.category === 'document' && <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    {item.category === 'archive' && <Archive className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.name}</span>
                    <span className="text-[10px] text-zinc-400">({formatBytes(item.size)})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'uploading' && (
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                        {item.progress}%
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Uploaded
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-red-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                    <button
                      onClick={() => removeQueueItem(item.id)}
                      className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {item.status === 'uploading' && (
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.progress}%` }}
                      className="h-full bg-indigo-600 rounded-full transition-all duration-150"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
