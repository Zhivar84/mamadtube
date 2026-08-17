/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Smile, 
  Shield, 
  Crown, 
  Gem, 
  Trash2, 
  Clock, 
  MoreVertical, 
  Lock, 
  VolumeX, 
  Flame, 
  Heart, 
  Sparkles, 
  ThumbsUp, 
  PartyPopper, 
  Rocket, 
  SlidersHorizontal,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import { LiveChatMessage, ChatUserRole, FloatingReaction } from '../../types/stream';
import { useApp } from '../../context/AppContext';
import UserAvatar from '../common/UserAvatar';

interface LiveStreamChatProps {
  roomId: string;
  messages: LiveChatMessage[];
  onSendMessage: (text: string) => void;
  onDeleteMessage?: (id: string) => void;
  onClearChat?: () => void;
  isHost?: boolean;
  isModerator?: boolean;
  streamerName: string;
}

export default function LiveStreamChat({
  roomId,
  messages,
  onSendMessage,
  onDeleteMessage,
  onClearChat,
  isHost = false,
  isModerator = false,
  streamerName
}: LiveStreamChatProps) {
  const { auth, theme, toggleTheme } = useApp();
  const currentUser = auth.user;

  const [inputMessage, setInputMessage] = useState('');
  const [showModMenu, setShowModMenu] = useState(false);
  const [slowMode, setSlowMode] = useState<number>(0); // 0 = off, 3, 10, 30
  const [slowModeTimer, setSlowModeTimer] = useState<number>(0);
  const [subOnlyMode, setSubOnlyMode] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<LiveChatMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const reactionContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom smoothly inside the container
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Slow mode countdown
  useEffect(() => {
    if (slowModeTimer > 0) {
      const timer = setTimeout(() => setSlowModeTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [slowModeTimer]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    if (slowModeTimer > 0 && !isHost && !isModerator) return;

    onSendMessage(inputMessage.trim());
    setInputMessage('');

    if (slowMode > 0 && !isHost && !isModerator) {
      setSlowModeTimer(slowMode);
    }
  };

  const triggerReaction = (emoji: string) => {
    const id = 'react_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const xOffset = Math.floor(Math.random() * 80) + 10; // 10% to 90%
    const scale = 0.8 + Math.random() * 0.5;
    const duration = 2.5 + Math.random() * 0.8;

    const newReaction: FloatingReaction = {
      id,
      emoji,
      xOffset,
      scale,
      duration
    };

    setFloatingReactions(prev => [...prev.slice(-20), newReaction]);

    // Clean up after animation duration
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, duration * 1000);
  };

  const quickReactions = ['❤️', '🔥', '🚀', '👏', '🎉', '💯'];

  const getRoleBadge = (role: ChatUserRole) => {
    switch (role) {
      case 'host':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Crown className="w-2.5 h-2.5" />
            <span>HOST</span>
          </span>
        );
      case 'mod':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <Shield className="w-2.5 h-2.5" />
            <span>MOD</span>
          </span>
        );
      case 'vip':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <Gem className="w-2.5 h-2.5" />
            <span>VIP</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      id="live-stream-chat-container"
      className="relative flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs select-none"
    >
      {/* Floating Reactions Layer */}
      <div 
        ref={reactionContainerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden z-20"
      >
        {floatingReactions.map(r => (
          <div
            key={r.id}
            style={{
              left: `${r.xOffset}%`,
              bottom: '50px',
              animation: `floatUp ${r.duration}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
              transform: `scale(${r.scale})`
            }}
            className="absolute text-2xl select-none filter drop-shadow-sm will-change-transform pointer-events-none"
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Top Chat Header */}
      <div className="px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Live Stream Chat
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Chat Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-zinc-600" />}
          </button>

          {/* Host / Moderator Controls Toggle */}
          {(isHost || isModerator) && (
            <button
              id="chat-mod-settings-btn"
              onClick={() => setShowModMenu(!showModMenu)}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                showModMenu 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Host Moderation Tools"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] hidden sm:inline">Mod</span>
            </button>
          )}
        </div>
      </div>

      {/* Moderation Settings Panel */}
      {showModMenu && (isHost || isModerator) && (
        <div 
          id="chat-mod-panel"
          className="p-3 bg-zinc-100/90 dark:bg-zinc-950/90 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Slow Mode</span>
            <div className="flex gap-1">
              {[0, 3, 10, 30].map(seconds => (
                <button
                  key={seconds}
                  id={`slow-mode-${seconds}s`}
                  onClick={() => setSlowMode(seconds)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                    slowMode === seconds
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {seconds === 0 ? 'Off' : `${seconds}s`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Subscribers Only</span>
            <button
              id="sub-only-mode-toggle"
              onClick={() => setSubOnlyMode(!subOnlyMode)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                subOnlyMode 
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {subOnlyMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {onClearChat && (
            <button
              id="clear-chat-history-btn"
              onClick={onClearChat}
              className="w-full py-1 px-2 text-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded border border-red-200 dark:border-red-900/40 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Clear Chat Feed
            </button>
          )}
        </div>
      )}

      {/* Messages Feed Area */}
      <div 
        id="chat-messages-scroll-area"
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-zinc-50/40 dark:bg-zinc-950/30"
      >
        {/* Welcome Notice */}
        <div className="p-2.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
            Welcome to the live chat! Be respectful and adhere to community guidelines.
          </p>
        </div>

        {/* Message Items */}
        {messages.filter(m => !m.isDeleted).map((msg) => {
          const isSender = currentUser && (
            msg.senderId === currentUser.id ||
            msg.senderId === currentUser.email || 
            msg.senderName === currentUser.displayName
          );

          return (
            <div 
              key={msg.id}
              id={`chat-msg-${msg.id}`}
              className={`group relative flex items-start gap-2 text-xs leading-relaxed transition-colors p-1.5 rounded-lg ${
                isSender 
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30' 
                  : 'hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'
              }`}
            >
              <UserAvatar
                name={msg.senderName}
                avatarUrl={msg.senderAvatar}
                size="sm"
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className={`font-semibold truncate ${
                    isSender ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-800 dark:text-zinc-200'
                  }`}>
                    {msg.senderName}
                  </span>
                  {getRoleBadge(msg.role)}
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                    {msg.formattedTime}
                  </span>
                </div>
                <p className="text-zinc-800 dark:text-zinc-200 break-words font-normal text-xs selection:bg-indigo-500/20">
                  {msg.text}
                </p>
              </div>

              {/* Host/Mod Delete Action */}
              {(isHost || isModerator) && onDeleteMessage && (
                <button
                  id={`delete-msg-${msg.id}`}
                  onClick={() => onDeleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 transition-opacity cursor-pointer flex-shrink-0"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Reactions Bar */}
      <div 
        id="quick-reactions-bar"
        className="px-3 py-1.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
      >
        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">React</span>
        <div className="flex items-center gap-1">
          {quickReactions.map((emoji, idx) => (
            <button
              key={idx}
              id={`reaction-btn-${idx}`}
              onClick={() => triggerReaction(emoji)}
              className="p-1 hover:scale-125 transform transition-transform cursor-pointer text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Input Composer Form */}
      <form 
        onSubmit={handleSend}
        className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            id="live-chat-input"
            type="text"
            placeholder={
              slowModeTimer > 0 
                ? `Slow mode active (${slowModeTimer}s)...` 
                : subOnlyMode && !isHost
                ? "Subscribers only mode..."
                : "Chat with the stream..."
            }
            disabled={slowModeTimer > 0 && !isHost && !isModerator}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 disabled:opacity-60 transition-colors"
          />
        </div>
        <button
          id="send-live-chat-btn"
          type="submit"
          disabled={!inputMessage.trim() || (slowModeTimer > 0 && !isHost && !isModerator)}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* CSS for floating reactions */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0px) scale(0.8);
          }
          50% {
            opacity: 0.9;
            transform: translateY(-120px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-240px) scale(1.4);
          }
        }
      `}</style>
    </div>
  );
}
