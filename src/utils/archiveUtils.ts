/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileCategory } from '../types/archive';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function detectFileCategory(fileOrExt: { name?: string; type?: string } | string): {
  category: FileCategory;
  extension: string;
} {
  let name = '';
  let mimeType = '';

  if (typeof fileOrExt === 'string') {
    name = fileOrExt;
  } else {
    name = fileOrExt.name || '';
    mimeType = fileOrExt.type || '';
  }

  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';

  // Images
  if (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff'].includes(ext)
  ) {
    return { category: 'image', extension: ext || 'png' };
  }

  // Videos
  if (
    mimeType.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'wmv'].includes(ext)
  ) {
    return { category: 'video', extension: ext || 'mp4' };
  }

  // Audio
  if (
    mimeType.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'].includes(ext)
  ) {
    return { category: 'audio', extension: ext || 'mp3' };
  }

  // Archives
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('compressed') ||
    mimeType.includes('7z') ||
    ['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz', 'iso'].includes(ext)
  ) {
    return { category: 'archive', extension: ext || 'zip' };
  }

  // Default to document (pdf, doc, txt, json, ts, js, md, etc.)
  return { category: 'document', extension: ext || 'txt' };
}

export function downloadArchiveFile(fileName: string, contentOrUrl?: string, mimeType = 'text/plain') {
  if (!contentOrUrl) {
    // Generate a downloadable text/json dummy blob if no remote url
    const blob = new Blob([`Content of ${fileName}\nExported from mamadtube Cloud Archive\nDate: ${new Date().toISOString()}`], {
      type: mimeType,
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  if (contentOrUrl.startsWith('data:') || contentOrUrl.startsWith('blob:')) {
    const link = document.createElement('a');
    link.href = contentOrUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // For remote URL, trigger download
    const link = document.createElement('a');
    link.href = contentOrUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
