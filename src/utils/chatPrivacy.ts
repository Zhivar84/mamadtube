/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatUser, Conversation, ChatMessage } from '../types/chat';

/**
 * Computes a deterministic, unique conversation ID for 1-on-1 direct messaging.
 * Sorts participant user IDs alphabetically so UserA talking to UserB produces
 * the exact same ID as UserB talking to UserA.
 */
export function getDirectConversationId(userIdA: string, userIdB: string): string {
  const cleanA = (userIdA || '').trim();
  const cleanB = (userIdB || '').trim();
  return [cleanA, cleanB].sort().join('_');
}

/**
 * Determines whether a conversation involves the current user.
 */
export function isUserInConversation(conv: Conversation, userId: string): boolean {
  if (!conv || !userId) return false;
  if (conv.participants && conv.participants.some(p => p.id === userId)) {
    return true;
  }
  // For direct chats with deterministic IDs: "usr1_usr2"
  if (conv.type === 'direct' && conv.id.includes(userId)) {
    return true;
  }
  return false;
}

/**
 * Filters all conversations based on privacy rules and admin moderation mode.
 */
export function filterConversationsForUser(
  conversations: Conversation[],
  currentUserId: string,
  isAdmin: boolean = false,
  showAllAdminMode: boolean = false
): Conversation[] {
  if (isAdmin && showAllAdminMode) {
    return conversations;
  }
  return conversations.filter(conv => isUserInConversation(conv, currentUserId));
}

/**
 * Validates whether a message is visible to a user within a conversation.
 * In a 1-on-1 DM:
 * (senderId === currentUser.id AND receiverId === targetUser.id) OR
 * (senderId === targetUser.id AND receiverId === currentUser.id)
 */
export function isMessageVisibleInConversation(
  msg: ChatMessage,
  activeConvId: string,
  currentUserId: string,
  targetUserId?: string,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  if (msg.conversationId === activeConvId) return true;
  
  if (targetUserId) {
    const isDirectMatch = 
      (msg.senderId === currentUserId && msg.receiverId === targetUserId) ||
      (msg.senderId === targetUserId && msg.receiverId === currentUserId);
    if (isDirectMatch) return true;
  }

  return false;
}
