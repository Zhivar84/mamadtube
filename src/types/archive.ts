/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FileCategory = 'all' | 'document' | 'image' | 'audio' | 'video' | 'archive';

export interface ArchiveFile {
  id: string;
  name: string;
  size: number; // in bytes
  formattedSize: string;
  category: FileCategory;
  mimeType: string;
  extension: string;
  folderId: string | null; // null for root
  createdAt: string;
  updatedAt: string;
  url?: string; // data URL, object URL, or external link
  previewUrl?: string; // thumbnail preview
  isFavorite?: boolean;
  tags?: string[];
  content?: string; // For text/code documents
  duration?: string; // For audio/video
  dimensions?: { width: number; height: number }; // For images
}

export interface ArchiveFolder {
  id: string;
  name: string;
  parentId: string | null; // null for root
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'error';
  category: FileCategory;
  error?: string;
}

export interface StorageBreakdown {
  category: FileCategory;
  label: string;
  bytes: number;
  count: number;
  color: string;
}
