/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioMessagePlayerProps {
  audioUrl: string;
  duration: number;
  waveform?: number[];
  isSenderMe?: boolean;
}

export default function AudioMessagePlayer({
  audioUrl,
  duration,
  waveform = [30, 45, 80, 60, 90, 40, 70, 85, 50, 60, 30, 40],
  isSenderMe = false
}: AudioMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(e => console.log('Audio playback error', e));
      setIsPlaying(true);
    }
  };

  const toggleSpeed = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl min-w-[200px] sm:min-w-[220px] max-w-[280px] select-none ${
      isSenderMe ? 'bg-indigo-700/40 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100'
    }`}>
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 cursor-pointer ${
          isSenderMe ? 'bg-white text-indigo-600 hover:bg-slate-100' : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform track */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-0.5 h-6">
          {waveform.map((bar, idx) => {
            const barProgress = (idx / waveform.length) * 100;
            const isPlayed = barProgress <= progressPercent;

            return (
              <div
                key={idx}
                style={{ height: `${Math.max(20, bar)}%` }}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isPlayed
                    ? isSenderMe ? 'bg-white' : 'bg-indigo-600 dark:bg-indigo-400'
                    : isSenderMe ? 'bg-indigo-300/50' : 'bg-slate-300 dark:bg-zinc-700'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
          <span>{isPlaying ? formatSeconds(currentTime) : formatSeconds(duration)}</span>
          <button 
            onClick={toggleSpeed}
            className={`font-bold hover:underline px-1 rounded cursor-pointer ${isSenderMe ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}`}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}
