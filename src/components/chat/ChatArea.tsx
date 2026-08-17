/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  Pin, 
  Phone, 
  Video, 
  Info, 
  X, 
  Image as ImageIcon, 
  FileText,
  Hash,
  Users,
  Search,
  MoreVertical,
  CornerUpLeft,
  ChevronDown,
  ChevronUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Conversation, ChatMessage, ChatUser, MessageAttachment } from '../../types/chat';
import MessageItem from './MessageItem';
import VoiceRecorder from './VoiceRecorder';
import EmojiReactionPicker from './EmojiReactionPicker';
import UserAvatar from '../common/UserAvatar';

interface ChatAreaProps {
  conversation: Conversation;
  messages: ChatMessage[];
  currentUser: ChatUser;
  onSendMessage: (text: string, attachments?: MessageAttachment[], voiceNote?: any, replyToId?: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onTogglePinMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onStartCall?: (callType: 'audio' | 'video') => void;
  isTyping?: boolean;
  typingUserName?: string;
}

export default function ChatArea({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onTogglePinMessage,
  onAddReaction,
  onStartCall,
  isTyping = false,
  typingUserName = 'Someone'
}: ChatAreaProps) {
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const pinnedMessages = messages.filter(m => m.isPinned);

  // In-chat search matches
  const matchedMessageIds = useMemo(() => {
    if (!inChatSearchQuery.trim()) return [];
    const q = inChatSearchQuery.toLowerCase();
    return messages
      .filter(m => m.content && m.content.toLowerCase().includes(q))
      .map(m => m.id);
  }, [messages, inChatSearchQuery]);

  useEffect(() => {
    if (matchedMessageIds.length > 0) {
      setCurrentMatchIndex(0);
      scrollToMessage(matchedMessageIds[0]);
    }
  }, [matchedMessageIds]);

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-item-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchedMessageIds.length;
    setCurrentMatchIndex(nextIdx);
    scrollToMessage(matchedMessageIds[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
    setCurrentMatchIndex(prevIdx);
    scrollToMessage(matchedMessageIds[prevIdx]);
  };

  // Focus search input when opened
  useEffect(() => {
    if (showInChatSearch) {
      searchInputRef.current?.focus();
    } else {
      setInChatSearchQuery('');
    }
  }, [showInChatSearch]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!inChatSearchQuery.trim()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (editingMessage) {
      if (inputText.trim()) {
        onEditMessage(editingMessage.id, inputText.trim());
      }
      setEditingMessage(null);
      setInputText('');
      return;
    }

    if (!inputText.trim() && pendingAttachments.length === 0) return;

    onSendMessage(
      inputText.trim(),
      pendingAttachments.length > 0 ? pendingAttachments : undefined,
      undefined,
      replyingToMessage ? replyingToMessage.id : undefined
    );

    setInputText('');
    setPendingAttachments([]);
    setReplyingToMessage(null);
    setShowEmojiPicker(false);
  };

  const handleSendVoice = (audioUrl: string, duration: number, waveform: number[]) => {
    onSendMessage(
      '',
      undefined,
      { audioUrl, duration, waveform },
      replyingToMessage ? replyingToMessage.id : undefined
    );
    setIsRecordingVoice(false);
    setReplyingToMessage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const fileType = isImg ? 'image' : isVid ? 'video' : 'document';
      
      const fileUrl = URL.createObjectURL(file);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

      const newAtt: MessageAttachment = {
        id: `att_${Date.now()}_${Math.random()}`,
        type: fileType as any,
        name: file.name,
        url: fileUrl,
        sizeFormatted: `${sizeMB} MB`
      };

      setPendingAttachments(prev => [...prev, newAtt]);
    });

    setShowAttachmentMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEditMessage = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setInputText(msg.content);
    setReplyingToMessage(null);
  };

  const targetPeer = conversation.type === 'direct'
    ? conversation.participants.find(p => p.id !== currentUser.id)
    : null;

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 relative overflow-hidden">
      
