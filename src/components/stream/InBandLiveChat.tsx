/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Crown, 
  Shield, 
  Trash2, 
  Sparkles, 
  Flame, 
  Heart, 
  ThumbsUp, 
  PartyPopper, 
  Rocket, 
  Radio,
  Zap,
  Info
} from 'lucide-react';
import { LiveChatMessage, FloatingReaction, ChatUserRole } from '../../types/stream';
import UserAvatar from '../common/UserAvatar';
import { useApp } from '../../context/AppContext';

interface InBandLiveChatProps {
  roomId: string;
  isHost: boolean;
  streamerName: string;
  initialMessages?: LiveChatMessage[];
}

export default function InBandLiveChat({
  roomId,
  isHost,
  streamerName,
  initialMessages = []
}: InBandLiveChatProps) {
  const { auth } = useApp();
  const currentUser = auth.user;

  const [messages, setMessages] = useState<LiveChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [activeViewers, setActiveViewers] = useState(1);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Connect to SSE stream
  useEffect(() => {
    const sse = new EventSource(`/api/stream/chat/${roomId}/events`);

    sse.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.recentMessages) {
          setMessages(data.recentMessages);
        }
        if (data.viewerCount) {
          setActiveViewers(data.viewerCount);
        }
      } catch (err) {}
    });

    sse.addEventListener('chat_message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        setMessages(prev => [...prev.slice(-100), msg]);
        setTimeout(() => {
          chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (err) {}
    });

    sse.addEventListener('viewer_count', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.viewerCount !== undefined) {
          setActiveViewers(data.viewerCount);
        }
      } catch (err) {}
    });

    sse.addEventListener('reaction', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const newReaction: FloatingReaction = {
          id: 'rx_' + Date.now() + Math.random(),
          emoji: data.emoji,
          xOffset: Math.floor(Math.random() * 60) + 20,
          scale: 1.2,
          duration: 2.5
        };
        setFloatingReactions(prev => [...prev.slice(-15), newReaction]);
        setTimeout(() => {
          setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id));
        }, 3000);
      } catch (err) {}
    });

    return () => {
      sse.close();
    };
  }, [roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const payload = {
      senderId: currentUser?.id || 'viewer',
      senderName: currentUser?.displayName || 'Viewer',
      senderAvatar: currentUser?.avatarUrl || '',
      role: isHost ? 'host' : 'viewer',
      text: inputText.trim()
    };

    setInputText('');

    try {
      await fetch(`/api/stream/chat/${roomId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSendReaction = async (emoji: string) => {
    try {
      await fetch(`/api/stream/chat/${roomId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, senderName: currentUser?.displayName || 'Viewer' })
      });
    } catch (err) {}
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-zinc-100 select-none">
      {/* Chat Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-500 animate-pulse" />
          <h3 className="font-bold text-xs">Live Stream Chat</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[11px] font-mono text-zinc-400">
          {activeViewers} Viewers
        </span>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/40">
            <UserAvatar name={msg.senderName} avatarUrl={msg.senderAvatar} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`font-semibold truncate ${
                  msg.role === 'host' ? 'text-amber-400' : 'text-zinc-200'
                }`}>
                  {msg.senderName}
                </span>
                {msg.role === 'host' && (
                  <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                    HOST
                  </span>
                )}
                <span className="text-[10px] text-zinc-500 ml-auto">{msg.formattedTime}</span>
              </div>
              <p className="text-zinc-300 break-words">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatScrollRef} />
      </div>

      {/* Floating Reaction Bar */}
      <div className="px-3 py-1.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-medium">React:</span>
        {['❤️', '🔥', '👏', '🎉', '🚀', '💯'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendReaction(emoji)}
            className="p-1 hover:bg-zinc-800 rounded-lg text-sm hover:scale-125 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a live message..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
