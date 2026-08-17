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
      if (!res.ok) {
        throw new Error(`Failed to fetch storage stats: ${res.statusText}`);
      }
      const data: SystemStorageMetrics = await res.json();
      setStorage(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching system storage:', err);
      setError(err.message || 'Failed to fetch host storage metrics');
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
