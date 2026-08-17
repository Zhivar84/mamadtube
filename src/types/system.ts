/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemStorageMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentage: number;
  totalFormatted: string;
  usedFormatted: string;
  freeFormatted: string;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: number;
  cached: boolean;
  cacheAgeMs?: number;
  mountPoint?: string;
}
