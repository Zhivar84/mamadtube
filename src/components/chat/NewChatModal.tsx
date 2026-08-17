/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Hash, Users, User } from 'lucide-react';
import { motion } from 'motion/react';
import { ChatType, ChatUser, Conversation } from '../../types/chat';
import { getDirectConversationId } from '../../utils/chatPrivacy';
import UserAvatar from '../common/UserAvatar';

interface NewChatModalProps {
  onClose: () => void;
  onCreateConversation: (newConv: Conversation) => void;
  currentUser: ChatUser;
}

export default function NewChatModal({ onClose, onCreateConversation, currentUser }: NewChatModalProps) {
  const [type, setType] = useState<ChatType>('direct');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [registeredUsers, setRegisteredUsers] = useState<ChatUser[]>([]);

  // Load registered users from server
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
            .filter((u: any) => u.id !== currentUser.id && u.email !== currentUser.id && u.displayName !== currentUser.name && u.status !== 'banned')
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
      .catch((err) => console.warn('Could not load new chat users:', err));

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'direct') {
      let targetUser: ChatUser;

      if (selectedUserId) {
        const found = registeredUsers.find(u => u.id === selectedUserId);
        if (found) {
          targetUser = found;
        } else {
          return;
        }
      } else {
        if (!name.trim()) return;
        targetUser = {
          id: `usr_${Date.now().toString(36)}`,
          name: name.trim(),
          handle: handle.trim() ? (handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`) : `@${name.toLowerCase().replace(/\s+/g, '')}`,
          avatar: '',
          status: 'online',
          customStatus: description.trim() || 'Direct Message',
        };
      }

      // Unique deterministic conversation ID: [userA_id, userB_id].sort().join('_')
      const directConvId = getDirectConversationId(currentUser.id, targetUser.id);

      const newConv: Conversation = {
        id: directConvId,
        type: 'direct',
        name: targetUser.name,
        avatar: targetUser.avatar,
        description: targetUser.customStatus || 'Direct Message',
        participants: [currentUser, targetUser],
        unreadCount: 0,
      };
      onCreateConversation(newConv);
    } else {
      if (!name.trim()) return;

      const newConv: Conversation = {
        id: `conv_${type}_${Date.now()}`,
        type,
        name: type === 'channel' && !name.startsWith('#') ? `#${name.trim()}` : name.trim(),
        description: description.trim(),
        avatar: '',
        participants: [currentUser],
        unreadCount: 0,
      };
      onCreateConversation(newConv);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-bold text-zinc-100 text-sm">Start New Conversation</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Conversation Type Picker */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'direct', label: 'Direct', icon: User },
              { id: 'group', label: 'Group', icon: Users },
              { id: 'channel', label: 'Channel', icon: Hash },
            ].map(item => {
              const Icon = item.icon;
              const isSelected = type === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setType(item.id as ChatType)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 shadow-xs' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {type === 'direct' ? (
            <div className="space-y-3">
              {registeredUsers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Select Existing User
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {registeredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => {
                          if (selectedUserId === user.id) {
                            setSelectedUserId('');
                          } else {
                            setSelectedUserId(user.id);
                            setName(user.name);
                            setHandle(user.handle);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                          selectedUserId === user.id 
                            ? 'bg-indigo-950/40 border-indigo-500' 
                            : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-800/50'
                        }`}
                      >
                        <UserAvatar name={user.name} avatarUrl={user.avatar} size="sm" />
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-200">{user.name}</h4>
                          <p className="text-[10px] text-zinc-500">{user.handle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-800" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-zinc-900 px-2 text-zinc-500 font-semibold">Or enter recipient details</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (selectedUserId) setSelectedUserId('');
                  }}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3 py-2 bg-zinc-950 rounded-lg border border-zinc-800 focus:border-zinc-600 text-zinc-100 text-xs outline-none"
                  required={!selectedUserId}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Username / Handle (Optional)
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@sarahj"
                  className="w-full px-3 py-2 bg-zinc-950 rounded-lg border border-zinc-800 focus:border-zinc-600 text-zinc-100 text-xs outline-none font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {type === 'channel' ? 'Channel Name' : 'Group Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === 'channel' ? 'e.g. general, announcements' : 'e.g. Design Systems, Project X'}
                  className="w-full px-3 py-2 bg-zinc-950 rounded-lg border border-zinc-800 focus:border-zinc-600 text-zinc-100 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this channel or group about?"
                  className="w-full px-3 py-2 bg-zinc-950 rounded-lg border border-zinc-800 focus:border-zinc-600 text-zinc-100 text-xs outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={type === 'direct' ? (!selectedUserId && !name.trim()) : !name.trim()}
              className="px-3.5 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-lg disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              Create Chat
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
