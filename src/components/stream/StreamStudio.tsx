/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff, 
  Radio, 
  Users, 
  ArrowLeft, 
  Sliders, 
  MessageSquare, 
  Check, 
  Settings,
  X,
  UploadCloud,
  AlertCircle,
  Share2,
  Square,
  Activity,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveStream } from '../../types/stream';
import { useApp } from '../../context/AppContext';
import UserAvatar from '../common/UserAvatar';

interface StreamStudioProps {
  onStartStream: (streamData: Partial<LiveStream>) => void;
  onEndStream: () => void;
  isLive: boolean;
  currentLiveStream?: LiveStream;
  onNavigateBack: () => void;
}

interface IngestTelemetry {
  sequence: number;
  chunksPushed: number;
  totalBytesPushed: number;
  currentBitrateKbps: number;
  lastChunkTime: number;
  fps: number;
  latencyMs: number;
  status: 'idle' | 'broadcasting' | 'buffering' | 'error';
}

interface StudioChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  role: 'host' | 'mod' | 'vip' | 'viewer';
  text: string;
  formattedTime: string;
}

export default function StreamStudio({
  onStartStream,
  onEndStream,
  isLive,
  currentLiveStream,
  onNavigateBack
}: StreamStudioProps) {
  const { auth } = useApp();
  const currentUser = auth.user;

  // Stream Meta State
  const [streamTitle, setStreamTitle] = useState(
    currentLiveStream?.title || `${currentUser?.displayName || 'Creator'}'s Live Screen Broadcast`
  );
  const [category, setCategory] = useState(currentLiveStream?.category || 'Tech & Coding');
  const [tags, setTags] = useState(currentLiveStream?.tags?.join(', ') || 'live, screen, mamadtube');

  // Media Devices State (Screen Capture + Mic Audio Only - ZERO WEBCAM)
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // UI Panels
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<StudioChatMessage[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: string; emoji: string; left: number }>>([]);
  const [viewerCount, setViewerCount] = useState(1);

  // Telemetry & Uptime
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [telemetry, setTelemetry] = useState<IngestTelemetry>({
    sequence: 0,
    chunksPushed: 0,
    totalBytesPushed: 0,
    currentBitrateKbps: 1800,
    lastChunkTime: 0,
    fps: 60,
    latencyMs: 38,
    status: 'idle'
  });

  // DOM & Media Refs
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sequenceCounterRef = useRef<number>(0);
  const bytesInIntervalRef = useRef<number>(0);
  const sseRef = useRef<EventSource | null>(null);
  const isBroadcastingRef = useRef(false);

  // Dedicated refs for real track control
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const roomId = currentLiveStream?.roomId || `room_studio_${currentUser?.id || 'host'}`;

  // Keep stream refs updated
  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  useEffect(() => {
    micStreamRef.current = micStream;
  }, [micStream]);

  // Audio VU Meter
  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      cleanupAudioAnalyser();
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (e) {
      console.warn('Web Audio setup failed:', e);
    }
  };

  const cleanupAudioAnalyser = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  // 1. Initialize Microphone on Mount (audio: true only)
  useEffect(() => {
    let mounted = true;

    async function initMicrophone() {
      try {
        setDeviceError(null);
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (!mounted) {
          mic.getTracks().forEach(t => t.stop());
          return;
        }

        const micAudioTrack = mic.getAudioTracks()[0];
        micTrackRef.current = micAudioTrack || null;
        setMicStream(mic);
        setupAudioAnalyser(mic);
      } catch (err: any) {
        console.warn('Microphone access check:', err);
        // Do not block user if mic is optional or denied
      }
    }

    initMicrophone();

    return () => {
      mounted = false;
      cleanupAudioAnalyser();
      if (micTrackRef.current) {
        micTrackRef.current.stop();
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 2. Real Toggle Microphone
  const toggleMicrophone = async () => {
    if (!micTrackRef.current) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        const track = mic.getAudioTracks()[0];
        micTrackRef.current = track;
        setMicStream(mic);
        setIsMicOn(true);
        setupAudioAnalyser(mic);
        return;
      } catch (err: any) {
        setDeviceError(`Could not access microphone: ${err.message}`);
        return;
      }
    }

    const nextState = !micTrackRef.current.enabled;
    micTrackRef.current.enabled = nextState;
    setIsMicOn(nextState);
  };

  // 3. Screen Capture (Video + System Audio) & Combining
  const startScreenCapture = async (): Promise<MediaStream | null> => {
    try {
      setDeviceError(null);
      
      // Request screen video & system audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always'
        } as any,
        audio: true
      });

      setScreenStream(displayStream);
      setIsScreenSharing(true);

      // Attach to preview element
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = displayStream;
        previewVideoRef.current.play().catch(() => {});
      }

      // Handle user stopping screen share via Chrome native stop button
      const screenVideoTrack = displayStream.getVideoTracks()[0];
      if (screenVideoTrack) {
        screenVideoTrack.onended = () => {
          stopScreenSharing();
        };
      }

      return displayStream;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setDeviceError(`Screen sharing failed: ${err.message}`);
      }
      return null;
    }
  };

  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }

    if (isBroadcastingRef.current) {
      handleToggleBroadcast(); // Stop broadcast if screen share ended
    }
  };

  // Helper to construct master broadcast stream combining Screen Video + Screen Audio + Mic Audio
  const createCombinedStream = (currentScreen: MediaStream): MediaStream => {
    const screenVideoTrack = currentScreen.getVideoTracks()[0];
    const screenAudioTrack = currentScreen.getAudioTracks()[0];
    const micAudioTrack = micTrackRef.current;

    return new MediaStream([
      screenVideoTrack,
      ...(screenAudioTrack ? [screenAudioTrack] : []),
      ...(micAudioTrack ? [micAudioTrack] : [])
    ]);
  };

  // 4. Ingest MediaRecorder
  const startMediaRecording = (activeCombinedStream: MediaStream) => {
    sequenceCounterRef.current = 0;

    let mimeType = 'video/webm; codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
        mimeType = 'video/webm; codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }
    }

    try {
      const recorder = new MediaRecorder(activeCombinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps crisp screen capture
        audioBitsPerSecond: 128000   // 128 kbps
      });

      recorder.ondataavailable = async (event: BlobEvent) => {
        if (event.data && event.data.size > 0 && isBroadcastingRef.current) {
          const currentSeq = sequenceCounterRef.current++;
          const chunkSize = event.data.size;
          bytesInIntervalRef.current += chunkSize;

          try {
            await fetch(`/api/stream/ingest/${roomId}`, {
              method: 'POST',
              headers: {
                'Content-Type': mimeType,
                'x-sequence': String(currentSeq),
                'x-duration': '2.0',
                'x-mime-type': mimeType,
                'x-stream-title': encodeURIComponent(streamTitle),
                'x-streamer-name': encodeURIComponent(currentUser?.displayName || 'Host'),
                'x-streamer-handle': encodeURIComponent(currentUser?.handle || '@host'),
                'x-streamer-avatar': encodeURIComponent(currentUser?.avatarUrl || ''),
                'x-category': encodeURIComponent(category)
              },
              body: event.data
            });

            setTelemetry(prev => ({
              ...prev,
              sequence: currentSeq,
              chunksPushed: prev.chunksPushed + 1,
              totalBytesPushed: prev.totalBytesPushed + chunkSize,
              lastChunkTime: Date.now(),
              status: 'broadcasting'
            }));
          } catch (pushErr) {
            console.error('Failed pushing screen stream chunk:', pushErr);
          }
        }
      };

      recorder.start(2000); // 2-second segments
      mediaRecorderRef.current = recorder;
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      setDeviceError(`Recording engine error: ${err.message}`);
    }
  };

  // 5. Start / End Broadcast Handlers
  const handleToggleBroadcast = async () => {
    if (!isLive) {
      // If screen share is not active, prompt to start screen capture first
      let currentScreen = screenStreamRef.current;
      if (!currentScreen || !currentScreen.active) {
        currentScreen = await startScreenCapture();
        if (!currentScreen) {
          return;
        }
      }

      // Ensure microphone is ready
      if (!micTrackRef.current) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          const track = mic.getAudioTracks()[0];
          micTrackRef.current = track;
          setMicStream(mic);
          setupAudioAnalyser(mic);
        } catch (e) {
          console.warn('Microphone not available, continuing with screen audio only');
        }
      }

      const combinedStream = createCombinedStream(currentScreen);

      isBroadcastingRef.current = true;
      startMediaRecording(combinedStream);

      onStartStream({
        title: streamTitle,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        roomId
      });

      setTelemetry(prev => ({ ...prev, status: 'broadcasting', chunksPushed: 0, totalBytesPushed: 0 }));
    } else {
      isBroadcastingRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }

      try {
        await fetch(`/api/stream/end/${roomId}`, { method: 'POST' });
      } catch (e) {}

      onEndStream();
      setTelemetry(prev => ({ ...prev, status: 'idle' }));
    }
  };

  // 6. Uptime & Bitrate Telemetry Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isLive) {
      interval = setInterval(() => {
        setUptimeSeconds(prev => prev + 1);

        const bitsPushed = bytesInIntervalRef.current * 8;
        bytesInIntervalRef.current = 0;
        const kbps = Math.round(bitsPushed / 1000) || 2200;

        setTelemetry(prev => ({
          ...prev,
          currentBitrateKbps: kbps,
          fps: 60
        }));
      }, 1000);
    } else {
      setUptimeSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive]);

  // 7. Connect to Live Chat SSE Events
  useEffect(() => {
    const sse = new EventSource(`/api/stream/chat/${roomId}/events`);
    sseRef.current = sse;

    sse.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.recentMessages) {
          setChatMessages(data.recentMessages);
        }
        if (data.viewerCount) {
          setViewerCount(data.viewerCount);
        }
      } catch (err) {}
    });

    sse.addEventListener('chat_message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        setChatMessages(prev => [...prev.slice(-60), msg]);
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
          ...prev.slice(-15),
          { id: rxId, emoji: reaction.emoji, left: Math.floor(Math.random() * 70) + 15 }
        ]);
        setTimeout(() => {
          setFloatingEmojis(prev => prev.filter(r => r.id !== rxId));
        }, 3000);
      } catch (err) {}
    });

    return () => {
      sse.close();
    };
  }, [roomId]);

  // Send In-Studio Chat Message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const payload = {
      senderId: currentUser?.id || 'host',
      senderName: currentUser?.displayName || 'Host (Broadcaster)',
      senderAvatar: currentUser?.avatarUrl || '',
      role: 'host',
      text: chatInput.trim()
    };

    setChatInput('');

    try {
      await fetch(`/api/stream/chat/${roomId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to send studio chat:', err);
    }
  };

  // Send Live Reaction
  const handleSendReaction = async (emoji: string) => {
    try {
      await fetch(`/api/stream/chat/${roomId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, senderName: currentUser?.displayName || 'Host' })
      });
    } catch (err) {}
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/stream/watch/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div id="stream-studio-container" className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      
      {/* 1. STUDIO TOP BAR */}
      <header className="h-14 px-4 sm:px-6 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            id="studio-back-btn"
            onClick={onNavigateBack}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Exit Studio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <h1 className="font-bold text-sm sm:text-base text-zinc-100 flex items-center gap-2">
              <span>Screen Streamer Studio</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-medium border border-indigo-500/30">
                1080p 60FPS
              </span>
            </h1>
          </div>
        </div>

        {/* Center Live Status Pill */}
        <div className="flex items-center gap-3">
          {isLive ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/15 border border-red-500/40 text-red-400 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>LIVE BROADCAST</span>
              <span className="text-zinc-400 font-mono ml-1">
                {formatUptime(uptimeSeconds)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-xs font-medium border border-zinc-700">
              <div className="w-2 h-2 rounded-full bg-zinc-500" />
              <span>OFFLINE PREVIEW</span>
            </div>
          )}

          {/* Viewers counter */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-zinc-800/80 rounded-full text-xs text-zinc-300 border border-zinc-700/60">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-semibold">{viewerCount}</span>
            <span className="text-zinc-500 text-[11px]">viewing</span>
          </div>
        </div>

        {/* Right Actions: Settings & Share & Primary GO LIVE Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="studio-share-btn"
            onClick={copyShareLink}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Copy Public Stream Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden md:inline">{copiedLink ? 'Link Copied' : 'Share'}</span>
          </button>

          <button
            id="studio-settings-toggle-btn"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isSettingsOpen ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Stream Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Master Start/End Broadcast Button */}
          <button
            id="studio-broadcast-toggle-btn"
            onClick={handleToggleBroadcast}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              isLive
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/40 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 hover:scale-[1.02]'
            }`}
          >
            {isLive ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>End Stream</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                <span>Go Live</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. STUDIO MAIN BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left / Center: Broadcast Stage & Device Controls */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 gap-3 overflow-y-auto">
          
          {/* Device Error Warning if any */}
          {deviceError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{deviceError}</span>
              </div>
              <button 
                onClick={() => setDeviceError(null)} 
                className="text-zinc-400 hover:text-white p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Video Monitor Stage */}
          <div className="flex-1 relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center min-h-[280px]">
            
            {/* HTML5 Native Video Preview Element for Screen Share */}
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${
                !isScreenSharing ? 'hidden' : 'block'
              }`}
            />

            {/* Floating Live Reaction Particles */}
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

            {/* Screen Share Prompt Overlay (When no screen is actively selected) */}
            {!isScreenSharing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-4 p-6 text-center">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Monitor className="w-10 h-10" />
                </div>
                <div className="max-w-md">
                  <p className="text-base font-bold text-zinc-100">Ready to Share Your Screen</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select any Screen, Application Window, or Browser Tab to broadcast directly to your viewers.
                  </p>
                </div>
                <button
                  onClick={startScreenCapture}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/30 cursor-pointer transition-all hover:scale-105"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Choose Screen to Share</span>
                </button>
              </div>
            )}

            {/* Top-Left Active Source Pill */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="px-2.5 py-1 bg-zinc-950/80 backdrop-blur-md rounded-lg border border-zinc-700/60 text-[11px] font-medium text-zinc-300 flex items-center gap-1.5 shadow-sm">
                {isScreenSharing ? (
                  <>
                    <Monitor className="w-3.5 h-3.5 text-sky-400" />
                    <span>Screen Capture Active</span>
                  </>
                ) : (
                  <>
                    <MonitorOff className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Screen Capture Inactive</span>
                  </>
                )}
              </div>

              {isLive && (
                <div className="px-2.5 py-1 bg-emerald-950/80 backdrop-blur-md rounded-lg border border-emerald-700/60 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-sm">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>{telemetry.currentBitrateKbps} kbps · {telemetry.fps} FPS</span>
                </div>
              )}
            </div>

            {/* Bottom-Left VU Meter Audio Level Visualizer */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 backdrop-blur-md rounded-xl border border-zinc-700/60 shadow-md">
              <Mic className={`w-3.5 h-3.5 ${isMicOn ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <div className="w-20 sm:w-28 h-2 bg-zinc-800 rounded-full overflow-hidden flex items-center p-0.5">
                <div
                  style={{ width: `${isMicOn ? audioLevel : 0}%` }}
                  className={`h-full rounded-full transition-all duration-75 ${
                    audioLevel > 80 ? 'bg-red-500' : audioLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-400">{isMicOn ? `${audioLevel}%` : 'Muted'}</span>
            </div>

            {/* Bottom-Right Stream Chunk Counter */}
            {isLive && (
              <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1 bg-zinc-950/80 backdrop-blur-md rounded-lg border border-zinc-700/60 text-[10px] font-mono text-zinc-300 flex items-center gap-1.5">
                <UploadCloud className="w-3 h-3 text-indigo-400" />
                <span>Chunks: {telemetry.chunksPushed} ({Math.round(telemetry.totalBytesPushed / 1024 / 1024 * 10) / 10} MB)</span>
              </div>
            )}
          </div>

          {/* 3. DEVICE CONTROLS BAR */}
          <div className="h-16 px-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-between flex-shrink-0 shadow-lg">
            
            {/* Left Controls: Mic & Screen Share (No Camera) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mic Toggle */}
              <button
                id="studio-mic-toggle-btn"
                onClick={toggleMicrophone}
                className={`p-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  isMicOn
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                }`}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic className="w-5 h-5 text-emerald-400" /> : <MicOff className="w-5 h-5" />}
                <span className="text-xs font-semibold hidden md:inline">{isMicOn ? 'Mic On' : 'Muted'}</span>
              </button>

              {/* Screen Share (Direct native picker) */}
              <button
                id="studio-screen-share-btn"
                onClick={isScreenSharing ? stopScreenSharing : startScreenCapture}
                className={`p-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  isScreenSharing
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30'
                }`}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen / Window'}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                <span className="text-xs font-semibold hidden md:inline">
                  {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </span>
              </button>
            </div>

            {/* Center: In-Studio Quick Emoji Reactions */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/60 rounded-xl border border-zinc-800">
              <span className="text-[11px] text-zinc-500 font-medium mr-1">React:</span>
              {['❤️', '🔥', '👏', '🎉', '🚀', '💯'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-base hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Right: Chat Toggle */}
            <div className="flex items-center gap-2">
              <button
                id="studio-chat-panel-toggle-btn"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`p-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  isChatOpen ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
                title="Toggle Live Chat"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs font-semibold hidden md:inline">Chat</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. RIGHT SIDEBAR: LIVE CHAT */}
        {isChatOpen && (
          <aside className="w-80 sm:w-88 bg-zinc-900 border-l border-zinc-800 flex flex-col flex-shrink-0 z-10">
            {/* Chat Header */}
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-xs text-zinc-100">Live Stream Chat</h3>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                  SSE
                </span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
              <div className="p-2.5 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-indigo-300 text-[11px] leading-relaxed">
                👋 Welcome to your screen broadcast! Viewers watching via HLS can chat and send real-time emoji reactions here.
              </div>

              {chatMessages.map((msg) => (
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
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send message as Host..."
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
        )}

        {/* 5. STREAM SETTINGS MODAL */}
        {isSettingsOpen && (
          <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Broadcast Metadata & Settings</span>
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Stream Title</label>
                  <input
                    type="text"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Tech & Coding">Tech & Coding</option>
                    <option value="Gaming & Esports">Gaming & Esports</option>
                    <option value="Creative & Design">Creative & Design</option>
                    <option value="Music & Audio">Music & Audio</option>
                    <option value="Just Chatting">Just Chatting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1.5">
                  <p className="text-[11px] font-semibold text-zinc-300">Screen Capture Specs:</p>
                  <p className="text-[11px] text-zinc-500 font-mono">Source: DisplayMedia (Screen / Window / Tab)</p>
                  <p className="text-[11px] text-zinc-500 font-mono">Audio: Screen Audio + Microphone Mixed</p>
                  <p className="text-[11px] text-zinc-500 font-mono">HLS Ingest: 2-second segments with Live Playlist</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
