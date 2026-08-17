/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useApp } from '../context/AppContext';
import { AppRoute } from '../types';
import { motion } from 'motion/react';
import { 
  Tv2, 
  FolderGit, 
  Heart, 
  MessageCircle, 
  ArrowUpRight, 
  HardDrive, 
  Eye,
  FileText,
  Code2,
  Video,
  Radio,
  Repeat2,
  ArrowRight,
  FolderOpen,
  Send,
  Sparkles
} from 'lucide-react';
import UserAvatar from './common/UserAvatar';
import StorageMetricCard from './archive/StorageMetricCard';

export default function Dashboard() {
  const { auth, navigateTo } = useApp();
  const user = auth.user;

  // Generate localized greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (!user) return null;

  // Dynamic metrics from actual local storage
  const getStoredCount = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
      }
    } catch {}
    return 0;
  };

  const streamCount = getStoredCount('mamadtube_live_streams_v2');
  const filesCount = getStoredCount('mamadtube_archive_files_v2');
  const postsCount = getStoredCount('mamadtube_social_posts_v3');
  const chatCount = getStoredCount('mamadtube_conversations_v3');

  const modules = [
    {
      id: 'stream',
      title: 'Live Streaming Hub',
      description: 'Discover and broadcast high-fidelity WebRTC streams with client-side dynacast and zero server transcoding.',
      route: '/stream' as AppRoute,
      icon: Tv2,
      badge: 'Lightweight SFU',
      accentColor: 'text-red-400',
      previewComponent: (
        <div className="space-y-2 text-left pt-1">
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  {streamCount > 0 ? `${streamCount} Active Stream${streamCount > 1 ? 's' : ''}` : 'No active streams'}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {streamCount > 0 ? 'Broadcasting live via WebRTC' : 'Ready to start broadcasting'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded text-[10px] font-mono border border-zinc-800">
              WebRTC
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'archive',
      title: 'Cloud Archive',
      description: 'Host, download, and catalog project records, structured file systems, and collaborative shared drives.',
      route: '/archive' as AppRoute,
      icon: FolderGit,
      badge: 'Storage Vault',
      accentColor: 'text-indigo-400',
      previewComponent: (
        <div className="space-y-2.5 text-left pt-1">
          <StorageMetricCard compact={true} />
        </div>
      )
    },
    {
      id: 'social',
      title: 'Social Feed',
      description: 'Microblogging feed, trending discussions, real-time polls, and thread conversations.',
      route: '/social' as AppRoute,
      icon: MessageCircle,
      badge: 'Microblog',
      accentColor: 'text-sky-400',
      previewComponent: (
        <div className="space-y-2 text-left pt-1">
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  {postsCount > 0 ? `${postsCount} Timeline Post${postsCount > 1 ? 's' : ''}` : 'Timeline Empty'}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {postsCount > 0 ? 'Published in your social network' : 'Post updates, polls, and media'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded text-[10px] font-mono border border-zinc-800">
              Microblog
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'chat',
      title: 'Real-Time Chat',
      description: 'Communicate instantly with peers across dedicated channels, private threads, and team workspaces.',
      route: '/chat' as AppRoute,
      icon: Send,
      badge: 'Direct & Channels',
      accentColor: 'text-indigo-400',
      previewComponent: (
        <div className="space-y-1.5 text-left pt-1">
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  {chatCount > 0 ? `${chatCount} Active Chat${chatCount > 1 ? 's' : ''}` : 'No active chats'}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {chatCount > 0 ? 'Channels and Direct Messages' : 'Start a new conversation with peers'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded text-[10px] font-mono border border-zinc-800">
              Direct/Group
            </span>
          </div>
        </div>
      )
    },
  ];

  return (
    <motion.div
      id="dashboard-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
    >
      {/* Welcome banner */}
      <div 
        id="dashboard-welcome-banner" 
        className="relative overflow-hidden bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-xl text-white shadow-xs"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-zinc-800 rounded-md text-xs font-medium text-zinc-300 border border-zinc-700">
              <Tv2 className="w-3 h-3 text-indigo-400" />
              <span>MamadTube v1.0.0</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              {getGreeting()}, {user.displayName.split(' ')[0]}
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              Welcome back to your central hub workspace. Select any module below to broadcast live streams, browse cloud archives, interact on the social timeline, or chat in real-time.
            </p>
          </div>
          
          {/* Quick User summary card on welcome */}
          <div className="flex items-center gap-3.5 bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800 max-w-xs w-full self-start md:self-auto">
            <UserAvatar
              name={user.displayName}
              avatarUrl={user.avatarUrl}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-100 truncate">{user.displayName}</p>
              <p className="text-[10px] text-zinc-400 truncate font-medium mt-0.5">{user.email}</p>
              <span className="inline-block px-1.5 py-0.2 bg-zinc-800 text-emerald-400 rounded text-[9px] font-semibold uppercase tracking-wider mt-1 border border-zinc-700">
                Authorized
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 4 Interactive Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-100 tracking-tight">
              Interactive Application Modules
            </h3>
            <p className="text-xs text-zinc-400">
              Durable, sandboxed environments synced in real-time.
            </p>
          </div>
        </div>

        <div id="modules-bento-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                id={`module-card-${item.id}`}
                onClick={() => navigateTo(item.route)}
                className="group flex flex-col justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 sm:p-6 rounded-xl shadow-xs transition-all duration-200 cursor-pointer select-none relative overflow-hidden"
              >
                <div>
                  {/* Top line containing Icon & Label tag */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300 group-hover:scale-105 transition-transform duration-200">
                      <Icon className={`w-4.5 h-4.5 ${item.accentColor}`} />
                    </div>
                    <span className="px-2 py-0.5 bg-zinc-800 text-[10px] font-medium text-zinc-400 rounded border border-zinc-700/60 uppercase tracking-wide">
                      {item.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1 mb-4 text-left">
                    <h4 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                      <span>{item.title}</span>
                      <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-all duration-200" />
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Simulated dynamic Preview inside the card */}
                <div className="mt-auto border-t border-zinc-800/80 pt-3.5">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span>Live Context Preview</span>
                  </div>
                  {item.previewComponent}
                </div>

                {/* Footer Action Trigger */}
                <div className="flex justify-end items-center mt-3 pt-2.5 border-t border-zinc-800 text-xs font-semibold text-indigo-400">
                  <span className="mr-1 group-hover:mr-1.5 transition-all duration-200">Launch Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
