/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HardDrive, RefreshCw, Server, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ArchiveFile } from '../../types/archive';
import { formatBytes } from '../../utils/archiveUtils';
import { useSystemStorage } from '../../utils/useSystemStorage';

interface StorageMetricCardProps {
  files?: ArchiveFile[];
  compact?: boolean;
  className?: string;
}

export default function StorageMetricCard({
  files = [],
  compact = false,
  className = '',
}: StorageMetricCardProps) {
  const { storage, isLoading, isRefreshing, error, refresh } = useSystemStorage(30000);

  // Aggregate local catalog bytes per category if files provided
  const breakdown: Record<string, { bytes: number; count: number; label: string; color: string }> = {
    image: { bytes: 0, count: 0, label: 'Images', color: 'bg-emerald-500' },
    video: { bytes: 0, count: 0, label: 'Videos', color: 'bg-rose-500' },
    audio: { bytes: 0, count: 0, label: 'Audio', color: 'bg-indigo-500' },
    document: { bytes: 0, count: 0, label: 'Documents', color: 'bg-amber-500' },
    archive: { bytes: 0, count: 0, label: 'Archives', color: 'bg-purple-500' },
  };

  let localCatalogUsedBytes = 0;
  files.forEach((file) => {
    localCatalogUsedBytes += file.size;
    if (breakdown[file.category]) {
      breakdown[file.category].bytes += file.size;
      breakdown[file.category].count += 1;
    }
  });

  const percentage = storage ? storage.percentage : 0;
  const pctDisplay = percentage < 0.1 && percentage > 0 
    ? percentage.toFixed(2) 
    : percentage.toFixed(1);

  // Status color logic: <70% green, 70-85% yellow, >85% red
  const getProgressBarColor = (pct: number) => {
    if (pct > 85) return 'bg-rose-500';
    if (pct > 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (pct: number) => {
    if (pct > 85) {
      return {
        label: 'Critical (>85%)',
        color: 'text-rose-400 bg-rose-950/40 border-rose-900/60',
        icon: AlertTriangle,
      };
    }
    if (pct > 70) {
      return {
        label: 'Warning (70-85%)',
        color: 'text-amber-400 bg-amber-950/40 border-amber-900/60',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Optimal (<70%)',
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60',
      icon: CheckCircle2,
    };
  };

  const statusBadge = getStatusBadge(percentage);
  const StatusIcon = statusBadge.icon;

  if (compact) {
    return (
      <div className={`bg-zinc-950 border border-zinc-800/80 p-3 rounded-lg space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
            <span>Host Disk Storage</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-200">
              {isLoading ? 'Scanning...' : `${storage?.usedFormatted} / ${storage?.totalFormatted}`}
            </span>
            <button
              onClick={() => refresh()}
              disabled={isRefreshing}
              title="Refresh host storage metrics"
              className="text-zinc-400 hover:text-zinc-200 p-0.5 rounded transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div
            style={{ width: `${Math.max(1, Math.min(100, percentage))}%` }}
            className={`h-full ${getProgressBarColor(percentage)} transition-all duration-300`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="text-zinc-300 font-medium">
            {isLoading ? 'Reading storage...' : `${storage?.usedFormatted} used (${pctDisplay}%)`}
          </span>
          <span>{isLoading ? '--' : `${storage?.freeFormatted} free`}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-zinc-800 rounded-lg border border-zinc-700/60 text-zinc-300">
            <HardDrive className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              Host Disk Storage
            </h3>
            <p className="text-[10px] text-zinc-400">Real-time Linux partition detection</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadge.color}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusBadge.label}</span>
          </div>

          <button
            onClick={() => refresh()}
            disabled={isRefreshing || isLoading}
            title="Refresh host disk metrics"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Storage Bar & Readable string */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-semibold text-zinc-200">
            {isLoading ? (
              <span className="text-zinc-400 animate-pulse">Inspecting storage partition...</span>
            ) : (
              <span>
                <strong className="text-zinc-100 font-bold">{storage?.usedFormatted}</strong> used of{' '}
                <strong className="text-zinc-100 font-bold">{storage?.totalFormatted}</strong> ({pctDisplay}%)
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-zinc-400">
            {isLoading ? '' : `${storage?.freeFormatted} available`}
          </span>
        </div>

        {/* Dynamic colored progress bar */}
        <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5">
          <div
            style={{ width: `${Math.max(1, Math.min(100, percentage))}%` }}
            className={`h-full rounded-full ${getProgressBarColor(percentage)} transition-all duration-500`}
            title={`Disk Usage: ${pctDisplay}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <Server className="w-3 h-3 text-zinc-500" />
            Mount: <code className="text-zinc-400 font-mono">{storage?.mountPoint || '/'}</code>
          </span>
          <span>
            {storage?.cached ? 'Cached (30s TTL)' : 'Live Read'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Local Catalog & Vault breakdown */}
      {files.length > 0 && (
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
            <span>Archive Catalog Files ({files.length})</span>
            <span className="text-zinc-300 font-mono">{formatBytes(localCatalogUsedBytes)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-1.5 rounded-md bg-zinc-950/50 border border-zinc-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-zinc-400 truncate">Images</span>
              <span className="ml-auto font-mono text-[11px] font-medium text-zinc-200">
                {formatBytes(breakdown.image.bytes)}
              </span>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-md bg-zinc-950/50 border border-zinc-800/60">
              <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
              <span className="text-zinc-400 truncate">Videos</span>
              <span className="ml-auto font-mono text-[11px] font-medium text-zinc-200">
                {formatBytes(breakdown.video.bytes)}
              </span>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-md bg-zinc-950/50 border border-zinc-800/60">
              <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <span className="text-zinc-400 truncate">Audio</span>
              <span className="ml-auto font-mono text-[11px] font-medium text-zinc-200">
                {formatBytes(breakdown.audio.bytes)}
              </span>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-md bg-zinc-950/50 border border-zinc-800/60">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-zinc-400 truncate">Docs</span>
              <span className="ml-auto font-mono text-[11px] font-medium text-zinc-200">
                {formatBytes(breakdown.document.bytes)}
              </span>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-md bg-zinc-950/50 border border-zinc-800/60 col-span-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
              <span className="text-zinc-400 truncate">Archives & Other</span>
              <span className="ml-auto font-mono text-[11px] font-medium text-zinc-200">
                {formatBytes(breakdown.archive.bytes)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
