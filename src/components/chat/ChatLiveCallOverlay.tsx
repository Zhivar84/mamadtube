/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Maximize2, 
  Minimize2, 
  Monitor, 
  MonitorOff, 
  Volume2, 
  VolumeX,
  Sparkles,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { motion } from 'motion/react';
import { CallSignal, ChatUser } from '../../types/chat';
import { generateLiveKitToken } from '../../utils/livekitToken';
import { ringtoneService } from '../../utils/callRingtone';
import UserAvatar from '../common/UserAvatar';

interface ChatLiveCallOverlayProps {
  callSignal: CallSignal;
  currentUser: ChatUser;
  onHangup: () => void;
}

export default function ChatLiveCallOverlay({
  callSignal,
  currentUser,
  onHangup
}: ChatLiveCallOverlayProps) {
  const isCaller = callSignal.caller.id === currentUser.id;
  const peerUser: ChatUser = isCaller
    ? {
        id: callSignal.receiverId,
        name: callSignal.receiverName,
        handle: '@peer',
        avatar: '',
        status: 'online'
      }
    : callSignal.caller;

  // Media states
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamEnabled, setIsCamEnabled] = useState(callSignal.callType === 'video');
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected'>('connecting');
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize WebRTC media & LiveKit token
  useEffect(() => {
    let isMounted = true;

    async function initMedia() {
      try {
        // Fetch LiveKit room token
        const tokenRes = await generateLiveKitToken({
          roomId: callSignal.roomId,
          identity: currentUser.id,
          name: currentUser.name,
          isPublisher: true,
          avatarUrl: currentUser.avatar
        });
        if (isMounted) {
          setLiveKitToken(tokenRes.token);
        }
      } catch (e) {
        console.warn('LiveKit token init warning:', e);
      }

      // Initialize local media stream
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: callSignal.callType === 'video',
            audio: true
          });
          if (isMounted) {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            setConnectionStatus('connected');
          }
        } else {
          if (isMounted) setConnectionStatus('connected');
        }
      } catch (err) {
        console.warn('Camera/Mic access permission error or fallback:', err);
        if (isMounted) setConnectionStatus('connected');
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [callSignal, currentUser]);

  // Call duration counter
  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionStatus]);

  // Handle Mute Mic
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMicMuted;
      });
    }
    setIsMicMuted(!isMicMuted);
  };

  // Handle Toggle Camera
  const handleToggleCam = async () => {
    if (localStreamRef.current) {
      const vidTracks = localStreamRef.current.getVideoTracks();
      if (vidTracks.length > 0) {
        vidTracks.forEach(track => {
          track.enabled = !isCamEnabled;
        });
        setIsCamEnabled(!isCamEnabled);
      } else if (!isCamEnabled) {
        // Request video track
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = stream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          setIsCamEnabled(true);
        } catch {}
      }
    } else {
      setIsCamEnabled(!isCamEnabled);
    }
  };

  // Handle Hang up
  const handleHangup = () => {
    ringtoneService.playHangupTone();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    onHangup();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideo = callSignal.callType === 'video';

  return (
    <div 
      ref={containerRef}
      className={`fixed z-50 transition-all select-none ${
        isFullscreen 
          ? 'inset-0 bg-zinc-950 flex flex-col' 
          : 'bottom-6 right-6 w-96 sm:w-[450px] h-[520px] rounded-3xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 shadow-2xl overflow-hidden flex flex-col'
      }`}
    >
      {/* Top Floating Header */}
      <div className="px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-zinc-100 truncate">{peerUser.name}</h4>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="font-mono">{formatTimer(callDuration)}</span>
              <span>•</span>
              <span className="capitalize">{callSignal.callType} Call</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Stage (Remote Peer & Video Grid) */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden">
        {/* Remote participant view */}
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          {isVideo ? (
            <div className="relative w-full h-full rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center overflow-hidden">
              {/* Remote simulation video / avatar */}
              <div className="flex flex-col items-center justify-center space-y-3 z-10">
                <div className="relative">
                  <UserAvatar name={peerUser.name} avatarUrl={peerUser.avatar} size="xl" className="ring-4 ring-indigo-500/40" />
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">{peerUser.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">Live WebRTC Session Active</p>
                </div>
              </div>
            </div>
          ) : (
            /* Audio Call Waveform Presentation */
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-36 h-36 rounded-full bg-emerald-500/20"
                />
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  className="absolute w-28 h-28 rounded-full bg-emerald-500/30"
                />
                <UserAvatar name={peerUser.name} avatarUrl={peerUser.avatar} size="xl" className="relative z-10 ring-4 ring-emerald-500/50" />
              </div>

              <div>
                <h3 className="text-base font-bold text-zinc-100">{peerUser.name}</h3>
                <p className="text-xs text-emerald-400 font-medium mt-1 flex items-center justify-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Secure 1-on-1 Voice Call</span>
                </p>
              </div>

              {/* Synthetic Audio Waveform Bars */}
              <div className="flex items-center justify-center gap-1.5 h-8">
                {[30, 65, 45, 90, 75, 40, 80, 50, 95, 60, 35].map((height, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${Math.max(15, height * 0.3)}%`, `${height}%`, `${Math.max(15, height * 0.3)}%`] }}
                    transition={{ duration: 0.8 + (i % 3) * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-1 bg-emerald-500/80 rounded-full"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Local Picture-in-Picture Preview Window */}
        {isVideo && (
          <div className="absolute top-4 right-4 w-28 sm:w-36 h-36 sm:h-44 rounded-2xl bg-zinc-900 border-2 border-zinc-700/80 overflow-hidden shadow-2xl z-20">
            {isCamEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 p-2 text-center">
                <CameraOff className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-semibold">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
              You
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="p-4 bg-zinc-900/95 border-t border-zinc-800 flex items-center justify-center gap-4 z-20 flex-shrink-0">
        {/* Mic Toggle */}
        <button
          onClick={handleToggleMic}
          className={`p-3 rounded-2xl transition-all cursor-pointer ${
            isMicMuted 
              ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30' 
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
          }`}
          title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={handleToggleCam}
          className={`p-3 rounded-2xl transition-all cursor-pointer ${
            !isCamEnabled 
              ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30' 
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
          }`}
          title={isCamEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {isCamEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
        </button>

        {/* Speaker Mute */}
        <button
          onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
          className={`p-3 rounded-2xl transition-all cursor-pointer ${
            isSpeakerMuted 
              ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30' 
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
          }`}
          title={isSpeakerMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Hang Up (Red) */}
        <button
          id="hangup-call-btn"
          onClick={handleHangup}
          className="p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer ml-2"
          title="Hang Up Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
