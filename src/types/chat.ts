/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChatType = 'direct' | 'group' | 'channel';
export type UserOnlineStatus = 'online' | 'away' | 'offline' | 'busy';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface ChatUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  status: UserOnlineStatus;
  role?: 'admin' | 'user';
  customStatus?: string;
  lastSeen?: string;
  isTyping?: boolean;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // userIds who reacted
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name: string;
  url: string;
  sizeFormatted: string;
  duration?: number; // for audio/video in seconds
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  formattedTime: string;
  deliveryStatus: MessageDeliveryStatus;
  isEdited?: boolean;
  isPinned?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  attachments?: MessageAttachment[];
  voiceNote?: {
    audioUrl: string;
    duration: number; // in seconds
    waveform: number[];
  };
  reactions: MessageReaction[];
}

export interface CallSignal {
  id: string;
  roomId: string;
  conversationId: string;
  caller: ChatUser;
  receiverId: string;
  receiverName: string;
  callType: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';
  timestamp: number;
}

export interface Conversation {
  id: string;
  type: ChatType;
  name: string;
  avatar?: string;
  description?: string;
  participants: ChatUser[];
  unreadCount: number;
  lastMessage?: {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    formattedTime: string;
    deliveryStatus: MessageDeliveryStatus;
  };
  pinnedMessageIds?: string[];
  isMuted?: boolean;
}
