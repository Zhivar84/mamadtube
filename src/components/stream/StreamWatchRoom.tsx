/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Tv2, 
  Users, 
  Share2, 
  Radio, 
  Sparkles, 
  Layers, 
  ArrowLeft, 
  Check, 
  ShieldCheck, 
  AlertCircle,
  Bell,
  Eye,
  RefreshCw,
  Send,
  MessageSquare,
  Flame,
  Heart,
  ThumbsUp,
  PartyPopper,
  Rocket,
  Zap
} from 'lucide-react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'motion/react';
import { LiveStream, LiveChatMessage } from '../../types/stream';
import { useApp } from '../../context/AppContext';
import UserAvatar from '../common/UserAvatar';

interface StreamWatchRoomProps {
  stream: LiveStream;
  chatMessages?: LiveChatMessage[];
  onSendMessage?: (text: string) => void;
  onDeleteMessage?: (msgId: string) => void;
  onNavigateBack: () => void;
  onSwitchStream: (streamId: string) => void;
  allStreams: LiveStream[];
}

export default function StreamWatchRoom({
  stream,
  onNavigateBack,
  onSwitchStream,
  allStreams
}: StreamWatchRoomProps) {
  const { auth } = useApp();
  const currentUser = auth.user;

  // Video playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [isStreamLive, setIsStreamLive] = useState(stream.isLive);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hlsError, setHlsError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(stream.viewerCount || 1);
  const [isFollowing, setIsFollowing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Chat & Reaction State
  const [chatList, setChatList] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: string; emoji: string; left: number }>>([]);
  const [showControls, setShowControls] = useState(true);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const playlistUrl = `/api/stream/playlist/${stream.roomId}.m3u8`;

  // 1. Initialize HLS Player
  useEffect(() => {
    let isMounted = true;
    const video = videoRef.current;
    if (!video) return;

    setHlsError(null);
    setIsBuffering(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5,
        maxBufferLength: 6,
        maxMaxBufferLength: 12,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 8000,
        manifestLoadingMaxRetry: 10,
        levelLoadingTimeOut: 8000,
        fragLoadingTimeOut: 8000,
      });

      hls.loadSource(playlistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isMounted) return;
        setIsBuffering(false);
        setIsStreamLive(true);
        video.play().catch(() => {
          // Autoplay policy might require muted initially
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (!isMounted) return;
        setIsBuffering(false);
        setIsStreamLive(true);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!isMounted) return;
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover network error or wait for host to start
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setIsStreamLive(false);
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = playlistUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        video.play().catch(() => {});
      });
    }

    return () => {
      isMounted = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream.roomId, playlistUrl]);

  // 2. Poll stream status & send viewer heartbeat
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/stream/status/${stream.roomId}`);
        if (res.ok) {
          const data = await res.json();
          setIsStreamLive(data.isLive);
          if (data.viewerCount !== undefined) {
            setViewerCount(data.viewerCount);
          }
        }
      } catch (e) {}

      // Send viewer heartbeat
      try {
        await fetch(`/api/stream/heartbeat/${stream.roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewerId: currentUser?.id || 'viewer_' + Math.random() })
        });
      } catch (e) {}
    };

    checkStatus();
    interval = setInterval(checkStatus, 6000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stream.roomId, currentUser?.id]);

  // 3. Connect to Live Chat SSE Events
  useEffect(() => {
    const sse = new EventSource(`/api/stream/chat/${stream.roomId}/events`);

    sse.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.recentMessages) {
          setChatList(data.recentMessages);
        }
        if (data.viewerCount) {
          setViewerCount(data.viewerCount);
        }
      } catch (err) {}
    });

    sse.addEventListener('chat_message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        setChatList(prev => [...prev.slice(-80), msg]);
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (err) {}
    });

    sse.addEventListener('viewer_count', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.viewerCount !== undefined) {
          setViewerCount(data.viewerCount);
        }
      } catch (err) {}
    });

    sse.addEventListener('reaction', (e: MessageEvent) => {
      try {
        const reaction = JSON.parse(e.data);
        const rxId = 'rx_' + Date.now() + Math.random();
        setFloatingEmojis(prev => [
          ...prev.slice(-20),
          { id: rxId, emoji: reaction.emoji, left: Math.floor(Math.random() * 70) + 15 }
        ]);
        setTimeout(() => {
          setFloatingEmojis(prev => prev.filter(r => r.id !== rxId));
        }, 3000);
      } catch (err) {}
    });

    sse.addEventListener('stream_ended', () => {
      setIsStreamLive(false);
    });

    return () => {
      sse.close();
    };
  }, [stream.roomId]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Handle Mute/Unmute
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Handle Volume Change
  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard Shortcuts (F for fullscreen, Space for play/pause, M for mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsTheater(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isMuted, isPlaying]);

  // Controls auto-hide timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Send Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const payload = {
      senderId: currentUser?.id || 'viewer',
      senderName: currentUser?.displayName || 'Viewer',
      senderAvatar: currentUser?.avatarUrl || '',
      role: (currentUser?.displayName === stream.streamer.name || currentUser?.id === stream.streamer.id) ? 'host' : 'viewer',
      text: chatInput.trim()
    };

    setChatInput('');

    try {
      await fetch(`/api/stream/chat/${stream.roomId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to post chat:', err);
    }
  };

  // Send Emoji Reaction
  const handleSendReaction = async (emoji: string) => {
    try {
      await fetch(`/api/stream/chat/${stream.roomId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, senderName: currentUser?.displayName || 'Viewer' })
      });
    } catch (err) {}
  };

  const copyShareUrl = () => {
    const url = `${window.location.origin}/stream/watch/${stream.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const otherLiveStreams = allStreams.filter(s => s.id !== stream.id);

  return (
    <div id="stream-watch-room-root" className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 flex flex-col">
      
      {/* Top Breadcrumb Bar */}
      <div className="h-12 px-4 sm:px-6 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            id="watch-back-btn"
            onClick={onNavigateBack}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Back to Streams"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm text-zinc-200 truncate max-w-[200px] sm:max-w-md">
              {stream.title}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
              HLS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="watch-share-btn"
            onClick={copyShareUrl}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Column: Video Player Stage + Channel Info */}
        <div className={`flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto ${isTheater ? 'lg:w-full' : ''}`}>
          
          {/* Main Video Player Container */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onDoubleClick={toggleFullscreen}
            className="relative aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl group select-none flex items-center justify-center"
          >
            {/* HTML5 Native Video Tag for HLS Stream */}
            <video
              ref={videoRef}
              playsInline
              className="w-full h-full object-contain"
              onClick={togglePlay}
            />

            {/* Floating Live Reaction Particle Burst */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              <AnimatePresence>
                {floatingEmojis.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 1, y: '80%', x: `${item.left}%`, scale: 0.8 }}
                    animate={{ opacity: 0, y: '-20%', scale: 1.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.5, ease: 'easeOut' }}
                    className="absolute bottom-6 text-3xl sm:text-4xl filter drop-shadow-md select-none"
                  >
                    {item.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Offline Radar Screen if Stream is not broadcasting */}
            {!isStreamLive && (
              <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-4 z-10">
                <div className="relative flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-ping absolute" />
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 relative z-10 shadow-xl">
                    <Radio className="w-7 h-7 text-indigo-400" />
                  </div>
                </div>
                
                <div className="max-w-md space-y-1.5">
                  <h3 className="font-bold text-base text-zinc-100">Broadcast is Offline</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {stream.streamer.name} is currently offline or preparing their next broadcast. You can stay in the room or check other live channels.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (hlsRef.current) {
                      hlsRef.current.loadSource(playlistUrl);
                      hlsRef.current.startLoad();
                    }
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-zinc-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check for Live Stream</span>
                </button>
              </div>
            )}

            {/* Top Bar Over Video: Live Badge & Viewers */}
            <div
              className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2">
                {isStreamLive ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-600/90 text-white rounded-full text-xs font-bold shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>LIVE</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-zinc-800/80 text-zinc-400 rounded-full text-xs font-medium border border-zinc-700">
                    OFFLINE
                  </div>
                )}

                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs text-zinc-200 border border-white/10">
                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-semibold">{viewerCount}</span>
                </div>
              </div>

              <div className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[11px] font-mono text-zinc-300 border border-white/10">
                720p HD · HLS
              </div>
            </div>

            {/* Video Controls Bar Overlay */}
            <div
              className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Left: Play/Pause, Volume */}
              <div className="flex items-center gap-3">
                <button
                  id="player-play-btn"
                  onClick={togglePlay}
                  className="p-2 text-white hover:text-indigo-400 transition-colors cursor-pointer"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <div className="flex items-center gap-2 group/vol">
                  <button
                    id="player-mute-btn"
                    onClick={toggleMute}
                    className="p-1.5 text-white hover:text-indigo-400 transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 sm:w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              {/* Right: Theater Mode & Fullscreen */}
              <div className="flex items-center gap-2">
                <button
                  id="player-theater-btn"
                  onClick={() => setIsTheater(!isTheater)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isTheater ? 'text-indigo-400' : 'text-white hover:text-indigo-400'
                  }`}
                  title="Theater Mode (T)"
                >
                  <Tv2 className="w-5 h-5" />
                </button>

                <button
                  id="player-fullscreen-btn"
                  onClick={toggleFullscreen}
                  className="p-2 text-white hover:text-indigo-400 transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Channel / Broadcaster Details */}
          <div className="mt-4 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={stream.streamer.name}
                avatarUrl={stream.streamer.avatar}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-sm sm:text-base text-zinc-100">{stream.streamer.name}</h2>
                  {stream.streamer.isVerified && (
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  {stream.streamer.handle} · {stream.category}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                id="watch-follow-btn"
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isFollowing
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isFollowing ? 'Subscribed' : 'Subscribe'}</span>
              </button>
            </div>
          </div>

          {/* Description & Tags */}
          <div className="mt-3 p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 space-y-2 text-xs">
            <h4 className="font-semibold text-zinc-200 text-sm">{stream.title}</h4>
            <p className="text-zinc-400 leading-relaxed">{stream.description}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {stream.tags.map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[11px] text-zinc-300 font-medium">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          {/* Recommended Channels List */}
          {otherLiveStreams.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400">Other Active Channels</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {otherLiveStreams.map((other) => (
                  <div
                    key={other.id}
                    onClick={() => onSwitchStream(other.id)}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-850 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 cursor-pointer transition-all hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={other.streamer.name} avatarUrl={other.streamer.avatar} size="md" />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-zinc-100 truncate">{other.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{other.streamer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-red-400 font-semibold px-2 py-0.5 rounded-full bg-red-500/10 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>{other.viewerCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live Chat & Emoji Reactions Sidebar */}
        <aside className="w-full lg:w-84 sm:w-88 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col flex-shrink-0 h-[450px] lg:h-auto">
          {/* Chat Header */}
          <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-xs text-zinc-100">Live Stream Chat</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-medium">
              Realtime SSE
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            <div className="p-2.5 bg-indigo-950/20 border border-indigo-800/30 rounded-xl text-indigo-300 text-[11px] leading-relaxed">
              👋 Welcome to the live chat! Be respectful to the streamer and other viewers.
            </div>

            {chatList.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/40">
                <UserAvatar name={msg.senderName} avatarUrl={msg.senderAvatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`font-semibold truncate ${
                      msg.role === 'host' ? 'text-amber-400 font-bold' : 'text-zinc-200'
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
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Reaction Bar */}
          <div className="px-3 py-1.5 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between">
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
          <form onSubmit={handleSendChat} className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send a message..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>

      </div>

    </div>
  );
}
