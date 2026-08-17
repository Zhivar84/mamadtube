/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { motion } from 'motion/react';

interface VoiceRecorderProps {
  onSendVoiceNote: (audioUrl: string, duration: number, waveform: number[]) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSendVoiceNote, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([30, 45, 60, 40, 70, 90, 60, 40]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Live timer & animated sound waveform
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        setWaveformBars(prev => {
          const nextVal = Math.floor(Math.random() * 80) + 20;
          return [...prev.slice(-18), nextVal];
        });
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleStopRecording = () => {
    setIsRecording(false);
    // Use fallback sample audio note url
    setRecordedAudioUrl('https://actions.google.com/sounds/v1/ambiences/outdoor_waterfall.ogg');
  };

  const handleSend = () => {
    const finalDuration = Math.max(1, Math.floor(recordingTime / 2));
    onSendVoiceNote(
      recordedAudioUrl || 'https://actions.google.com/sounds/v1/ambiences/outdoor_waterfall.ogg',
      finalDuration,
      waveformBars
    );
  };

  const togglePreviewPlay = () => {
    if (!audioRef.current && recordedAudioUrl) {
      audioRef.current = new Audio(recordedAudioUrl);
      audioRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (audioRef.current) {
      if (isPlayingPreview) {
        audioRef.current.pause();
        setIsPlayingPreview(false);
      } else {
        audioRef.current.play();
        setIsPlayingPreview(true);
      }
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center justify-between gap-3 bg-indigo-50/80 dark:bg-zinc-900 border border-indigo-200 dark:border-zinc-800 rounded-2xl p-2.5 shadow-sm w-full"
    >
      {/* Status indicator & timer */}
      <div className="flex items-center gap-3">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Recording</span>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-zinc-200">
              {formatSeconds(Math.floor(recordingTime / 2))}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePreviewPlay}
              className="p-1.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
            >
              {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">Voice Note Ready</span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              {formatSeconds(Math.floor(recordingTime / 2))}
            </span>
          </div>
        )}
      </div>

      {/* Waveform Visualizer */}
      <div className="flex-1 flex items-center justify-center gap-1 h-8 max-w-xs px-2">
        {waveformBars.map((val, idx) => (
          <motion.div
            key={idx}
            animate={{ height: `${Math.max(15, val)}%` }}
            transition={{ duration: 0.2 }}
            className={`w-1 rounded-full ${isRecording ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-indigo-400 dark:bg-indigo-500'}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            onClick={handleStopRecording}
            className="p-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Stop recording"
          >
            <Square className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
            <span className="hidden sm:inline">Done</span>
          </button>
        ) : null}

        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
          title="Discard note"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleSend}
          className="p-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
          title="Send voice note"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
