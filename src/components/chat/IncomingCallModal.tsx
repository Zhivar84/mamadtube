/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, Mic, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CallSignal } from '../../types/chat';
import { ringtoneService } from '../../utils/callRingtone';
import UserAvatar from '../common/UserAvatar';

interface IncomingCallModalProps {
  callSignal: CallSignal;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  callSignal,
  onAccept,
  onDecline
}: IncomingCallModalProps) {
  useEffect(() => {
    ringtoneService.startIncomingRing();
    return () => {
      ringtoneService.stopRing();
    };
  }, []);

  const handleAccept = () => {
    ringtoneService.stopRing();
    onAccept();
  };

  const handleDecline = () => {
    ringtoneService.stopRing();
    ringtoneService.playHangupTone();
    onDecline();
  };

  const isVideo = callSignal.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center relative overflow-hidden"
      >
        {/* Ambient Ringing Glow Animation */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
        
        {/* Pulsing Avatar Container */}
        <div className="relative mx-auto w-24 h-24 mb-5 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute inset-0 rounded-full ${isVideo ? 'bg-indigo-500/30' : 'bg-emerald-500/30'}`}
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className={`absolute inset-2 rounded-full ${isVideo ? 'bg-indigo-500/40' : 'bg-emerald-500/40'}`}
          />
          
          <div className="relative z-10">
            <UserAvatar
              name={callSignal.caller.name}
              avatarUrl={callSignal.caller.avatar}
              size="xl"
              className="ring-4 ring-zinc-800 shadow-xl"
            />
          </div>
        </div>

        {/* Caller Info */}
        <div className="space-y-1 mb-6">
          <h3 className="text-lg font-bold text-zinc-100 truncate">{callSignal.caller.name}</h3>
          <p className="text-xs text-zinc-400 font-mono">{callSignal.caller.handle}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs font-medium text-zinc-300 mt-2">
            {isVideo ? (
              <Video className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            ) : (
              <Phone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            )}
            <span>Incoming {isVideo ? 'Video' : 'Audio'} Call...</span>
          </div>
        </div>

        {/* Action Controls: Accept (Green) and Decline (Red) */}
        <div className="flex items-center justify-center gap-6 pt-2">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="decline-call-btn"
              onClick={handleDecline}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-rose-400">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="accept-call-btn"
              onClick={handleAccept}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer animate-bounce"
              title="Accept Call"
            >
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-[11px] font-semibold text-emerald-400">Accept</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
