/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LiveStream {
  id: string;
  roomId: string;
  title: string;
  description: string;
  streamer: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    subscribersCount: number;
    isVerified?: boolean;
  };
  category: string;
  tags: string[];
  thumbnailUrl: string;
  isLive: boolean;
  viewerCount: number;
  startedAt: number;
  streamKey?: string;
  ingressUrl?: string;
  resolution: string;
  fps: number;
  bitrateKbps: number;
}

export interface StreamHealthMetrics {
  uptimeSeconds: number;
  viewerCount: number;
  bitrateKbps: number;
  fps: number;
  resolution: string;
  packetLossPercent: number;
  latencyMs: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export type ChatUserRole = 'host' | 'mod' | 'vip' | 'viewer';

export interface LiveChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  role: ChatUserRole;
  text: string;
  timestamp: number;
  formattedTime: string;
  isDeleted?: boolean;
  badgeColor?: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  xOffset: number;
  scale: number;
  duration: number;
}

export interface IngressConfig {
  serverUrl: string;
  streamKey: string;
  protocol: 'RTMP' | 'WHIP' | 'SRT';
}

export type BandwidthPreset = '1080p30' | '720p30' | '480p30' | '360p24';

export interface StudioDeviceSettings {
  videoDeviceId: string;
  audioDeviceId: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenShareEnabled: boolean;
}
