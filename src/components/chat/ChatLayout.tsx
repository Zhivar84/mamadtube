/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatArea from './ChatArea';
import NewChatModal from './NewChatModal';
import ChatLiveCallOverlay from './ChatLiveCallOverlay';
import IncomingCallModal from './IncomingCallModal';
import { Conversation, ChatMessage, MessageAttachment, ChatUser, CallSignal } from '../../types/chat';
import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../../data/chatSeedData';
import { useApp } from '../../context/AppContext';
import { 
  getDirectConversationId, 
  filterConversationsForUser, 
  isMessageVisibleInConversation 
} from '../../utils/chatPrivacy';
import { ringtoneService } from '../../utils/callRingtone';
import { MessageSquare, Plus, Send, ShieldCheck, PhoneCall } from 'lucide-react';

const STORAGE_CONVERSATIONS_KEY = 'mamadtube_conversations_v3';
const STORAGE_MESSAGES_KEY = 'mamadtube_chat_messages_v3';
const STORAGE_CALL_SIGNAL_KEY = 'mamadtube_active_call_signal';

export default function ChatLayout() {
  const { auth } = useApp();
  const authUser = auth.user;

  const currentUser: ChatUser = useMemo(() => ({
    id: authUser?.id || 'usr_me',
    name: authUser?.displayName || 'User',
    handle: authUser?.handle || '@user',
    avatar: authUser?.avatarUrl || '',
    status: 'online',
    role: authUser?.role || 'user',
    customStatus: authUser?.bio || 'Online',
  }), [authUser]);

  const isAdmin = currentUser.role === 'admin';

  // Admin global moderation mode toggle (defaults to false so admin sees their own chats, but can toggle to inspect all)
  const [isAdminModeratorMode, setIsAdminModeratorMode] = useState(false);

  // All stored conversations across system
  const [allConversations, setAllConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string>('');

  // All stored messages indexed by conversation ID
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MESSAGES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Calling States
  const [activeCallSession, setActiveCallSession] = useState<CallSignal | null>(null);
  const [incomingCallSignal, setIncomingCallSignal] = useState<CallSignal | null>(null);

  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Sync conversations to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(allConversations));
  }, [allConversations]);

  // Sync messages to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(allMessages));
  }, [allMessages]);

  // Listen to cross-tab storage and call signals
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_CONVERSATIONS_KEY && e.newValue) {
        try {
          setAllConversations(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_MESSAGES_KEY && e.newValue) {
        try {
          setAllMessages(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_CALL_SIGNAL_KEY && e.newValue) {
        try {
          const signal: CallSignal = JSON.parse(e.newValue);
          const age = Date.now() - signal.timestamp;
          if (signal.receiverId === currentUser.id && signal.status === 'ringing' && age < 60000) {
            setIncomingCallSignal(signal);
          } else if (signal.status === 'declined' || signal.status === 'ended') {
            if (activeCallSession && activeCallSession.roomId === signal.roomId) {
              setActiveCallSession(null);
              ringtoneService.playHangupTone();
            }
            if (incomingCallSignal && incomingCallSignal.roomId === signal.roomId) {
              setIncomingCallSignal(null);
              ringtoneService.stopRing();
            }
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser.id, activeCallSession, incomingCallSignal]);

  // Privacy Filtering: Only show conversations where currentUser is a participant (unless admin inspector mode is on)
  const visibleConversations = useMemo(() => {
    return filterConversationsForUser(allConversations, currentUser.id, isAdmin, isAdminModeratorMode);
  }, [allConversations, currentUser.id, isAdmin, isAdminModeratorMode]);

  // Auto-select first conversation if current is invalid
  useEffect(() => {
    if (visibleConversations.length > 0 && (!activeConversationId || !visibleConversations.some(c => c.id === activeConversationId))) {
      setActiveConversationId(visibleConversations[0].id);
    }
  }, [visibleConversations, activeConversationId]);

  const activeConversation = visibleConversations.find(c => c.id === activeConversationId);
  const targetPeer = activeConversation?.type === 'direct'
    ? activeConversation.participants.find(p => p.id !== currentUser.id)
    : undefined;

  // Filter messages for active conversation enforcing privacy
  const currentMessages = useMemo(() => {
    if (!activeConversationId) return [];
    const rawList = allMessages[activeConversationId] || [];
    return rawList.filter(msg => 
      isMessageVisibleInConversation(msg, activeConversationId, currentUser.id, targetPeer?.id, isAdmin)
    );
  }, [allMessages, activeConversationId, currentUser.id, targetPeer?.id, isAdmin]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    // Mark conversation as read
    setAllConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
  };

  const handleSendMessage = (
    text: string,
    attachments?: MessageAttachment[],
    voiceNote?: { audioUrl: string; duration: number; waveform?: number[] },
    replyToId?: string
  ) => {
    if (!activeConversationId) return;

    const replyTarget = replyToId ? currentMessages.find(m => m.id === replyToId) : undefined;
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId: activeConversationId,
      senderId: currentUser.id,
      receiverId: targetPeer?.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: text,
      timestamp: Date.now(),
      formattedTime,
      deliveryStatus: 'sent',
      attachments,
      voiceNote: voiceNote ? {
        audioUrl: voiceNote.audioUrl,
        duration: voiceNote.duration,
        waveform: voiceNote.waveform || [30, 45, 60, 80, 50, 40]
      } : undefined,
      replyTo: replyTarget ? {
        id: replyTarget.id,
        senderName: replyTarget.senderName,
        content: replyTarget.content || 'Voice / Media'
      } : undefined,
      reactions: []
    };

    // Append to messages
    setAllMessages(prev => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMsg]
    }));

    // Update conversation lastMessage
    setAllConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return {
          ...c,
          lastMessage: {
            id: newMsg.id,
            senderId: currentUser.id,
            senderName: currentUser.name,
            text: text || (voiceNote ? '🎤 Voice message' : '📎 Attachment'),
            timestamp: Date.now(),
            formattedTime,
            deliveryStatus: 'sent'
          }
        };
      }
      return c;
    }));
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    setAllMessages(prev => ({
      ...prev,
      [activeConversationId]: (prev[activeConversationId] || []).map(m =>
        m.id === messageId ? { ...m, content: newText, isEdited: true } : m
      )
    }));
  };

  // Master delete function (supports both author and Admin override)
  const handleDeleteMessage = (messageId: string) => {
    setAllMessages(prev => ({
      ...prev,
      [activeConversationId]: (prev[activeConversationId] || []).filter(m => m.id !== messageId)
    }));
  };

  const handleTogglePinMessage = (messageId: string) => {
    setAllMessages(prev => ({
      ...prev,
      [activeConversationId]: (prev[activeConversationId] || []).map(m =>
        m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
      )
    }));
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    setAllMessages(prev => ({
      ...prev,
      [activeConversationId]: (prev[activeConversationId] || []).map(m => {
        if (m.id !== messageId) return m;

        const currentReactions = m.reactions || [];
        const existingIdx = currentReactions.findIndex(r => r.emoji === emoji);

        if (existingIdx >= 0) {
          const existing = currentReactions[existingIdx];
          const hasReacted = existing.users.includes(currentUser.id);

          let updatedReactions;
          if (hasReacted) {
            const newUsers = existing.users.filter(u => u !== currentUser.id);
            if (newUsers.length === 0) {
              updatedReactions = currentReactions.filter(r => r.emoji !== emoji);
            } else {
              updatedReactions = [...currentReactions];
              updatedReactions[existingIdx] = {
                ...existing,
                count: existing.count - 1,
                users: newUsers
              };
            }
          } else {
            updatedReactions = [...currentReactions];
            updatedReactions[existingIdx] = {
              ...existing,
              count: existing.count + 1,
              users: [...existing.users, currentUser.id]
            };
          }
          return { ...m, reactions: updatedReactions };
        } else {
          return {
            ...m,
            reactions: [...currentReactions, { emoji, count: 1, users: [currentUser.id] }]
          };
        }
      })
    }));
  };

  const handleCreateConversation = (newConv: Conversation) => {
    // Check if direct conversation already exists
    const existing = allConversations.find(c => c.id === newConv.id);
    if (existing) {
      setActiveConversationId(existing.id);
      return;
    }

    setAllConversations(prev => [newConv, ...prev]);
    setAllMessages(prev => ({
      ...prev,
      [newConv.id]: []
    }));
    setActiveConversationId(newConv.id);
  };

  // Direct DM starter from search results
  const handleStartDirectChatWithUser = (targetUser: ChatUser) => {
    const directConvId = getDirectConversationId(currentUser.id, targetUser.id);
    const existing = allConversations.find(c => c.id === directConvId);
    
    if (existing) {
      setActiveConversationId(existing.id);
    } else {
      const newConv: Conversation = {
        id: directConvId,
        type: 'direct',
        name: targetUser.name,
        avatar: targetUser.avatar,
        description: targetUser.customStatus || 'Direct Message',
        participants: [currentUser, targetUser],
        unreadCount: 0,
      };
      setAllConversations(prev => [newConv, ...prev]);
      setAllMessages(prev => ({ ...prev, [directConvId]: [] }));
      setActiveConversationId(directConvId);
    }
  };

  // LiveKit Call Handlers
  const handleStartCall = (callType: 'audio' | 'video') => {
    if (!targetPeer) return;

    const roomId = `call_${getDirectConversationId(currentUser.id, targetPeer.id)}`;
    const callSignal: CallSignal = {
      id: `call_${Date.now()}`,
      roomId,
      conversationId: activeConversationId,
      caller: currentUser,
      receiverId: targetPeer.id,
      receiverName: targetPeer.name,
      callType,
      status: 'ringing',
      timestamp: Date.now()
    };

    // Store signal to trigger peer's incoming call modal
    localStorage.setItem(STORAGE_CALL_SIGNAL_KEY, JSON.stringify(callSignal));
    ringtoneService.playOutgoingRing();
    setActiveCallSession(callSignal);
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingCallSignal) return;
    const acceptedSignal: CallSignal = {
      ...incomingCallSignal,
      status: 'accepted'
    };
    localStorage.setItem(STORAGE_CALL_SIGNAL_KEY, JSON.stringify(acceptedSignal));
    setActiveCallSession(acceptedSignal);
    setIncomingCallSignal(null);
  };

  const handleDeclineIncomingCall = () => {
    if (!incomingCallSignal) return;
    const declinedSignal: CallSignal = {
      ...incomingCallSignal,
      status: 'declined'
    };
    localStorage.setItem(STORAGE_CALL_SIGNAL_KEY, JSON.stringify(declinedSignal));
    setIncomingCallSignal(null);
  };

  const handleHangupActiveCall = () => {
    if (!activeCallSession) return;
    const endedSignal: CallSignal = {
      ...activeCallSession,
      status: 'ended'
    };
    localStorage.setItem(STORAGE_CALL_SIGNAL_KEY, JSON.stringify(endedSignal));
    setActiveCallSession(null);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-white dark:bg-zinc-950 relative">
      {/* Sidebar */}
      <ChatSidebar
        conversations={visibleConversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={() => setShowNewChatModal(true)}
        onStartDirectChatWithUser={handleStartDirectChatWithUser}
        currentUser={currentUser}
        isAdminModeratorMode={isAdminModeratorMode}
        onToggleAdminModeratorMode={() => setIsAdminModeratorMode(!isAdminModeratorMode)}
      />

      {/* Main Conversation Area */}
      {activeConversation ? (
        <ChatArea
          conversation={activeConversation}
          messages={currentMessages}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onTogglePinMessage={handleTogglePinMessage}
          onAddReaction={handleAddReaction}
          onStartCall={handleStartCall}
          isTyping={isTyping}
          typingUserName={typingUserName}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Send className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">
            {isAdminModeratorMode ? 'Select a conversation to inspect thread' : 'No active conversations'}
          </p>
          <p className="text-xs text-zinc-500 max-w-sm">
            {isAdminModeratorMode
              ? 'Admin Moderator Mode active. Select any platform conversation from the sidebar to inspect logs.'
              : 'Start a private direct message or group chat to begin messaging with end-to-end privacy.'}
          </p>
          {!isAdminModeratorMode && (
            <button
              onClick={() => setShowNewChatModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Chat</span>
            </button>
          )}
        </div>
      )}

      {/* Create Chat/Channel Modal */}
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onCreateConversation={handleCreateConversation}
          currentUser={currentUser}
        />
      )}

      {/* Incoming Call Ringing Modal */}
      {incomingCallSignal && (
        <IncomingCallModal
          callSignal={incomingCallSignal}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* Active LiveKit Call Overlay */}
      {activeCallSession && (
        <ChatLiveCallOverlay
          callSignal={activeCallSession}
          currentUser={currentUser}
          onHangup={handleHangupActiveCall}
        />
      )}
    </div>
  );
}
