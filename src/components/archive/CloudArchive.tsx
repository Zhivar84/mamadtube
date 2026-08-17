/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, FolderPlus, FolderOpen, Grid, List, Search, Filter, 
  ArrowUpDown, MoreVertical, Eye, Download, Edit3, 
  Trash2, Share2, Star, ChevronRight, Home, UploadCloud, 
  FileText, Image as ImageIcon, Film, Music, Archive, 
  HardDrive, Plus, Check, RefreshCw, X
} from 'lucide-react';
import { ArchiveFile, ArchiveFolder, FileCategory } from '../../types/archive';
import { formatBytes, downloadArchiveFile } from '../../utils/archiveUtils';
import StorageMetricCard from './StorageMetricCard';
import UploadDropzone from './UploadDropzone';
import FilePreviewModal from './FilePreviewModal';
import { CreateFolderModal, RenameModal, DeleteConfirmModal, ShareLinkModal } from './FileActionModals';

export default function CloudArchive() {
  // Persistence state
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadArchiveData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/archive/files');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFiles(data.files || []);
          setFolders(data.folders || []);
        }
      }
    } catch (err) {
      console.error('Error fetching archive files:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchiveData();
  }, [loadArchiveData]);

  // Navigation & Filtering state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FileCategory>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'>('date-desc');
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modals state
  const [previewFile, setPreviewFile] = useState<ArchiveFile | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ArchiveFile | ArchiveFolder | null>(null);
  const [renameType, setRenameType] = useState<'file' | 'folder'>('file');
  const [deleteTarget, setDeleteTarget] = useState<ArchiveFile | ArchiveFolder | null>(null);
  const [deleteType, setDeleteType] = useState<'file' | 'folder'>('file');
  const [shareFile, setShareFile] = useState<ArchiveFile | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Current folder object
  const currentFolder = useMemo(() => {
    return folders.find((f) => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  // Breadcrumb path computation
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Cloud Vault' }];
    let curr = currentFolder;
    const path: { id: string; name: string }[] = [];

    while (curr) {
      path.unshift({ id: curr.id, name: curr.name });
      curr = folders.find((f) => f.id === curr?.parentId) || null;
    }

    return [...crumbs, ...path];
  }, [folders, currentFolder]);

  // Visible Folders (filtered by current folder)
  const visibleFolders = useMemo(() => {
    return folders.filter((folder) => {
      // In search mode, search everywhere
      if (searchQuery.trim()) {
        return folder.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return folder.parentId === currentFolderId;
    });
  }, [folders, currentFolderId, searchQuery]);

  // Filtered & Sorted Files
  const visibleFiles = useMemo(() => {
    let result = files.filter((file) => {
      // 1. Folder match (or all folders if searching)
      if (!searchQuery.trim() && file.folderId !== currentFolderId) {
        return false;
      }

      // 2. Category filter
      if (activeCategory !== 'all' && file.category !== activeCategory) {
        return false;
      }

      // 3. Search query (matches name, extension, tags, content)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = file.name.toLowerCase().includes(q);
        const matchesExt = file.extension.toLowerCase().includes(q);
        const matchesTags = file.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesExt && !matchesTags) return false;
      }

      return true;
    });

    // Sort result
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [files, currentFolderId, activeCategory, searchQuery, sortBy]);

  // Handlers
  const handleCreateFolder = async (name: string, color: string) => {
    try {
      const res = await fetch('/api/archive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          parentId: currentFolderId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.folder) {
          setFolders((prev) => [...prev, data.folder]);
        }
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    }
    showToast(`Folder "${name}" created`);
  };

  const handleRename = async (id: string, newName: string) => {
    try {
      if (renameType === 'file') {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName, updatedAt: 'Just now' } : f)));
        await fetch(`/api/archive/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        });
        showToast(`File renamed to "${newName}"`);
      } else {
        setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName, updatedAt: 'Just now' } : f)));
        await fetch(`/api/archive/folders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        });
        showToast(`Folder renamed to "${newName}"`);
      }
    } catch (err) {
      console.error('Error renaming item:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteType === 'file') {
        setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        if (previewFile?.id === deleteTarget.id) setPreviewFile(null);
        await fetch(`/api/archive/files/${deleteTarget.id}`, { method: 'DELETE' });
        showToast(`Deleted file "${deleteTarget.name}"`);
      } else {
        setFolders((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        setFiles((prev) => prev.filter((f) => f.folderId !== deleteTarget.id));
        if (currentFolderId === deleteTarget.id) setCurrentFolderId(null);
        await fetch(`/api/archive/folders/${deleteTarget.id}`, { method: 'DELETE' });
        showToast(`Deleted folder "${deleteTarget.name}"`);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
    setDeleteTarget(null);
  };

  const handleToggleFavorite = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetFile = files.find((f) => f.id === fileId);
    const newFavState = !targetFile?.isFavorite;

    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isFavorite: newFavState } : f))
    );

    try {
      await fetch(`/api/archive/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newFavState }),
      });
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleNewFilesUploaded = (newFiles: ArchiveFile[]) => {
    setFiles((prev) => {
      const existingIds = new Set(prev.map(f => f.id));
      const filteredNew = newFiles.filter(f => !existingIds.has(f.id));
      return [...filteredNew, ...prev];
    });
    showToast(`${newFiles.length} file(s) added to Archive`);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<FileCategory, number> = {
      all: files.length,
      document: files.filter((f) => f.category === 'document').length,
      image: files.filter((f) => f.category === 'image').length,
      audio: files.filter((f) => f.category === 'audio').length,
      video: files.filter((f) => f.category === 'video').length,
      archive: files.filter((f) => f.category === 'archive').length,
    };
    return counts;
  }, [files]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-18 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg shadow-lg text-xs font-medium border border-zinc-700"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner Header & Storage Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Module Title & Hero Info */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-md text-xs font-semibold uppercase tracking-wider">
              Module 02
            </span>
            <span className="text-xs text-zinc-400 font-medium">mamadtube Cloud Archive</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Encrypted Cloud Storage & Vault
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            High-speed distributed file explorer with instant multimedia preview, folder hierarchies, drag-and-drop chunked uploads, and public sharing tokenization.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              id="upload-zone-toggle-btn"
              onClick={() => setShowUploadZone(!showUploadZone)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{showUploadZone ? 'Hide Upload Zone' : 'Upload Files'}</span>
            </button>

            <button
              id="create-folder-btn"
              onClick={() => setIsCreateFolderOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-indigo-500" />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        {/* Storage Metrics Panel */}
        <div className="lg:col-span-1">
          <StorageMetricCard files={files} />
        </div>
      </div>

      {/* Collapsible Upload Dropzone */}
      <AnimatePresence>
        {showUploadZone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <UploadDropzone
              currentFolderId={currentFolderId}
              onUploadComplete={handleNewFilesUploaded}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explorer Controls: Breadcrumbs, Search, Categories, Sort & View Mode */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-4">
        {/* Row 1: Breadcrumbs and View Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          {/* Breadcrumbs Navigation */}
          <nav className="flex items-center gap-1.5 flex-wrap text-xs font-medium">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id || 'root'}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />}
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      isLast
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    {idx === 0 ? <Home className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5 text-indigo-500" />}
                    <span>{crumb.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* View Mode & Sort Dropdown */}
          <div className="flex items-center gap-2">
            {/* Sort selector */}
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <select
                id="archive-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="date-desc" className="bg-white dark:bg-zinc-900">Newest First</option>
                <option value="date-asc" className="bg-white dark:bg-zinc-900">Oldest First</option>
                <option value="name-asc" className="bg-white dark:bg-zinc-900">Name (A-Z)</option>
                <option value="name-desc" className="bg-white dark:bg-zinc-900">Name (Z-A)</option>
                <option value="size-desc" className="bg-white dark:bg-zinc-900">Size (Largest)</option>
                <option value="size-asc" className="bg-white dark:bg-zinc-900">Size (Smallest)</option>
              </select>
            </div>

            {/* Grid / List Switcher */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <button
                id="view-mode-grid-btn"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                id="view-mode-list-btn"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Search Bar and Category Filter Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              id="archive-search-input"
              type="text"
              placeholder="Filter by file name, tag, or extension (e.g. pdf, mp4, doc)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {(
              [
                { key: 'all', label: 'All', icon: Folder },
                { key: 'document', label: 'Docs', icon: FileText },
                { key: 'image', label: 'Images', icon: ImageIcon },
                { key: 'audio', label: 'Audio', icon: Music },
                { key: 'video', label: 'Videos', icon: Film },
                { key: 'archive', label: 'Archives', icon: Archive },
              ] as const
            ).map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-zinc-800 dark:bg-zinc-300 text-zinc-200 dark:text-zinc-900'
                      : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    {categoryCounts[cat.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Explorer View: Folders + Files */}
      <div className="space-y-6">
        {/* 1. Folders Section (if any present in current view) */}
        {visibleFolders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Folders ({visibleFolders.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleFolders.map((folder) => {
                const childFilesCount = files.filter((f) => f.folderId === folder.id).length;
                return (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 p-3.5 rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{ color: folder.color || '#6366f1' }}
                        className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 flex-shrink-0 group-hover:scale-105 transition-transform"
                      >
                        <Folder className="w-5 h-5 fill-current opacity-80" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {folder.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                          {childFilesCount} item{childFilesCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameTarget(folder);
                          setRenameType('folder');
                        }}
                        title="Rename folder"
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(folder);
                          setDeleteType('folder');
                        }}
                        title="Delete folder"
                        className="p-1 text-zinc-400 hover:text-red-500 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Files Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Files ({visibleFiles.length})
            </h3>
            {searchQuery && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                Searching across all archives for &ldquo;{searchQuery}&rdquo;
              </span>
            )}
          </div>

          {visibleFiles.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {searchQuery ? 'No files match your search' : 'No files uploaded yet. Drag and drop files to get started.'}
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'No files matched your search filters. Try adjusting your query or category selection.'
                  : 'Drag and drop files to get started.'}
              </p>
              <button
                onClick={() => setShowUploadZone(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload New Files</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer relative"
                >
                  {/* Thumbnail / Preview Area */}
                  <div className="h-36 w-full bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800/80">
                    {file.category === 'image' && (file.url || file.previewUrl) ? (
                      <img
                        src={file.url || file.previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : file.category === 'video' && file.previewUrl ? (
                      <div className="relative w-full h-full">
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Film className="w-8 h-8 text-white/90" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1.5 text-zinc-400 group-hover:scale-110 transition-transform">
                        {file.category === 'document' && <FileText className="w-10 h-10 text-amber-500" />}
                        {file.category === 'audio' && <Music className="w-10 h-10 text-indigo-500" />}
                        {file.category === 'video' && <Film className="w-10 h-10 text-rose-500" />}
                        {file.category === 'archive' && <Archive className="w-10 h-10 text-purple-500" />}
                        {file.category === 'image' && <ImageIcon className="w-10 h-10 text-emerald-500" />}
                        <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">
                          {file.extension}
                        </span>
                      </div>
                    )}

                    {/* Favorite Star Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(file.id, e)}
                      className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer"
                      title={file.isFavorite ? 'Remove favorite' : 'Mark favorite'}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          file.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white'
                        }`}
                      />
                    </button>

                    {/* Quick Hover Action Overlay */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFile(file);
                        }}
                        className="p-2 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-lg shadow-sm hover:scale-105 transition-transform"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadArchiveFile(file.name, file.url || file.content, file.mimeType);
                        }}
                        className="p-2 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-lg shadow-sm hover:scale-105 transition-transform"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareFile(file);
                        }}
                        className="p-2 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-lg shadow-sm hover:scale-105 transition-transform"
                        title="Share link"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {file.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center justify-between">
                        <span>{file.formattedSize}</span>
                        <span className="font-mono text-[10px]">{file.createdAt.split(' ')[0]}</span>
                      </p>
                    </div>

                    {/* Bottom row: tag & dropdown menu trigger */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase font-mono">
                        {file.category}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTarget(file);
                            setRenameType('file');
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded cursor-pointer"
                          title="Rename"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(file);
                            setDeleteType('file');
                          }}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 text-zinc-500 dark:text-zinc-400 font-semibold">
                      <th className="py-3 px-4 w-8"></th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {visibleFiles.map((file) => (
                      <tr
                        key={file.id}
                        onClick={() => setPreviewFile(file)}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => handleToggleFavorite(file.id, e)}
                            className="p-1 text-zinc-400 hover:text-amber-400 cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                file.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {file.category === 'image' && <ImageIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            {file.category === 'video' && <Film className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                            {file.category === 'audio' && <Music className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                            {file.category === 'document' && <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                            {file.category === 'archive' && <Archive className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono uppercase text-zinc-600 dark:text-zinc-400">
                            {file.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-mono">
                          {file.formattedSize}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                          {file.createdAt}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFile(file);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadArchiveFile(file.name, file.url || file.content, file.mimeType);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareFile(file);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              title="Share"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameTarget(file);
                                setRenameType('file');
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              title="Rename"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(file);
                                setDeleteType('file');
                              }}
                              className="p-1.5 text-red-500 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onRename={(f) => {
          setRenameTarget(f);
          setRenameType('file');
        }}
        onDelete={(f) => {
          setDeleteTarget(f);
          setDeleteType('file');
        }}
        onShare={(f) => setShareFile(f)}
      />

      {/* 2. Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      {/* 3. Rename Modal */}
      <RenameModal
        isOpen={Boolean(renameTarget)}
        target={renameTarget}
        targetType={renameType}
        onClose={() => setRenameTarget(null)}
        onRename={handleRename}
      />

      {/* 4. Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        target={deleteTarget}
        targetType={deleteType}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* 5. Share Link Modal */}
      <ShareLinkModal
        isOpen={Boolean(shareFile)}
        file={shareFile}
        onClose={() => setShareFile(null)}
      />
    </div>
  );
}
