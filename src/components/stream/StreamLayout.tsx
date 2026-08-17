/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LiveStream, LiveChatMessage } from '../../types/stream';
import { SEED_LIVE_STREAMS, INITIAL_STREAM_CHAT_MESSAGES } from '../../data/streamSeedData';
import StreamHubView from './StreamHubView';
import StreamWatchRoom from './StreamWatchRoom';
import StreamStudio from './StreamStudio';

type StreamSubView = 'hub' | 'watch' | 'studio';

const STORAGE_STREAMS_KEY = 'mamadtube_live_streams_v2';
const STORAGE_CHATS_KEY = 'mamadtube_stream_chats_v2';

export default function StreamLayout() {
  const { auth } = useApp();
  const currentUser = auth.user;

  // Streams state with persistence
  const [streams, setStreams] = useState<LiveStream[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STREAMS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed parsing streams:', e);
      return [];
    }
  });

  // Chat messages state with persistence
  const [chatMap, setChatMap] = useState<Record<string, LiveChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHATS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed parsing stream chats:', e);
      return {};
    }
  });

  // Active view
  const [currentView, setCurrentView] = useState<StreamSubView>('hub');
  const [activeStreamId, setActiveStreamId] = useState<string>(() => {
    return streams[0]?.id || '';
  });
  const [isHostBroadcasting, setIsHostBroadcasting] = useState(false);

  // Sync streams to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_STREAMS_KEY, JSON.stringify(streams));
  }, [streams]);

  // Sync chats to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(chatMap));
  }, [chatMap]);

  // Active stream object
  const activeStream = streams.find(s => s.id === activeStreamId) || streams[0];
  const activeRoomId = activeStream?.roomId || (currentUser ? 'room_user_' + currentUser.id : 'room_global_stream');
  const currentRoomMessages = activeRoomId ? (chatMap[activeRoomId] || []) : [];

  // Handlers
  const handleSelectStream = (stream: LiveStream) => {
    setActiveStreamId(stream.id);
    setCurrentView('watch');
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !currentUser || !activeRoomId) return;
    const newMsg: LiveChatMessage = {
      id: 'sc_' + Date.now(),
      roomId: activeRoomId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      role: (currentUser.id === activeStream?.streamer?.id || currentUser.displayName === activeStream?.streamer?.name) ? 'host' : 'viewer',
      text,
      timestamp: Date.now(),
      formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMap(prev => ({
      ...prev,
      [activeRoomId]: [...(prev[activeRoomId] || []), newMsg]
    }));
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeRoomId) return;
    setChatMap(prev => ({
      ...prev,
      [activeRoomId]: (prev[activeRoomId] || []).filter(m => m.id !== msgId)
    }));
  };

  const handleStartHostBroadcast = (streamData: Partial<LiveStream>) => {
    if (!currentUser) return;
    const userRoomId = 'room_user_' + (currentUser.handle ? currentUser.handle.replace(/[^a-z0-9]/gi, '_') : currentUser.id);
    const newLiveStream: LiveStream = {
      id: 'stream_user_broadcast',
      roomId: userRoomId,
      title: streamData.title || `${currentUser.displayName}'s Live Broadcast`,
      description: streamData.description || 'Interactive in-browser WebRTC stream on MamadTube!',
      streamer: {
        id: currentUser.id,
        name: currentUser.displayName,
        handle: currentUser.handle || `@${currentUser.displayName.toLowerCase().replace(/\s+/g, '')}`,
        avatar: currentUser.avatarUrl,
        subscribersCount: 1,
        isVerified: true
      },
      category: streamData.category || 'Tech & Coding',
      tags: streamData.tags || ['Live', 'WebRTC'],
      thumbnailUrl: streamData.thumbnailUrl || '',
      isLive: true,
      viewerCount: 1,
      startedAt: Date.now(),
      resolution: '720p30',
      fps: 30,
      bitrateKbps: 1500
    };

    setStreams(prev => [newLiveStream, ...prev.filter(s => s.id !== 'stream_user_broadcast')]);
    setActiveStreamId(newLiveStream.id);
    setIsHostBroadcasting(true);
  };

  const handleEndHostBroadcast = () => {
    setIsHostBroadcasting(false);
    setStreams(prev => prev.map(s => {
      if (s.id === 'stream_user_broadcast') {
        return { ...s, isLive: false };
      }
      return s;
    }));
  };

  return (
    <div id="stream-module-root" className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 transition-colors duration-300">
      
      {currentView === 'hub' && (
        <StreamHubView
          streams={streams}
          onSelectStream={handleSelectStream}
          onOpenStudio={() => setCurrentView('studio')}
        />
      )}

      {currentView === 'watch' && activeStream && (
        <StreamWatchRoom
          stream={activeStream}
          chatMessages={currentRoomMessages}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onNavigateBack={() => setCurrentView('hub')}
          onSwitchStream={(id) => setActiveStreamId(id)}
          allStreams={streams}
        />
      )}

      {currentView === 'studio' && (
        <StreamStudio
          onStartStream={handleStartHostBroadcast}
          onEndStream={handleEndHostBroadcast}
          isLive={isHostBroadcasting}
          currentLiveStream={streams.find(s => s.id === 'stream_user_broadcast')}
          onNavigateBack={() => setCurrentView('hub')}
        />
      )}

    </div>
  );
}
