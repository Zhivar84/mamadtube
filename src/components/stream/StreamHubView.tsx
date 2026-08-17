/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Tv2, 
  Radio, 
  Search, 
  Play, 
  Users, 
  Sparkles, 
  Sliders, 
  Plus, 
  Key, 
  ShieldCheck,
  Tag,
  Flame,
  ArrowRight
} from 'lucide-react';
import { LiveStream } from '../../types/stream';

interface StreamHubViewProps {
  streams: LiveStream[];
  onSelectStream: (stream: LiveStream) => void;
  onOpenStudio: () => void;
}

const CATEGORIES = [
  'All Channels',
  'Tech & Coding',
  'Creative & Design',
  'Gaming',
  'Music & Audio',
  'Just Chatting / IRL'
];

export default function StreamHubView({
  streams,
  onSelectStream,
  onOpenStudio
}: StreamHubViewProps) {
  const [selectedCategory, setSelectedCategory] = useState('All Channels');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter streams
  const filteredStreams = streams.filter(stream => {
    const matchesCategory = selectedCategory === 'All Channels' || stream.category === selectedCategory;
    const matchesSearch = 
      stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.streamer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredStream = streams.find(s => s.isLive) || streams[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Top Banner / Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Tv2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Live Streaming Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              Low-Resource HLS Live
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-normal">
            Lightweight in-browser stream capture to HLS — low server overhead, high performance.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5">
          <button
            id="hub-go-live-studio-btn"
            onClick={onOpenStudio}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Open Stream Studio</span>
          </button>
        </div>
      </div>

      {/* Featured Live Stream Hero */}
      {featuredStream && (
        <div 
          id="featured-hero-stream-card"
          onClick={() => onSelectStream(featuredStream)}
          className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-md group cursor-pointer transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Hero Video/Thumbnail view */}
            <div className="lg:col-span-8 relative aspect-video bg-zinc-900 overflow-hidden flex items-center justify-center">
              {featuredStream.thumbnailUrl && featuredStream.thumbnailUrl.trim() !== '' ? (
                <img
                  src={featuredStream.thumbnailUrl}
                  alt={featuredStream.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                  Featured Stream Broadcast
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
              
              {/* Overlaid Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Featured Broadcast
                </span>
                <span className="px-2.5 py-1 rounded-md bg-zinc-950/70 backdrop-blur-xs text-zinc-200 text-[11px] font-medium border border-white/10 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-red-400" />
                  {featuredStream.viewerCount.toLocaleString()} Live
                </span>
              </div>
            </div>

            {/* Hero Metadata info sidebar */}
            <div className="lg:col-span-4 p-6 flex flex-col justify-between bg-zinc-900/90 text-white border-t lg:border-t-0 lg:border-l border-zinc-800">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 uppercase">
                    {featuredStream.category}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {featuredStream.resolution}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-zinc-100 group-hover:text-red-400 transition-colors leading-snug">
                  {featuredStream.title}
                </h3>

                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed font-normal">
                  {featuredStream.description}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {featuredStream.streamer.avatar && featuredStream.streamer.avatar.trim() !== '' ? (
                    <img
                      src={featuredStream.streamer.avatar}
                      alt={featuredStream.streamer.name}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs border border-zinc-700">
                      {featuredStream.streamer.name?.charAt(0) || 'S'}
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">
                      {featuredStream.streamer.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {featuredStream.streamer.handle}
                    </span>
                  </div>
                </div>

                <button
                  id="watch-featured-stream-btn"
                  className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Watch</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Category Pills & Search Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                id={`cat-pill-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              id="search-live-streams-input"
              type="text"
              placeholder="Search streams, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
            />
          </div>

        </div>

        {/* Live Channels Grid */}
        {filteredStreams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStreams.map(stream => (
              <div
                key={stream.id}
                id={`stream-card-${stream.id}`}
                onClick={() => onSelectStream(stream)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer group flex flex-col"
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video bg-zinc-950 overflow-hidden flex items-center justify-center">
                  {stream.thumbnailUrl && stream.thumbnailUrl.trim() !== '' ? (
                    <img
                      src={stream.thumbnailUrl}
                      alt={stream.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                      Live Broadcast
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {stream.isLive ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white uppercase tracking-wider flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-zinc-800/80 text-zinc-300 uppercase tracking-wider">
                        Offline
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-zinc-950/80 backdrop-blur-xs text-[10px] text-zinc-200 font-medium border border-white/10 flex items-center gap-1">
                    <Users className="w-3 h-3 text-red-400" />
                    <span>{stream.viewerCount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        {stream.category}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                      {stream.title}
                    </h3>
                  </div>

                  {/* Channel Footer */}
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {stream.streamer.avatar && stream.streamer.avatar.trim() !== '' ? (
                        <img
                          src={stream.streamer.avatar}
                          alt={stream.streamer.name}
                          className="w-6 h-6 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-[10px] border border-zinc-700 flex-shrink-0">
                          {stream.streamer.name?.charAt(0) || 'S'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                          {stream.streamer.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-wrap justify-end">
                      {stream.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
              <Radio className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {searchQuery || selectedCategory !== 'All Channels' 
                  ? 'No matching streams found' 
                  : 'No live streams right now. Start your own broadcast.'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'All Channels'
                  ? 'Try selecting All Channels or clearing your search term.'
                  : 'Start broadcasting directly in your browser with camera, mic, and screen share via WebRTC SFU.'}
              </p>
            </div>
            <button
              onClick={onOpenStudio}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>Launch Stream Studio</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
