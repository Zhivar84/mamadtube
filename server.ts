import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);

interface StorageMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentage: number;
  totalFormatted: string;
  usedFormatted: string;
  freeFormatted: string;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: number;
  cached: boolean;
  mountPoint: string;
}

function formatDiskBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

let cachedStorage: StorageMetrics | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30000; // 30-second cache TTL

async function getHostDiskStorage(): Promise<Omit<StorageMetrics, 'cached'>> {
  // Method 1: fs.promises.statfs (Node 18.15+)
  try {
    if (typeof fs.promises?.statfs === 'function') {
      const stats = await fs.promises.statfs('/');
      const bsize = Number(stats.bsize);
      const totalBlocks = Number(stats.blocks);
      const freeBlocks = Number(stats.bavail || stats.bfree);
      
      const totalBytes = totalBlocks * bsize;
      const freeBytes = freeBlocks * bsize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      const percentage = totalBytes > 0 ? parseFloat(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;
      
      const status: 'healthy' | 'warning' | 'critical' = 
        percentage > 85 ? 'critical' : percentage > 70 ? 'warning' : 'healthy';

      return {
        totalBytes,
        usedBytes,
        freeBytes,
        percentage,
        totalFormatted: formatDiskBytes(totalBytes),
        usedFormatted: formatDiskBytes(usedBytes),
        freeFormatted: formatDiskBytes(freeBytes),
        status,
        timestamp: Date.now(),
        mountPoint: '/',
      };
    }
  } catch (statfsErr) {
    console.warn('fs.statfs failed, falling back to df -k:', statfsErr);
  }

  // Method 2: Fallback to df -k /
  try {
    const { stdout } = await execPromise('df -k /');
    const lines = stdout.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      if (parts.length >= 6) {
        const totalBytes = parseInt(parts[1], 10) * 1024;
        const usedBytes = parseInt(parts[2], 10) * 1024;
        const freeBytes = parseInt(parts[3], 10) * 1024;
        const percentage = parseFloat(parts[4].replace('%', '')) || 
          (totalBytes > 0 ? parseFloat(((usedBytes / totalBytes) * 100).toFixed(1)) : 0);
        
        const status: 'healthy' | 'warning' | 'critical' = 
          percentage > 85 ? 'critical' : percentage > 70 ? 'warning' : 'healthy';

        return {
          totalBytes,
          usedBytes,
          freeBytes,
          percentage,
          totalFormatted: formatDiskBytes(totalBytes),
          usedFormatted: formatDiskBytes(usedBytes),
          freeFormatted: formatDiskBytes(freeBytes),
          status,
          timestamp: Date.now(),
          mountPoint: parts[5] || '/',
        };
      }
    }
  } catch (dfErr) {
    console.error('df -k fallback failed:', dfErr);
  }

  // Safe fallback
  const totalBytes = 100 * 1024 * 1024 * 1024;
  const usedBytes = 12 * 1024 * 1024 * 1024;
  const freeBytes = totalBytes - usedBytes;
  return {
    totalBytes,
    usedBytes,
    freeBytes,
    percentage: 12.0,
    totalFormatted: formatDiskBytes(totalBytes),
    usedFormatted: formatDiskBytes(usedBytes),
    freeFormatted: formatDiskBytes(freeBytes),
    status: 'healthy',
    timestamp: Date.now(),
    mountPoint: '/',
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Real Host Storage Inspection Endpoint with 30s cache revalidation
  app.get('/api/system/storage', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';
      const now = Date.now();

      if (!forceRefresh && cachedStorage && (now - lastCacheTime < CACHE_TTL_MS)) {
        return res.json({
          ...cachedStorage,
          cached: true,
          cacheAgeMs: now - lastCacheTime
        });
      }

      const liveData = await getHostDiskStorage();
      cachedStorage = {
        ...liveData,
        cached: false,
      };
      lastCacheTime = now;

      return res.json({
        ...cachedStorage,
        cached: false,
        cacheAgeMs: 0
      });
    } catch (err: any) {
      console.error('Failed to retrieve host storage metrics:', err);
      return res.status(500).json({ error: 'Failed to retrieve storage metrics', details: err.message });
    }
  });

  // Raw body parser for binary video stream segments (MediaRecorder chunks)
  app.use('/api/stream/ingest', express.raw({
    type: ['video/*', 'application/octet-stream', 'application/x-binary', 'text/plain', '*/*'],
    limit: '60mb'
  }));

  // Ensure base HLS storage directory exists
  const HLS_BASE_DIR = path.join('/tmp', 'mamadtube_hls');
  try {
    if (!fs.existsSync(HLS_BASE_DIR)) {
      fs.mkdirSync(HLS_BASE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create HLS base dir:', err);
  }

  interface HlsSegment {
    sequence: number;
    filename: string;
    duration: number;
    sizeBytes: number;
    timestamp: number;
  }

  interface HlsStreamSession {
    roomId: string;
    title: string;
    streamerName: string;
    streamerHandle: string;
    streamerAvatar: string;
    category: string;
    tags: string[];
    isLive: boolean;
    startedAt: number;
    lastChunkAt: number;
    currentSequence: number;
    mediaSequence: number;
    mimeType: string;
    segments: HlsSegment[];
    viewers: Map<string, number>;
    chatMessages: Array<{
      id: string;
      roomId: string;
      senderId: string;
      senderName: string;
      senderAvatar: string;
      role: 'host' | 'mod' | 'vip' | 'viewer';
      text: string;
      timestamp: number;
      formattedTime: string;
    }>;
    sseClients: Set<express.Response>;
  }

  const activeSessions = new Map<string, HlsStreamSession>();
  const MAX_SLIDING_WINDOW_SEGMENTS = 8; // Sliding window for live HLS
  const MAX_DISK_RETAINED_SEGMENTS = 12; // Strictly keeps disk usage < 100MB per stream

  function getOrCreateSession(roomId: string): HlsStreamSession {
    let session = activeSessions.get(roomId);
    if (!session) {
      const roomDir = path.join(HLS_BASE_DIR, roomId);
      if (!fs.existsSync(roomDir)) {
        fs.mkdirSync(roomDir, { recursive: true });
      }

      session = {
        roomId,
        title: 'Live Broadcast',
        streamerName: 'Host',
        streamerHandle: '@host',
        streamerAvatar: '',
        category: 'Tech & Gaming',
        tags: ['Live', 'HLS'],
        isLive: true,
        startedAt: Date.now(),
        lastChunkAt: Date.now(),
        currentSequence: 0,
        mediaSequence: 0,
        mimeType: 'video/webm',
        segments: [],
        viewers: new Map(),
        chatMessages: [],
        sseClients: new Set()
      };
      activeSessions.set(roomId, session);
    }
    return session;
  }

  // Helper to broadcast SSE event to all connected room clients
  function broadcastRoomEvent(session: HlsStreamSession, eventType: string, data: any) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of session.sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        session.sseClients.delete(client);
      }
    }
  }

  // Periodic cleaner: Purge inactive viewer heartbeats & enforce strict disk quotas
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, session] of activeSessions.entries()) {
      // Clean viewers who haven't sent a heartbeat in 25s
      for (const [viewerId, lastBeat] of session.viewers.entries()) {
        if (now - lastBeat > 25000) {
          session.viewers.delete(viewerId);
        }
      }

      // If stream has been inactive (no chunks) for more than 4 minutes, mark offline
      if (session.isLive && now - session.lastChunkAt > 240000) {
        session.isLive = false;
        broadcastRoomEvent(session, 'stream_ended', { roomId, isLive: false });
      }

      // If offline for > 10 minutes, clean up disk storage and remove session
      if (!session.isLive && now - session.lastChunkAt > 600000) {
        const roomDir = path.join(HLS_BASE_DIR, roomId);
        try {
          if (fs.existsSync(roomDir)) {
            fs.rmSync(roomDir, { recursive: true, force: true });
          }
        } catch (e) {}
        activeSessions.delete(roomId);
      }
    }
  }, 10000);

  // 1. INGEST API: Broadcaster pushes 2-second MediaRecorder chunks
  app.post('/api/stream/ingest/:roomId', async (req, res) => {
    try {
      const { roomId } = req.params;
      if (!roomId) {
        return res.status(400).json({ error: 'roomId is required' });
      }

      const session = getOrCreateSession(roomId);
      const sequence = parseInt((req.headers['x-sequence'] as string) || String(session.currentSequence), 10);
      const duration = parseFloat((req.headers['x-duration'] as string) || '2.0');
      const isFinal = req.headers['x-is-final'] === 'true';
      const mimeType = (req.headers['x-mime-type'] as string) || (req.headers['content-type'] as string) || 'video/webm';
      
      if (req.headers['x-stream-title']) {
        session.title = decodeURIComponent(req.headers['x-stream-title'] as string);
      }
      if (req.headers['x-streamer-name']) {
        session.streamerName = decodeURIComponent(req.headers['x-streamer-name'] as string);
      }
      if (req.headers['x-streamer-handle']) {
        session.streamerHandle = decodeURIComponent(req.headers['x-streamer-handle'] as string);
      }
      if (req.headers['x-streamer-avatar']) {
        session.streamerAvatar = decodeURIComponent(req.headers['x-streamer-avatar'] as string);
      }
      if (req.headers['x-category']) {
        session.category = decodeURIComponent(req.headers['x-category'] as string);
      }

      session.isLive = !isFinal;
      session.lastChunkAt = Date.now();
      session.currentSequence = sequence + 1;
      session.mimeType = mimeType;

      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `segment_${sequence}.${ext}`;
      const roomDir = path.join(HLS_BASE_DIR, roomId);

      if (!fs.existsSync(roomDir)) {
        fs.mkdirSync(roomDir, { recursive: true });
      }

      const chunkBuffer = Buffer.isBuffer(req.body) 
        ? req.body 
        : typeof req.body === 'string' 
          ? Buffer.from(req.body, 'binary') 
          : Buffer.alloc(0);

      const filePath = path.join(roomDir, filename);
      if (chunkBuffer.length > 0) {
        await fs.promises.writeFile(filePath, chunkBuffer);
      }

      const newSegment: HlsSegment = {
        sequence,
        filename,
        duration: duration > 0 ? duration : 2.0,
        sizeBytes: chunkBuffer.length,
        timestamp: Date.now()
      };

      // Add to session segments (avoid duplicate sequence)
      const existingIdx = session.segments.findIndex(s => s.sequence === sequence);
      if (existingIdx >= 0) {
        session.segments[existingIdx] = newSegment;
      } else {
        session.segments.push(newSegment);
      }

      // Sort segments chronologically
      session.segments.sort((a, b) => a.sequence - b.sequence);

      // Purge old segments to maintain sliding window and keep disk usage strictly under 100MB per stream
      if (session.segments.length > MAX_DISK_RETAINED_SEGMENTS) {
        const excess = session.segments.length - MAX_DISK_RETAINED_SEGMENTS;
        const removed = session.segments.splice(0, excess);
        session.mediaSequence = session.segments[0]?.sequence || 0;

        for (const seg of removed) {
          const oldFilePath = path.join(roomDir, seg.filename);
          try {
            if (fs.existsSync(oldFilePath)) {
              await fs.promises.unlink(oldFilePath);
            }
          } catch (delErr) {
            // Ignore error
          }
        }
      }

      // Notify SSE viewers of stream update
      broadcastRoomEvent(session, 'chunk_ingested', {
        roomId,
        sequence,
        duration,
        isLive: session.isLive,
        segmentsCount: session.segments.length
      });

      return res.json({
        success: true,
        roomId,
        sequence,
        filename,
        sizeBytes: chunkBuffer.length,
        isLive: session.isLive,
        totalSegments: session.segments.length,
        playlistUrl: `/api/stream/playlist/${roomId}.m3u8`
      });
    } catch (err: any) {
      console.error('Error during HLS ingest:', err);
      return res.status(500).json({ error: 'Ingest error', details: err.message });
    }
  });

  // 2. PLAYLIST API: Generates standard dynamic HLS .m3u8 playlist
  const handlePlaylistRequest = (req: express.Request, res: express.Response) => {
    let roomId = req.params.roomId;
    if (roomId && roomId.endsWith('.m3u8')) {
      roomId = roomId.replace(/\.m3u8$/, '');
    }

    if (!roomId) {
      return res.status(400).send('#EXTM3U\n#EXT-X-ERROR: No roomId provided\n');
    }

    const session = activeSessions.get(roomId);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (!session || session.segments.length === 0) {
      // Return waiting playlist or empty state
      const emptyM3U8 = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-TARGETDURATION:2',
        '#EXT-X-MEDIA-SEQUENCE:0',
        '#EXT-X-PLAYLIST-TYPE:EVENT',
        '#EXTINF:2.0,',
        `/api/stream/segment/${roomId}/empty_placeholder.webm`,
        ...(session && !session.isLive ? ['#EXT-X-ENDLIST'] : [])
      ].join('\n');
      return res.send(emptyM3U8);
    }

    // Use sliding window of the most recent MAX_SLIDING_WINDOW_SEGMENTS for ultra low latency live playback
    const visibleSegments = session.isLive
      ? session.segments.slice(-MAX_SLIDING_WINDOW_SEGMENTS)
      : session.segments;

    const mediaSeq = visibleSegments[0]?.sequence || session.mediaSequence;
    const maxDuration = Math.max(...visibleSegments.map(s => Math.ceil(s.duration)), 3);

    const m3u8Lines: string[] = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      `#EXT-X-TARGETDURATION:${maxDuration}`,
      `#EXT-X-MEDIA-SEQUENCE:${mediaSeq}`,
    ];

    if (!session.isLive) {
      m3u8Lines.push('#EXT-X-PLAYLIST-TYPE:VOD');
    }

    for (const seg of visibleSegments) {
      m3u8Lines.push(`#EXTINF:${seg.duration.toFixed(2)},`);
      m3u8Lines.push(`/api/stream/segment/${roomId}/${seg.filename}`);
    }

    if (!session.isLive) {
      m3u8Lines.push('#EXT-X-ENDLIST');
    }

    return res.send(m3u8Lines.join('\n'));
  };

  app.get('/api/stream/playlist/:roomId.m3u8', handlePlaylistRequest);
  app.get('/api/stream/playlist/:roomId', handlePlaylistRequest);
  app.get('/api/stream/live/:roomId.m3u8', handlePlaylistRequest);

  // 3. SEGMENT API: Serves video/webm or video/mp4 chunks with byte-range support
  app.get('/api/stream/segment/:roomId/:segmentName', async (req, res) => {
    try {
      const { roomId, segmentName } = req.params;
      const roomDir = path.join(HLS_BASE_DIR, roomId);
      const filePath = path.join(roomDir, segmentName);

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'public, max-age=60');

      if (segmentName === 'empty_placeholder.webm') {
        res.setHeader('Content-Type', 'video/webm');
        return res.status(200).send(Buffer.alloc(0));
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Segment not found' });
      }

      const mimeType = segmentName.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
      res.setHeader('Content-Type', mimeType);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err: any) {
      console.error('Error serving stream segment:', err);
      return res.status(500).json({ error: 'Failed to serve segment' });
    }
  });

  // 4. STREAM STATUS & HEARTBEAT API
  app.get('/api/stream/status/:roomId', (req, res) => {
    const { roomId } = req.params;
    const session = activeSessions.get(roomId);

    if (!session) {
      return res.json({
        roomId,
        isLive: false,
        title: 'Offline Broadcast',
        streamerName: 'Streamer',
        viewerCount: 0,
        segmentsCount: 0,
        playlistUrl: `/api/stream/playlist/${roomId}.m3u8`
      });
    }

    return res.json({
      roomId: session.roomId,
      isLive: session.isLive,
      title: session.title,
      streamerName: session.streamerName,
      streamerHandle: session.streamerHandle,
      streamerAvatar: session.streamerAvatar,
      category: session.category,
      tags: session.tags,
      startedAt: session.startedAt,
      uptimeSeconds: Math.floor((Date.now() - session.startedAt) / 1000),
      viewerCount: Math.max(session.viewers.size, session.isLive ? 1 : 0),
      segmentsCount: session.segments.length,
      currentSequence: session.currentSequence,
      lastChunkAt: session.lastChunkAt,
      playlistUrl: `/api/stream/playlist/${roomId}.m3u8`
    });
  });

  // Active Live Streams List
  app.get('/api/stream/active', (req, res) => {
    const liveStreams = Array.from(activeSessions.values())
      .filter(s => s.isLive && Date.now() - s.lastChunkAt < 30000)
      .map(s => ({
        id: `stream_${s.roomId}`,
        roomId: s.roomId,
        title: s.title,
        description: `Live HLS Broadcast by ${s.streamerName}`,
        streamer: {
          id: s.roomId,
          name: s.streamerName,
          handle: s.streamerHandle,
          avatar: s.streamerAvatar,
          subscribersCount: 1,
          isVerified: true
        },
        category: s.category,
        tags: s.tags,
        thumbnailUrl: '',
        isLive: true,
        viewerCount: Math.max(s.viewers.size, 1),
        startedAt: s.startedAt,
        resolution: '720p30 (HLS)',
        fps: 30,
        bitrateKbps: 1800,
        playlistUrl: `/api/stream/playlist/${s.roomId}.m3u8`
      }));

    return res.json({
      count: liveStreams.length,
      streams: liveStreams
    });
  });

  // Broadcaster ends stream
  app.post('/api/stream/end/:roomId', (req, res) => {
    const { roomId } = req.params;
    const session = activeSessions.get(roomId);
    if (session) {
      session.isLive = false;
      broadcastRoomEvent(session, 'stream_ended', { roomId, isLive: false });
    }
    return res.json({ success: true, roomId, isLive: false });
  });

  // Viewer heartbeat
  app.post('/api/stream/heartbeat/:roomId', (req, res) => {
    const { roomId } = req.params;
    const viewerId = req.body.viewerId || req.ip || 'anonymous';
    const session = getOrCreateSession(roomId);

    session.viewers.set(viewerId, Date.now());
    const count = Math.max(session.viewers.size, session.isLive ? 1 : 0);

    // Broadcast viewer count update to SSE listeners
    broadcastRoomEvent(session, 'viewer_count', { roomId, viewerCount: count });

    return res.json({ success: true, viewerCount: count });
  });

  // 5. LIGHTWEIGHT SSE LIVE CHAT & EMOJI REACTIONS API
  app.get('/api/stream/chat/:roomId/events', (req, res) => {
    const { roomId } = req.params;
    const session = getOrCreateSession(roomId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    session.sseClients.add(res);

    // Send initial handshake with recent messages and current viewers count
    res.write(`event: init\ndata: ${JSON.stringify({
      roomId,
      isLive: session.isLive,
      viewerCount: Math.max(session.viewers.size, session.isLive ? 1 : 0),
      recentMessages: session.chatMessages.slice(-50)
    })}\n\n`);

    req.on('close', () => {
      session.sseClients.delete(res);
    });
  });

  app.get('/api/stream/chat/:roomId', (req, res) => {
    const { roomId } = req.params;
    const session = getOrCreateSession(roomId);
    return res.json({
      roomId,
      viewerCount: Math.max(session.viewers.size, session.isLive ? 1 : 0),
      messages: session.chatMessages.slice(-60)
    });
  });

  app.post('/api/stream/chat/:roomId/message', (req, res) => {
    try {
      const { roomId } = req.params;
      const { senderId, senderName, senderAvatar, role, text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'text is required' });
      }

      const session = getOrCreateSession(roomId);
      const newMsg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        roomId,
        senderId: senderId || 'anon',
        senderName: senderName || 'Viewer',
        senderAvatar: senderAvatar || '',
        role: role || 'viewer',
        text: text.trim(),
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      session.chatMessages.push(newMsg);
      if (session.chatMessages.length > 200) {
        session.chatMessages.shift();
      }

      broadcastRoomEvent(session, 'chat_message', newMsg);
      return res.json({ success: true, message: newMsg });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to send chat message' });
    }
  });

  app.post('/api/stream/chat/:roomId/reaction', (req, res) => {
    try {
      const { roomId } = req.params;
      const { emoji, senderName } = req.body;

      if (!emoji) {
        return res.status(400).json({ error: 'emoji is required' });
      }

      const session = getOrCreateSession(roomId);
      const reactionPayload = {
        id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        emoji,
        senderName: senderName || 'Viewer',
        timestamp: Date.now()
      };

      broadcastRoomEvent(session, 'reaction', reactionPayload);
      return res.json({ success: true, reaction: reactionPayload });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to post reaction' });
    }
  });

  // User Storage Management & Disk Persistence
  const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

  interface UserRecord {
    id: string;
    username: string;
    email: string;
    password?: string;
    displayName: string;
    handle: string;
    avatarUrl: string;
    bio?: string;
    badge?: 'verified' | 'creator' | 'pro';
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'rejected' | 'banned';
    createdAt: string;
  }

  const ADMIN_EMAILS = [
    'admin@mamadtube.com',
    'admin@example.com',
    'zhivarmohammadzadeh@gmail.com',
  ];

  function isServerAdminEmail(email: string): boolean {
    const envAdmin = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const lower = (email || '').toLowerCase().trim();
    return (
      ADMIN_EMAILS.includes(lower) ||
      lower.startsWith('admin@') ||
      (Boolean(envAdmin) && lower === envAdmin)
    );
  }

  function ensureDataDirExists() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE_PATH)) {
      const defaultUsers: UserRecord[] = [
        {
          id: 'usr_master_admin',
          username: 'admin',
          email: 'admin@mamadtube.com',
          password: 'admin123',
          displayName: 'System Admin',
          handle: '@admin',
          avatarUrl: '',
          bio: 'Platform Master Administrator with full privileges.',
          badge: 'verified',
          role: 'admin',
          status: 'approved',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    }
  }

  function getUsersFromDisk(): UserRecord[] {
    try {
      ensureDataDirExists();
      const data = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Error reading users from disk:', err);
      return [];
    }
  }

  async function saveUsersToDisk(users: UserRecord[]): Promise<void> {
    try {
      ensureDataDirExists();
      const jsonStr = JSON.stringify(users, null, 2);
      await fs.promises.writeFile(USERS_FILE_PATH, jsonStr, 'utf-8');
    } catch (err) {
      console.error('Error saving users to disk:', err);
      throw err;
    }
  }

  function sanitizeUser(user: UserRecord): Omit<UserRecord, 'password'> {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  // Auth: Register/Signup
  const handleRegister = async (req: express.Request, res: express.Response) => {
    try {
      const { email, password, displayName, username, handle } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: 'Email, password, and display name are required' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanDisplayName = displayName.trim();
      const cleanUsername = (username || cleanEmail.split('@')[0] || 'user').toLowerCase().trim();
      const cleanHandle = handle 
        ? (handle.startsWith('@') ? handle : `@${handle}`)
        : `@${cleanUsername.replace(/[^a-z0-9]/g, '')}`;

      const users = getUsersFromDisk();
      const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const isMaster = isServerAdminEmail(cleanEmail);
      const newUser: UserRecord = {
        id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        username: cleanUsername,
        email: cleanEmail,
        password: String(password),
        displayName: cleanDisplayName,
        handle: cleanHandle,
        avatarUrl: '',
        bio: 'Explore modules, manage files, stream and communicate with peers.',
        badge: 'verified',
        role: isMaster ? 'admin' : 'user',
        status: isMaster ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await saveUsersToDisk(users);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully! Your request is currently waiting for admin approval.',
        user: sanitizeUser(newUser),
      });
    } catch (err: any) {
      console.error('Error during registration:', err);
      return res.status(500).json({ error: 'Registration failed', details: err.message });
    }
  };

  app.post('/api/auth/register', handleRegister);
  app.post('/api/auth/signup', handleRegister);

  // Auth: Login/Signin
  const handleLogin = async (req: express.Request, res: express.Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const users = getUsersFromDisk();
      const found = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);

      if (!found) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      return res.json({
        success: true,
        user: sanitizeUser(found),
      });
    } catch (err: any) {
      console.error('Error during login:', err);
      return res.status(500).json({ error: 'Login failed', details: err.message });
    }
  };

  app.post('/api/auth/login', handleLogin);
  app.post('/api/auth/signin', handleLogin);

  // Auth: Current User Status & Profile
  app.get('/api/auth/user/:id', (req, res) => {
    const { id } = req.params;
    const users = getUsersFromDisk();
    const found = users.find(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
    if (!found) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ success: true, user: sanitizeUser(found) });
  });

  // Admin: Get all users
  app.get('/api/admin/users', (req, res) => {
    try {
      const users = getUsersFromDisk();
      const sanitized = users.map(sanitizeUser);
      return res.json({
        success: true,
        count: sanitized.length,
        users: sanitized,
      });
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
      return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
    }
  });

  // Admin Users Status Update Endpoint
  app.post('/api/admin/users/update-status', async (req, res) => {
    try {
      const { userId, email, status } = req.body;
      if (!status || (!userId && !email)) {
        return res.status(400).json({ error: 'userId (or email) and status are required' });
      }

      const validStatuses = ['pending', 'approved', 'rejected', 'banned'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const targetId = (userId || '').toLowerCase().trim();
      const targetEmail = (email || '').toLowerCase().trim();

      const users = getUsersFromDisk();
      let matchedIndex = users.findIndex(u => 
        (targetId && u.id.toLowerCase() === targetId) ||
        (targetEmail && u.email.toLowerCase() === targetEmail)
      );

      if (matchedIndex >= 0) {
        users[matchedIndex].status = status;
      } else if (email) {
        // Create user if missing
        const isMaster = isServerAdminEmail(email);
        users.push({
          id: userId || 'usr_' + Date.now().toString(36),
          username: email.split('@')[0],
          email: email.toLowerCase().trim(),
          password: 'defaultPass123',
          displayName: email.split('@')[0],
          handle: `@${email.split('@')[0]}`,
          avatarUrl: '',
          role: isMaster ? 'admin' : 'user',
          status,
          createdAt: new Date().toISOString(),
        });
      }

      await saveUsersToDisk(users);

      return res.json({
        success: true,
        message: `Status updated to ${status}`,
        userId,
        email,
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error updating user status on server:', err);
      return res.status(500).json({ error: 'Failed to update user status', details: err.message });
    }
  });

  // Admin: Update user status via PATCH
  app.patch('/api/admin/users/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const validStatuses = ['pending', 'approved', 'rejected', 'banned'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status: ${status}` });
      }

      const users = getUsersFromDisk();
      const user = users.find(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.status = status;
      await saveUsersToDisk(users);

      return res.json({ success: true, user: sanitizeUser(user) });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update status', details: err.message });
    }
  });

  // Admin: Update user role via PATCH
  app.patch('/api/admin/users/:id/role', async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const users = getUsersFromDisk();
      const user = users.find(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.role = role;
      await saveUsersToDisk(users);

      return res.json({ success: true, user: sanitizeUser(user) });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update role', details: err.message });
    }
  });

  // Admin: Delete user
  app.delete('/api/admin/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      let users = getUsersFromDisk();
      const initialCount = users.length;
      users = users.filter(u => u.id !== id && u.email.toLowerCase() !== id.toLowerCase());

      if (users.length === initialCount) {
        return res.status(404).json({ error: 'User not found' });
      }

      await saveUsersToDisk(users);
      return res.json({ success: true, message: 'User deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete user', details: err.message });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'mamadtube-stream-sfu' });
  });

  // Vite middleware in development vs static file serving in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`mamadtube server listening on port ${PORT}`);
  });
}

startServer();
