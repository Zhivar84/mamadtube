/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';
import { SocialMediaItem } from '../../types/social';

interface MediaGridProps {
  media: SocialMediaItem[];
  onMediaClick?: (index: number) => void;
}

export default function MediaGrid({ media }: MediaGridProps) {
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  if (!media || media.length === 0) return null;

  // Video Item
  const videoItem = media.find((m) => m.type === 'video' && m.url && m.url.trim() !== '');
  if (videoItem) {
    return (
      <div
        className="mt-3 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-[460px] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <VideoPlayer item={videoItem} />
      </div>
    );
  }

  // Image items (up to 4)
  const imageItems = media.filter((m) => m.type === 'image' && m.url && m.url.trim() !== '').slice(0, 4);
  const count = imageItems.length;
  if (count === 0) return null;

  const handleOpenLightbox = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setActiveLightboxIndex(idx);
  };

  return (
    <>
      <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
        {count === 1 && (
          <div
            className="w-full max-h-[440px] overflow-hidden cursor-pointer relative group"
            onClick={(e) => handleOpenLightbox(e, 0)}
          >
            <img
              src={imageItems[0].url}
              alt={imageItems[0].altText || 'Tweet media'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
            />
          </div>
        )}

        {count === 2 && (
          <div className="grid grid-cols-2 gap-0.5 h-64 sm:h-72">
            {imageItems.map((img, idx) => (
              <div
                key={img.id || idx}
                className="relative h-full overflow-hidden cursor-pointer group"
                onClick={(e) => handleOpenLightbox(e, idx)}
              >
                <img
                  src={img.url}
                  alt={img.altText || `Media ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
            ))}
          </div>
        )}

        {count === 3 && (
          <div className="grid grid-cols-2 gap-0.5 h-64 sm:h-80">
            {/* Left large */}
            <div
              className="relative h-full overflow-hidden cursor-pointer group"
              onClick={(e) => handleOpenLightbox(e, 0)}
            >
              <img
                src={imageItems[0].url}
                alt={imageItems[0].altText || 'Media 1'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
              />
            </div>
            {/* Right stacked */}
            <div className="grid grid-rows-2 gap-0.5 h-full">
              {imageItems.slice(1, 3).map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="relative h-full overflow-hidden cursor-pointer group"
                  onClick={(e) => handleOpenLightbox(e, idx + 1)}
                >
                  <img
                    src={img.url}
                    alt={img.altText || `Media ${idx + 2}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {count >= 4 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-64 sm:h-80">
            {imageItems.map((img, idx) => (
              <div
                key={img.id || idx}
                className="relative h-full overflow-hidden cursor-pointer group"
                onClick={(e) => handleOpenLightbox(e, idx)}
              >
                <img
                  src={img.url}
                  alt={img.altText || `Media ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveLightboxIndex(null)}
        >
          <button
            onClick={() => setActiveLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-900/80 rounded-full border border-zinc-800 transition-colors z-50 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageItems[activeLightboxIndex].url}
              alt="Fullscreen media"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
          {imageItems.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900/90 px-3 py-1.5 rounded-full border border-zinc-800 text-xs text-zinc-300">
              {activeLightboxIndex + 1} / {imageItems.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function VideoPlayer({ item }: { item: SocialMediaItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    if (total > 0) {
      setProgress((current / total) * 100);
    }
  };

  return (
    <div className="relative group cursor-pointer w-full bg-black flex items-center justify-center min-h-[220px]" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={item.url}
        muted={isMuted}
        loop
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        className="w-full max-h-[460px] object-contain"
      />

      {/* Play Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-14 h-14 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="p-1.5 text-white/90 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 mx-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div style={{ width: `${progress}%` }} className="h-full bg-sky-500" />
        </div>

        <button
          onClick={toggleMute}
          className="p-1.5 text-white/90 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