      {/* 1. Header Bar */}
      <div className="h-16 px-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {conversation.type === 'channel' ? (
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Hash className="w-5 h-5" />
              </div>
            ) : conversation.avatar && conversation.avatar.trim() !== '' ? (
              <img
                src={conversation.avatar}
                alt={conversation.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-zinc-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center font-bold">
                {conversation.name.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight">{conversation.name}</h2>
              {pinnedMessages.length > 0 && (
                <button
                  onClick={() => setShowPinnedDrawer(!showPinnedDrawer)}
                  className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md font-semibold border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950 transition-colors cursor-pointer"
                >
                  <Pin className="w-3 h-3 fill-current" />
                  <span>{pinnedMessages.length} Pinned</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-xs">
              {conversation.type === 'channel' || conversation.type === 'group'
                ? `${conversation.participants.length} members • ${conversation.description || 'Active'}`
                : targetPeer?.handle ? `${targetPeer.handle} • Direct Message` : 'Direct Message'}
            </p>
          </div>
        </div>

        {/* Action icons: Search, Audio Call, Video Call */}
        <div className="flex items-center gap-1">
          {/* Toggle in-chat message search */}
          <button
            id="toggle-inchat-search-btn"
            onClick={() => setShowInChatSearch(!showInChatSearch)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              showInChatSearch 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title="Search in conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Voice Call */}
          <button
            id="start-audio-call-btn"
            onClick={() => onStartCall && onStartCall('audio')}
            className="p-2 text-slate-500 dark:text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
            title="Start Audio Call (LiveKit WebRTC)"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Video Call */}
          <button
            id="start-video-call-btn"
            onClick={() => onStartCall && onStartCall('video')}
            className="p-2 text-slate-500 dark:text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
            title="Start Video Call (LiveKit WebRTC)"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. In-Chat Message Search Bar */}
      <AnimatePresence>
        {showInChatSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-3 z-10"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={inChatSearchQuery}
                onChange={(e) => setInChatSearchQuery(e.target.value)}
                placeholder="Search messages in this conversation..."
                className="w-full pl-9 pr-8 py-1.5 bg-zinc-950 border border-zinc-700 focus:border-indigo-500 rounded-xl text-xs text-zinc-100 outline-none"
              />
              {inChatSearchQuery && (
                <button
                  onClick={() => setInChatSearchQuery('')}
                  className="absolute right-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Match Counter & Prev/Next arrows */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">
                {matchedMessageIds.length > 0 
                  ? `${currentMatchIndex + 1} of ${matchedMessageIds.length}` 
                  : inChatSearchQuery.trim() ? '0 matches' : ''}
              </span>
              <button
                onClick={handlePrevMatch}
                disabled={matchedMessageIds.length === 0}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg disabled:opacity-40 cursor-pointer"
                title="Previous match"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMatch}
                disabled={matchedMessageIds.length === 0}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg disabled:opacity-40 cursor-pointer"
                title="Next match"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowInChatSearch(false)}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer ml-1"
                title="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Pinned Messages Drawer */}
      <AnimatePresence>
        {showPinnedDrawer && pinnedMessages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-xs z-10"
          >
            <div className="flex items-center gap-2 overflow-hidden truncate">
              <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="font-semibold text-amber-400 flex-shrink-0">Pinned:</span>
              <span className="text-zinc-300 truncate">{pinnedMessages[0].content}</span>
            </div>
            <button
              onClick={() => setShowPinnedDrawer(false)}
              className="text-zinc-400 hover:text-zinc-200 cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400 dark:text-zinc-500">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Send className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">
                End-to-End Private Messaging
              </h3>
              <p className="text-xs max-w-sm text-slate-500 dark:text-zinc-400">
                Messages in this thread are private and strictly visible only to conversation participants.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} id={`msg-item-${msg.id}`}>
              <MessageItem
                message={msg}
                currentUser={currentUser}
                searchQuery={inChatSearchQuery}
                onReply={(m) => setReplyingToMessage(m)}
                onEdit={startEditMessage}
                onDelete={onDeleteMessage}
                onTogglePin={onTogglePinMessage}
                onAddReaction={onAddReaction}
                onAttachmentClick={(url) => setPreviewAttachmentUrl(url)}
              />
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 px-4 py-2 italic animate-pulse">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-200" />
            </div>
            <span>{typingUserName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Reply / Edit Banner */}
      <AnimatePresence>
        {(replyingToMessage || editingMessage) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 py-2 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 overflow-hidden truncate">
              {editingMessage ? (
                <>
                  <span className="text-xs font-bold text-indigo-500">Editing Message:</span>
                  <span className="text-xs text-slate-700 dark:text-zinc-300 truncate">{editingMessage.content}</span>
                </>
              ) : (
                <>
                  <CornerUpLeft className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-500">Replying to {replyingToMessage?.senderName}:</span>
                  <span className="text-xs text-slate-700 dark:text-zinc-300 truncate">{replyingToMessage?.content}</span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setReplyingToMessage(null);
                setEditingMessage(null);
                if (editingMessage) setInputText('');
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Pending Attachments Preview Strip */}
      {pendingAttachments.length > 0 && (
        <div className="px-6 py-2 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-3 overflow-x-auto">
          {pendingAttachments.map((att, idx) => (
            <div key={att.id} className="relative group/att bg-white dark:bg-zinc-800 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center gap-2 flex-shrink-0">
              {att.type === 'image' ? (
                <img src={att.url} alt={att.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <FileText className="w-6 h-6 text-indigo-500" />
              )}
              <div className="max-w-[100px] truncate text-[11px] text-zinc-300 font-semibold">{att.name}</div>
              <button
                onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 7. Bottom Composer */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex-shrink-0 relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
        />

        {isRecordingVoice ? (
          <VoiceRecorder
            onSendVoiceNote={handleSendVoice}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            {/* Attachment Button */}
            <div className="relative">
              <button
                type="button"
                id="chat-attach-btn"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-2.5 text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                title="Attach file or media"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {showAttachmentMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 z-30 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachmentMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    <span>Upload Media</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachmentMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span>Upload Document</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input Text Box */}
            <div className="flex-1 relative flex items-center">
              <input
                id="chat-message-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${conversation.name}...`}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-100 dark:bg-zinc-800/90 focus:bg-white dark:focus:bg-zinc-800 text-xs rounded-2xl border border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 text-slate-900 dark:text-zinc-100 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />

              {/* Emoji Picker Button */}
              <div className="absolute right-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-amber-500 rounded-lg cursor-pointer"
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-30">
                    <EmojiReactionPicker
                      onSelectEmoji={(emoji) => {
                        setInputText(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Voice Record / Send Button */}
            {inputText.trim() || pendingAttachments.length > 0 ? (
              <button
                type="submit"
                id="chat-send-btn"
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-2xl transition-colors cursor-pointer"
                title="Record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </form>
        )}
      </div>

    </div>
  );
}
