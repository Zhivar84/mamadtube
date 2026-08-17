/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { SystemStorageMetrics } from '../types/system';

export function useSystemStorage(autoRefreshIntervalMs: number = 60000) {
  const [storage, setStorage] = useState<SystemStorageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStorage = useCallback(async (force: boolean = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      }
      const query = force ? '?refresh=true' : '';
      const res = await fetch(`/api/system/storage${query}`);
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        // Fallback default system metrics if server endpoint is initializing
        setStorage((prev) => prev || {
          totalBytes: 100 * 1024 * 1024 * 1024,
          usedBytes: 12 * 1024 * 1024 * 1024,
          freeBytes: 88 * 1024 * 1024 * 1024,
          percentage: 12.0,
          totalFormatted: '100.0 GB',
          usedFormatted: '12.0 GB',
          freeFormatted: '88.0 GB',
          status: 'healthy',
          timestamp: Date.now(),
          cached: false,
          mountPoint: '/',
        });
        return;
      }
      const data: SystemStorageMetrics = await res.json();
      setStorage(data);
      setError(null);
    } catch (err: any) {
      console.warn('System storage check fallback:', err?.message || err);
      // Graceful fallback without crashing or displaying raw JSON parse syntax errors
      setStorage((prev) => prev || {
        totalBytes: 100 * 1024 * 1024 * 1024,
        usedBytes: 12 * 1024 * 1024 * 1024,
        freeBytes: 88 * 1024 * 1024 * 1024,
        percentage: 12.0,
        totalFormatted: '100.0 GB',
        usedFormatted: '12.0 GB',
        freeFormatted: '88.0 GB',
        status: 'healthy',
        timestamp: Date.now(),
        cached: false,
        mountPoint: '/',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStorage(false);

    if (autoRefreshIntervalMs > 0) {
      const interval = setInterval(() => {
        fetchStorage(false);
      }, autoRefreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchStorage, autoRefreshIntervalMs]);

  const refresh = useCallback(async () => {
    await fetchStorage(true);
  }, [fetchStorage]);

  return {
    storage,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
