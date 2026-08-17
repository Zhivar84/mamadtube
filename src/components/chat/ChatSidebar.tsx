/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Hash, 
  Users, 
  User, 
  MessageSquare, 
  CheckCheck, 
  Check, 
  Pin,
  Circle,
  Filter,
  Send,
  Shield,
  ShieldCheck,
  Eye,
  UserPlus,
  X
} from 'lucide-react';
import { Conversation, ChatType, ChatUser } from '../../types/chat';
import { getDirectConversationId } from '../../utils/chatPrivacy';
import UserAvatar from '../common/UserAvatar';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onStartDirectChatWithUser?: (user: ChatUser) => void;
  currentUser: ChatUser;
  isAdminModeratorMode?: boolean;
  onToggleAdminModeratorMode?: () => void;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onStartDirectChatWithUser,
  currentUser,
  isAdminModeratorMode = false,
  onToggleAdminModeratorMode
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ChatType | 'all'>('all');

  const isAdmin = currentUser.role === 'admin';

  const [registeredUsers, setRegisteredUsers] = useState<ChatUser[]>([]);

  // Load all registered users from server for global user search
  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/users')
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) return null;
        return res.json();
      })
      .then((data) => {
        if (isMounted && data && data.success && Array.isArray(data.users)) {
          const peers: ChatUser[] = data.users
            .filter((u: any) => u.id !== currentUser.id && u.email !== currentUser.id && u.status !== 'banned')
            .map((u: any) => ({
              id: u.id,
              name: u.displayName || u.username || 'User',
              handle: u.handle || `@${(u.username || u.displayName || 'user').toLowerCase().replace(/\s+/g, '')}`,
              avatar: u.avatarUrl || '',
              status: 'online' as const,
              customStatus: u.bio || 'Available',
              role: u.role
            }));
          setRegisteredUsers(peers);
        }
      })
      .catch((err) => console.warn('Could not load chat directory users:', err));

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Filter conversations by search and type
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.text.toLowerCase().includes(q)) ||
        c.participants.some(p => p.name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q));

      const matchesFilter = filterType === 'all' || c.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [conversations, searchQuery, filterType]);

  // Matching registered users not already in active conversations
  const matchingRegisteredPeers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    
    return registeredUsers.filter(user => {
      const matches = user.name.toLowerCase().includes(q) || user.handle.toLowerCase().includes(q);
      if (!matches) return false;
      
      // Check if conversation already exists
      const directConvId = getDirectConversationId(currentUser.id, user.id);
      const exists = conversations.some(c => c.id === directConvId);
      return !exists;
    });
  }, [registeredUsers, searchQuery, conversations, currentUser]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'away':
        return 'bg-amber-500';
      case 'busy':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col flex-shrink-0 select-none">
      {/* Header & User Status */}
      <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatar} size="md" />
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${getStatusColor(currentUser.status)}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight">{currentUser.name}</h3>
              {isAdmin && (
                <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[9px] font-bold">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[130px] font-mono">{currentUser.handle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Admin Moderator Inspector Mode Toggle */}
          {isAdmin && onToggleAdminModeratorMode && (
            <button
              id="admin-moderator-toggle-btn"
              onClick={onToggleAdminModeratorMode}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isAdminModeratorMode 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
              title={isAdminModeratorMode ? "Admin Moderation Active (Viewing All Chats)" : "Toggle Admin Global Chat Inspector"}
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}

          <button
            id="create-new-chat-btn"
            onClick={onNewChat}
            className="p-2 bg-indigo-50 dark:bg-zinc-800 hover:bg-indigo-100 dark:hover:bg-zinc-700 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors cursor-pointer"
            title="New conversation or channel"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Mode Notice Banner */}
      {isAdmin && isAdminModeratorMode && (
        <div className="px-4 py-2 bg-rose-950/40 border-b border-rose-900/50 flex items-center justify-between text-[11px] text-rose-300 font-semibold">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-rose-400" />
            <span>Admin Inspector: Viewing all threads</span>
          </div>
          <span className="text-[10px] bg-rose-900/60 px-1.5 py-0.5 rounded font-mono">GLOBAL</span>
        </div>
      )}

      {/* Real-time Search Field */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
          <input
            id="search-chats-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, @handle, or message..."
            className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 text-xs rounded-xl border border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 text-slate-900 dark:text-zinc-100 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs: All, Direct, Groups, Channels */}
      <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All', icon: MessageSquare },
          { id: 'direct', label: 'Direct', icon: User },
          { id: 'group', label: 'Groups', icon: Users },
          { id: 'channel', label: 'Channels', icon: Hash },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = filterType === tab.id;
          return (
            <button
              key={tab.id}
              id={`filter-chat-${tab.id}-btn`}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs' 
                  : 'bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat List Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-zinc-800/60">
        
        {/* If searching, and matching new peers found from portal directory */}
        {matchingRegisteredPeers.length > 0 && (
          <div className="p-2.5 bg-indigo-950/20 border-b border-indigo-900/30">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 px-1">
              Start New Direct Message ({matchingRegisteredPeers.length})
            </div>
            <div className="space-y-1">
              {matchingRegisteredPeers.map(peer => (
                <div
                  key={peer.id}
                  onClick={() => {
                    if (onStartDirectChatWithUser) {
                      onStartDirectChatWithUser(peer);
                      setSearchQuery('');
                    }
                  }}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar name={peer.name} avatarUrl={peer.avatar} size="sm" />
                    <div className="min-w-0">
                      <h5 className="text-xs font-semibold text-zinc-200 truncate">{peer.name}</h5>
                      <span className="text-[10px] text-zinc-500 font-mono">{peer.handle}</span>
                    </div>
                  </div>
                  <button className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer">
                    <UserPlus className="w-3 h-3" />
                    <span>Chat</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredConversations.length === 0 && matchingRegisteredPeers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-zinc-500 space-y-2">
            <Send className="w-7 h-7 mx-auto text-zinc-500" />
            <p className="text-xs font-semibold text-zinc-300">
              {searchQuery ? `No chats matching "${searchQuery}"` : 'No active conversations'}
            </p>
            <p className="text-[11px] text-zinc-500">
              {searchQuery ? 'Try searching for a different handle or user.' : 'Start a private 1-on-1 direct message.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewChat}
                className="mt-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Start New Chat
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const otherParticipant = conv.type === 'direct' 
              ? conv.participants.find(p => p.id !== currentUser.id) || conv.participants[0]
              : null;

            return (
              <div
                key={conv.id}
                id={`conversation-item-${conv.id}`}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-r-4 border-indigo-600 dark:border-indigo-500' 
                    : 'hover:bg-slate-50/80 dark:hover:bg-zinc-800/50'
                }`}
              >
                {/* Avatar / Channel Icon */}
                <div className="relative flex-shrink-0">
                  {conv.type === 'channel' ? (
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-base shadow-xs">
                      <Hash className="w-5 h-5" />
                    </div>
                  ) : conv.avatar && conv.avatar.trim() !== '' ? (
                    <img 
                      src={conv.avatar} 
                      alt={conv.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-zinc-800 shadow-xs"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center font-bold text-sm">
                      {conv.name.charAt(0)}
                    </div>
                  )}

                  {/* Presence indicator for direct chats */}
                  {conv.type === 'direct' && otherParticipant && (
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${getStatusColor(otherParticipant.status)}`} />
                  )}
                </div>

                {/* Conversation Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className={`text-xs font-bold truncate ${isActive ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-900 dark:text-zinc-100'}`}>
                        {conv.name}
                      </h4>
                      {otherParticipant?.handle && (
                        <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[80px]">
                          {otherParticipant.handle}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                        {conv.lastMessage.formattedTime}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-semibold text-slate-800 dark:text-zinc-200' : 'text-slate-500 dark:text-zinc-400'}`}>
                      {conv.lastMessage 
                        ? `${conv.lastMessage.senderId === currentUser.id ? 'You: ' : ''}${conv.lastMessage.text}`
                        : 'No messages yet'}
                    </p>

                    {/* Unread badge */}
                    {conv.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full text-[10px] font-bold shadow-xs">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
