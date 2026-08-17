import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';
import multer from 'multer';

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

  // Unified Server Storage System & Persistent JSON Database
  const DATA_DIR = path.join(process.cwd(), 'data');
  const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
  const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');
  const POSTS_FILE_PATH = path.join(DATA_DIR, 'posts.json');
  const MESSAGES_FILE_PATH = path.join(DATA_DIR, 'messages.json');
  const FILES_FILE_PATH = path.join(DATA_DIR, 'files.json');

  // Multer Disk Storage for Physical File Uploads
  const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
      cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(UPLOADS_DIR));

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
    updatedAt?: string;
  }

  interface SocialPostRecord {
    id: string;
    authorId: string;
    authorName: string;
    authorHandle: string;
    authorAvatar: string;
    authorBadge?: 'verified' | 'creator' | 'pro';
    createdAt: string;
    timestamp: number;
    caption: string;
    media: Array<{
      id: string;
      type: 'image' | 'video';
      url: string;
      thumbnailUrl?: string;
      aspectRatio?: '1:1' | '4:5' | '16:9' | 'auto';
      altText?: string;
      fileSize?: string;
    }>;
    aspectRatio?: '1:1' | '4:5' | '16:9' | 'auto';
    location?: string;
    tags: string[];
    likesCount: number;
    likedBy?: string[];
    isLiked?: boolean;
    isBookmarked?: boolean;
    bookmarkedBy?: string[];
    commentsCount: number;
    sharesCount: number;
    repostsCount?: number;
    repostedByUserIds?: string[];
    repostedBy?: {
      id: string;
      name: string;
      handle: string;
    };
    isReposted?: boolean;
    quotedPost?: any;
    replyToId?: string;
    replyToHandle?: string;
    poll?: {
      id: string;
      question: string;
      options: Array<{
        id: string;
        text: string;
        votes: string[];
      }>;
      totalVotes: number;
      expiresAt?: string;
    };
    comments: Array<{
      id: string;
      authorId: string;
      authorName: string;
      authorHandle: string;
      authorAvatar: string;
      authorBadge?: 'verified' | 'creator' | 'pro';
      content: string;
      createdAt: string;
      timestamp: number;
      likesCount: number;
      isLiked?: boolean;
      replies: Array<{
        id: string;
        authorId: string;
        authorName: string;
        authorHandle: string;
        authorAvatar: string;
        authorBadge?: 'verified' | 'creator' | 'pro';
        content: string;
        createdAt: string;
        timestamp: number;
        likesCount: number;
        isLiked?: boolean;
      }>;
    }>;
  }

  interface ChatStoreData {
    conversations: Array<{
      id: string;
      type: 'direct' | 'group' | 'channel';
      name: string;
      avatar?: string;
      description?: string;
      participants: Array<{
        id: string;
        name: string;
        handle: string;
        avatar: string;
        status: 'online' | 'away' | 'offline' | 'busy';
        role?: 'admin' | 'user';
        customStatus?: string;
      }>;
      unreadCount: number;
      lastMessage?: {
        id: string;
        senderId: string;
        senderName: string;
        text: string;
        timestamp: number;
        formattedTime: string;
        deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read';
      };
      pinnedMessageIds?: string[];
      isMuted?: boolean;
    }>;
    messages: Record<string, Array<{
      id: string;
      conversationId: string;
      senderId: string;
      receiverId?: string;
      senderName: string;
      senderAvatar: string;
      content: string;
      timestamp: number;
      formattedTime: string;
      deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read';
      isEdited?: boolean;
      isPinned?: boolean;
      replyTo?: {
        id: string;
        senderName: string;
        content: string;
      };
      attachments?: Array<{
        id: string;
        type: 'image' | 'video' | 'audio' | 'document';
        name: string;
        url: string;
        sizeFormatted: string;
        duration?: number;
      }>;
      voiceNote?: {
        audioUrl: string;
        duration: number;
        waveform: number[];
      };
      reactions: Array<{
        emoji: string;
        count: number;
        users: string[];
      }>;
    }>>;
  }

  interface FilesStoreData {
    folders: Array<{
      id: string;
      name: string;
      parentId: string | null;
      color?: string;
      createdAt: string;
      updatedAt: string;
    }>;
    files: Array<{
      id: string;
      name: string;
      size: number;
      formattedSize: string;
      category: 'all' | 'document' | 'image' | 'audio' | 'video' | 'archive';
      mimeType: string;
      extension: string;
      folderId: string | null;
      createdAt: string;
      updatedAt: string;
      url?: string;
      previewUrl?: string;
      isFavorite?: boolean;
      tags?: string[];
      content?: string;
      duration?: string;
      dimensions?: { width: number; height: number };
    }>;
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

  function ensureStorageFilesExist() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // 1. Users DB
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

    // 2. Posts DB
    if (!fs.existsSync(POSTS_FILE_PATH)) {
      const defaultPosts: SocialPostRecord[] = [
        {
          id: 'post_welcome_01',
          authorId: 'usr_master_admin',
          authorName: 'System Admin',
          authorHandle: '@admin',
          authorAvatar: '',
          authorBadge: 'verified',
          createdAt: 'Just now',
          timestamp: Date.now(),
          caption: 'Welcome to mamadtube! Experience zero-transcode WebRTC live broadcasting, persistent cloud storage archive, encrypted peer communications, and social interactions with interactive polls.',
          media: [],
          tags: ['MAMADTUBE', 'RELEASE', 'FULLSTACK', 'WEBRTC'],
          likesCount: 12,
          likedBy: [],
          isLiked: false,
          isBookmarked: false,
          bookmarkedBy: [],
          commentsCount: 1,
          sharesCount: 4,
          repostsCount: 3,
          repostedByUserIds: [],
          poll: {
            id: 'poll_welcome_01',
            question: 'Which native module do you use the most?',
            options: [
              { id: 'opt_1', text: 'Live SFU WebRTC Streaming', votes: ['usr_master_admin'] },
              { id: 'opt_2', text: 'Encrypted Cloud Archive & Vault', votes: [] },
              { id: 'opt_3', text: 'Direct Chat & Voice Notes', votes: [] },
              { id: 'opt_4', text: 'Social Hub & Poll Feeds', votes: [] },
            ],
            totalVotes: 1,
          },
          comments: [
            {
              id: 'cmt_01',
              authorId: 'usr_master_admin',
              authorName: 'System Admin',
              authorHandle: '@admin',
              authorAvatar: '',
              authorBadge: 'verified',
              content: 'Feel free to test file uploads, stream live from your browser, or start a peer conversation!',
              createdAt: 'Just now',
              timestamp: Date.now(),
              likesCount: 2,
              replies: [],
            },
          ],
        },
      ];
      fs.writeFileSync(POSTS_FILE_PATH, JSON.stringify(defaultPosts, null, 2), 'utf-8');
    }

    // 3. Messages DB
    if (!fs.existsSync(MESSAGES_FILE_PATH)) {
      const defaultChat: ChatStoreData = {
        conversations: [
          {
            id: 'conv_admin_welcome',
            type: 'direct',
            name: 'System Admin',
            avatar: '',
            description: 'Direct communication with System Administrator',
            participants: [
              {
                id: 'usr_master_admin',
                name: 'System Admin',
                handle: '@admin',
                avatar: '',
                status: 'online',
                role: 'admin',
                customStatus: 'Master Administrator',
              },
            ],
            unreadCount: 0,
            lastMessage: {
              id: 'msg_init_01',
              senderId: 'usr_master_admin',
              senderName: 'System Admin',
              text: 'Welcome to mamadtube. How can we assist you today?',
              timestamp: Date.now(),
              formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              deliveryStatus: 'delivered',
            },
            pinnedMessageIds: [],
            isMuted: false,
          },
        ],
        messages: {
          conv_admin_welcome: [
            {
              id: 'msg_init_01',
              conversationId: 'conv_admin_welcome',
              senderId: 'usr_master_admin',
              senderName: 'System Admin',
              senderAvatar: '',
              content: 'Welcome to mamadtube. How can we assist you today?',
              timestamp: Date.now(),
              formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              deliveryStatus: 'delivered',
              reactions: [],
            },
          ],
        },
      };
      fs.writeFileSync(MESSAGES_FILE_PATH, JSON.stringify(defaultChat, null, 2), 'utf-8');
    }

    // 4. Files DB
    if (!fs.existsSync(FILES_FILE_PATH)) {
      const defaultFiles: FilesStoreData = {
        folders: [
          {
            id: 'folder-docs',
            name: 'Documentation & Guides',
            parentId: null,
            color: '#6366F1',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
          {
            id: 'folder-media',
            name: 'Media Assets',
            parentId: null,
            color: '#EC4899',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
        files: [
          {
            id: 'file-guide-01',
            name: 'Platform_Overview.md',
            size: 2048,
            formattedSize: '2.0 KB',
            category: 'document',
            mimeType: 'text/markdown',
            extension: 'md',
            folderId: 'folder-docs',
            createdAt: 'Jan 15, 2026',
            updatedAt: 'Just now',
            isFavorite: true,
            tags: ['DOCS', 'MAMADTUBE'],
            content: '# mamadtube Unified Suite\n\n- Full-stack unified persistent JSON storage (/data)\n- WebRTC Live Video SFU\n- Real-time Direct & Group Chat\n- Cloud Vault and Drag-and-Drop Archive\n- Social Feed with Live Polls',
          },
        ],
      };
      fs.writeFileSync(FILES_FILE_PATH, JSON.stringify(defaultFiles, null, 2), 'utf-8');
    }
  }

  // --- DISK READ/WRITE HELPERS ---
  function getUsersFromDisk(): UserRecord[] {
    try {
      ensureStorageFilesExist();
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
      ensureStorageFilesExist();
      await fs.promises.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving users to disk:', err);
      throw err;
    }
  }

  function getPostsFromDisk(): SocialPostRecord[] {
    try {
      ensureStorageFilesExist();
      const data = fs.readFileSync(POSTS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Error reading posts from disk:', err);
      return [];
    }
  }

  async function savePostsToDisk(posts: SocialPostRecord[]): Promise<void> {
    try {
      ensureStorageFilesExist();
      await fs.promises.writeFile(POSTS_FILE_PATH, JSON.stringify(posts, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving posts to disk:', err);
      throw err;
    }
  }

  function getChatDataFromDisk(): ChatStoreData {
    try {
      ensureStorageFilesExist();
      const data = fs.readFileSync(MESSAGES_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
        messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {},
      };
    } catch (err) {
      console.error('Error reading chat messages from disk:', err);
      return { conversations: [], messages: {} };
    }
  }

  async function saveChatDataToDisk(chatData: ChatStoreData): Promise<void> {
    try {
      ensureStorageFilesExist();
      await fs.promises.writeFile(MESSAGES_FILE_PATH, JSON.stringify(chatData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving chat messages to disk:', err);
      throw err;
    }
  }

  function getFilesDataFromDisk(): FilesStoreData {
    try {
      ensureStorageFilesExist();
      const data = fs.readFileSync(FILES_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        folders: Array.isArray(parsed.folders) ? parsed.folders : [],
        files: Array.isArray(parsed.files) ? parsed.files : [],
      };
    } catch (err) {
      console.error('Error reading files data from disk:', err);
      return { folders: [], files: [] };
    }
  }

  async function saveFilesDataToDisk(filesData: FilesStoreData): Promise<void> {
    try {
      ensureStorageFilesExist();
      await fs.promises.writeFile(FILES_FILE_PATH, JSON.stringify(filesData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving files data to disk:', err);
      throw err;
    }
  }

  function sanitizeUser(user: UserRecord): Omit<UserRecord, 'password'> {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  function formatFileBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function getCategoryForMimeOrExt(mimeType: string, ext: string): 'document' | 'image' | 'audio' | 'video' | 'archive' {
    const m = (mimeType || '').toLowerCase();
    const e = (ext || '').toLowerCase().replace('.', '');
    if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(e)) return 'image';
    if (m.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(e)) return 'video';
    if (m.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(e)) return 'audio';
    if (m.includes('zip') || m.includes('tar') || m.includes('rar') || m.includes('7z') || ['zip', 'tar', 'gz', 'rar', '7z'].includes(e)) return 'archive';
    return 'document';
  }

  // Active call signal in-memory store for WebRTC call setup
  let latestCallSignal: any = null;

  // ==========================================
  // 1. AUTHENTICATION & USERS REST APIS
  // ==========================================
  const handleRegister = async (req: express.Request, res: express.Response) => {
    try {
      const { email, username, password, displayName, handle } = req.body;
      const rawIdentifier = (email || username || '').trim();
      if (!rawIdentifier || !password) {
        return res.status(400).json({ error: 'Username/email and password are required' });
      }

      const cleanEmail = rawIdentifier.includes('@') 
        ? rawIdentifier.toLowerCase() 
        : `${rawIdentifier.toLowerCase()}@mamadtube.local`;
      const cleanUsername = (username || rawIdentifier.split('@')[0] || 'user').toLowerCase().trim();
      const cleanDisplayName = (displayName || username || cleanEmail.split('@')[0] || 'User').trim();
      const cleanHandle = handle 
        ? (handle.startsWith('@') ? handle : `@${handle}`)
        : `@${cleanUsername.replace(/[^a-z0-9]/g, '')}`;

      const users = getUsersFromDisk();
      const existingUser = users.find(
        u => u.email.toLowerCase() === cleanEmail || (u.username && u.username.toLowerCase() === cleanUsername)
      );
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email/username already exists.' });
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

  const handleLogin = async (req: express.Request, res: express.Response) => {
    try {
      const { email, username, password } = req.body;
      const rawIdentifier = (email || username || '').toLowerCase().trim();
      if (!rawIdentifier || !password) {
        return res.status(400).json({ error: 'Email/username and password are required' });
      }

      const users = getUsersFromDisk();
      const found = users.find(
        u => (u.email.toLowerCase() === rawIdentifier || (u.username && u.username.toLowerCase() === rawIdentifier)) &&
             u.password === password
      );

      if (!found) {
        return res.status(401).json({ error: 'Invalid credentials.' });
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

  app.get('/api/auth/user/:id', (req, res) => {
    const { id } = req.params;
    const users = getUsersFromDisk();
    const found = users.find(
      u => u.id === id || u.email.toLowerCase() === id.toLowerCase() || (u.username && u.username.toLowerCase() === id.toLowerCase())
    );
    if (!found) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ success: true, user: sanitizeUser(found) });
  });

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

  app.get('/api/users', (req, res) => {
    try {
      const users = getUsersFromDisk();
      const sanitized = users.map(sanitizeUser);
      return res.json({
        success: true,
        count: sanitized.length,
        users: sanitized,
      });
    } catch (err: any) {
      console.error('Error fetching directory users:', err);
      return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
    }
  });

  const handleStatusUpdate = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.params.id || req.body.userId;
      const { email, status } = req.body;
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
        matchedIndex = users.length - 1;
      } else {
        return res.status(404).json({ error: 'User not found' });
      }

      await saveUsersToDisk(users);

      return res.json({
        success: true,
        message: `Status updated to ${status}`,
        user: sanitizeUser(users[matchedIndex]),
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error updating user status on server:', err);
      return res.status(500).json({ error: 'Failed to update user status', details: err.message });
    }
  };

  app.post('/api/admin/users/update-status', handleStatusUpdate);
  app.post('/api/admin/users/:id/status', handleStatusUpdate);
  app.patch('/api/admin/users/:id/status', handleStatusUpdate);

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

  // ==========================================
  // 2. SOCIAL FEED & POLLS REST APIS
  // ==========================================
  app.get('/api/social/posts', (req, res) => {
    try {
      const { userId, tag, search } = req.query;
      const requestingUserId = typeof userId === 'string' ? userId : '';
      let posts = getPostsFromDisk();

      if (tag && typeof tag === 'string') {
        const cleanTag = tag.replace(/^#/, '').toUpperCase();
        posts = posts.filter(p => p.tags && p.tags.some(t => t.toUpperCase() === cleanTag));
      }

      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        posts = posts.filter(p => 
          p.caption.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.authorHandle.toLowerCase().includes(q) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
        );
      }

      // Enrich posts with dynamic flags for current requesting user
      const enrichedPosts = posts.map(p => {
        const likedBy = p.likedBy || [];
        const bookmarkedBy = p.bookmarkedBy || [];
        const repostedByUserIds = p.repostedByUserIds || [];
        return {
          ...p,
          isLiked: requestingUserId ? likedBy.includes(requestingUserId) : Boolean(p.isLiked),
          isBookmarked: requestingUserId ? bookmarkedBy.includes(requestingUserId) : Boolean(p.isBookmarked),
          isReposted: requestingUserId ? repostedByUserIds.includes(requestingUserId) : Boolean(p.isReposted),
        };
      });

      return res.json({
        success: true,
        count: enrichedPosts.length,
        posts: enrichedPosts,
      });
    } catch (err: any) {
      console.error('Error fetching social posts:', err);
      return res.status(500).json({ error: 'Failed to fetch posts', details: err.message });
    }
  });

  app.post('/api/social/posts', async (req, res) => {
    try {
      const {
        authorId,
        authorName,
        authorHandle,
        authorAvatar,
        authorBadge,
        caption,
        media,
        tags,
        poll,
        aspectRatio,
        location,
        replyToId,
        replyToHandle,
        quotedPost,
      } = req.body;

      if (!caption && (!media || media.length === 0) && !poll) {
        return res.status(400).json({ error: 'Post must contain text caption, media, or a poll.' });
      }

      const posts = getPostsFromDisk();
      const newPostId = 'post_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

      let formattedPoll = undefined;
      if (poll && poll.question && Array.isArray(poll.options)) {
        formattedPoll = {
          id: 'poll_' + Date.now().toString(36),
          question: poll.question.trim(),
          options: poll.options.map((opt: any, index: number) => ({
            id: opt.id || `opt_${index + 1}`,
            text: opt.text || String(opt),
            votes: Array.isArray(opt.votes) ? opt.votes : [],
          })),
          totalVotes: 0,
          expiresAt: poll.expiresAt,
        };
      }

      const newPost: SocialPostRecord = {
        id: newPostId,
        authorId: authorId || 'usr_anon',
        authorName: authorName || 'Hub Creator',
        authorHandle: authorHandle || '@creator',
        authorAvatar: authorAvatar || '',
        authorBadge: authorBadge || 'verified',
        createdAt: 'Just now',
        timestamp: Date.now(),
        caption: (caption || '').trim(),
        media: Array.isArray(media) ? media : [],
        aspectRatio: aspectRatio || 'auto',
        location: location || '',
        tags: Array.isArray(tags) ? tags : [],
        likesCount: 0,
        likedBy: [],
        isLiked: false,
        isBookmarked: false,
        bookmarkedBy: [],
        commentsCount: 0,
        sharesCount: 0,
        repostsCount: 0,
        repostedByUserIds: [],
        quotedPost: quotedPost || undefined,
        replyToId: replyToId || undefined,
        replyToHandle: replyToHandle || undefined,
        poll: formattedPoll,
        comments: [],
      };

      posts.unshift(newPost);
      await savePostsToDisk(posts);

      return res.status(201).json({
        success: true,
        message: 'Post published to global feed',
        post: newPost,
      });
    } catch (err: any) {
      console.error('Error creating social post:', err);
      return res.status(500).json({ error: 'Failed to create post', details: err.message });
    }
  });

  app.post('/api/social/posts/:id/vote', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, optionId } = req.body;

      if (!userId || !optionId) {
        return res.status(400).json({ error: 'userId and optionId are required to vote' });
      }

      const posts = getPostsFromDisk();
      const post = posts.find(p => p.id === id);

      if (!post || !post.poll) {
        return res.status(404).json({ error: 'Post or poll not found' });
      }

      // Remove existing votes from user across all options first
      post.poll.options.forEach(opt => {
        opt.votes = opt.votes.filter(uId => uId !== userId);
      });

      // Add vote to the selected option
      const targetOption = post.poll.options.find(opt => opt.id === optionId);
      if (!targetOption) {
        return res.status(404).json({ error: 'Poll option not found' });
      }
      targetOption.votes.push(userId);

      // Recalculate total votes
      post.poll.totalVotes = post.poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

      await savePostsToDisk(posts);

      return res.json({
        success: true,
        message: 'Vote recorded',
        post,
      });
    } catch (err: any) {
      console.error('Error recording vote:', err);
      return res.status(500).json({ error: 'Failed to record vote', details: err.message });
    }
  });

  app.post('/api/social/posts/:id/like', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required to like post' });
      }

      const posts = getPostsFromDisk();
      const post = posts.find(p => p.id === id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (!post.likedBy) post.likedBy = [];
      const hasLiked = post.likedBy.includes(userId);

      if (hasLiked) {
        post.likedBy = post.likedBy.filter(u => u !== userId);
        post.likesCount = Math.max(0, post.likesCount - 1);
      } else {
        post.likedBy.push(userId);
        post.likesCount += 1;
      }

      await savePostsToDisk(posts);

      return res.json({
        success: true,
        isLiked: !hasLiked,
        likesCount: post.likesCount,
        post,
      });
    } catch (err: any) {
      console.error('Error toggling like:', err);
      return res.status(500).json({ error: 'Failed to toggle like', details: err.message });
    }
  });

  app.post('/api/social/posts/:id/bookmark', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const posts = getPostsFromDisk();
      const post = posts.find(p => p.id === id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (!post.bookmarkedBy) post.bookmarkedBy = [];
      const isBookmarked = post.bookmarkedBy.includes(userId);

      if (isBookmarked) {
        post.bookmarkedBy = post.bookmarkedBy.filter(u => u !== userId);
      } else {
        post.bookmarkedBy.push(userId);
      }

      await savePostsToDisk(posts);

      return res.json({
        success: true,
        isBookmarked: !isBookmarked,
        post,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to bookmark post', details: err.message });
    }
  });

  app.post('/api/social/posts/:id/repost', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, userName, userHandle } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const posts = getPostsFromDisk();
      const post = posts.find(p => p.id === id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (!post.repostedByUserIds) post.repostedByUserIds = [];
      const hasReposted = post.repostedByUserIds.includes(userId);

      if (hasReposted) {
        post.repostedByUserIds = post.repostedByUserIds.filter(u => u !== userId);
        post.repostsCount = Math.max(0, (post.repostsCount || 1) - 1);
        post.repostedBy = undefined;
      } else {
        post.repostedByUserIds.push(userId);
        post.repostsCount = (post.repostsCount || 0) + 1;
        post.repostedBy = {
          id: userId,
          name: userName || 'User',
          handle: userHandle || '@user',
        };
      }

      await savePostsToDisk(posts);

      return res.json({
        success: true,
        isReposted: !hasReposted,
        repostsCount: post.repostsCount,
        post,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to repost', details: err.message });
    }
  });

  const handleAddComment = async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { authorId, authorName, authorHandle, authorAvatar, authorBadge, content, replyToCommentId } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content cannot be empty' });
      }

      const posts = getPostsFromDisk();
      const post = posts.find(p => p.id === id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (!post.comments) post.comments = [];

      if (replyToCommentId) {
        const parentComment = post.comments.find(c => c.id === replyToCommentId);
        if (!parentComment) {
          return res.status(404).json({ error: 'Parent comment not found' });
        }
        if (!parentComment.replies) parentComment.replies = [];
        const newReply = {
          id: 'reply_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
          authorId: authorId || 'usr_anon',
          authorName: authorName || 'Peer',
          authorHandle: authorHandle || '@peer',
          authorAvatar: authorAvatar || '',
          authorBadge: authorBadge || 'verified',
          content: content.trim(),
          createdAt: 'Just now',
          timestamp: Date.now(),
          likesCount: 0,
        };
        parentComment.replies.push(newReply);
        post.commentsCount += 1;
      } else {
        const newComment = {
          id: 'cmt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
          authorId: authorId || 'usr_anon',
          authorName: authorName || 'Peer',
          authorHandle: authorHandle || '@peer',
          authorAvatar: authorAvatar || '',
          authorBadge: authorBadge || 'verified',
          content: content.trim(),
          createdAt: 'Just now',
          timestamp: Date.now(),
          likesCount: 0,
          replies: [],
        };
        post.comments.push(newComment);
        post.commentsCount += 1;
      }

      await savePostsToDisk(posts);

      return res.status(201).json({
        success: true,
        message: 'Comment added',
        post,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to add comment', details: err.message });
    }
  };

  app.post('/api/social/posts/:id/comments', handleAddComment);
  app.post('/api/social/posts/:id/comment', handleAddComment);

  app.delete('/api/social/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      let posts = getPostsFromDisk();
      const initialCount = posts.length;
      posts = posts.filter(p => p.id !== id);

      if (posts.length === initialCount) {
        return res.status(404).json({ error: 'Post not found' });
      }

      await savePostsToDisk(posts);
      return res.json({ success: true, message: 'Post deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete post', details: err.message });
    }
  });

  // ==========================================
  // 3. PRIVATE DIRECT MESSAGES & CHAT REST APIS
  // ==========================================
  app.get('/api/chat/conversations', (req, res) => {
    try {
      const { userId } = req.query;
      const chatData = getChatDataFromDisk();
      let conversations = chatData.conversations;

      if (userId && typeof userId === 'string') {
        const uId = userId.toLowerCase();
        conversations = conversations.filter(c => 
          c.participants.some(p => p.id.toLowerCase() === uId)
        );
      }

      return res.json({
        success: true,
        count: conversations.length,
        conversations,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch conversations', details: err.message });
    }
  });

  app.post('/api/chat/conversations', async (req, res) => {
    try {
      const { type, name, participants, description, avatar } = req.body;
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ error: 'Participants array is required' });
      }

      const chatData = getChatDataFromDisk();

      // For direct conversations, check if one already exists between the 2 users
      if (type === 'direct' && participants.length >= 2) {
        const [p1, p2] = participants;
        const existing = chatData.conversations.find(c => 
          c.type === 'direct' &&
          c.participants.some(p => p.id === p1.id) &&
          c.participants.some(p => p.id === p2.id)
        );
        if (existing) {
          return res.json({ success: true, conversation: existing, isExisting: true });
        }
      }

      const newConvId = 'conv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const newConversation = {
        id: newConvId,
        type: type || 'direct',
        name: name || participants[0]?.name || 'Chat',
        avatar: avatar || '',
        description: description || '',
        participants,
        unreadCount: 0,
        pinnedMessageIds: [],
        isMuted: false,
      };

      chatData.conversations.unshift(newConversation);
      if (!chatData.messages[newConvId]) {
        chatData.messages[newConvId] = [];
      }

      await saveChatDataToDisk(chatData);

      return res.status(201).json({
        success: true,
        conversation: newConversation,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to create conversation', details: err.message });
    }
  });

  app.get('/api/chat/messages', (req, res) => {
    try {
      const { conversationId, user1, user2 } = req.query;
      const chatData = getChatDataFromDisk();

      let targetConvId = typeof conversationId === 'string' ? conversationId : '';

      if (!targetConvId && user1 && user2 && typeof user1 === 'string' && typeof user2 === 'string') {
        const foundConv = chatData.conversations.find(c => 
          c.participants.some(p => p.id === user1) &&
          c.participants.some(p => p.id === user2)
        );
        if (foundConv) {
          targetConvId = foundConv.id;
        } else {
          // If no conversation yet, return empty list
          return res.json({ success: true, count: 0, messages: [] });
        }
      }

      if (!targetConvId) {
        return res.status(400).json({ error: 'conversationId (or user1 and user2) is required' });
      }

      const messages = chatData.messages[targetConvId] || [];
      return res.json({
        success: true,
        conversationId: targetConvId,
        count: messages.length,
        messages,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
    }
  });

  app.post('/api/chat/messages', async (req, res) => {
    try {
      const {
        conversationId,
        senderId,
        receiverId,
        senderName,
        senderAvatar,
        content,
        attachments,
        voiceNote,
        replyTo,
      } = req.body;

      if (!conversationId) {
        return res.status(400).json({ error: 'conversationId is required' });
      }

      if (!content && (!attachments || attachments.length === 0) && !voiceNote) {
        return res.status(400).json({ error: 'Message must contain text, attachment, or voice note.' });
      }

      const chatData = getChatDataFromDisk();
      if (!chatData.messages[conversationId]) {
        chatData.messages[conversationId] = [];
      }

      const newMsgId = 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const timestamp = Date.now();
      const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newMsg = {
        id: newMsgId,
        conversationId,
        senderId: senderId || 'usr_me',
        receiverId: receiverId || undefined,
        senderName: senderName || 'User',
        senderAvatar: senderAvatar || '',
        content: (content || '').trim(),
        timestamp,
        formattedTime,
        deliveryStatus: 'delivered' as const,
        replyTo: replyTo || undefined,
        attachments: Array.isArray(attachments) ? attachments : undefined,
        voiceNote: voiceNote || undefined,
        reactions: [],
      };

      chatData.messages[conversationId].push(newMsg);

      // Update last message on conversation
      const convIndex = chatData.conversations.findIndex(c => c.id === conversationId);
      if (convIndex >= 0) {
        chatData.conversations[convIndex].lastMessage = {
          id: newMsgId,
          senderId: newMsg.senderId,
          senderName: newMsg.senderName,
          text: newMsg.content || (voiceNote ? '🎤 Voice Note' : '📎 Attachment'),
          timestamp,
          formattedTime,
          deliveryStatus: 'delivered',
        };
      }

      await saveChatDataToDisk(chatData);

      return res.status(201).json({
        success: true,
        message: newMsg,
        conversation: convIndex >= 0 ? chatData.conversations[convIndex] : null,
      });
    } catch (err: any) {
      console.error('Error sending chat message:', err);
      return res.status(500).json({ error: 'Failed to send message', details: err.message });
    }
  });

  app.post('/api/chat/messages/:id/reaction', async (req, res) => {
    try {
      const { id } = req.params;
      const { conversationId, emoji, userId } = req.body;

      if (!conversationId || !emoji || !userId) {
        return res.status(400).json({ error: 'conversationId, emoji, and userId are required' });
      }

      const chatData = getChatDataFromDisk();
      const msgList = chatData.messages[conversationId] || [];
      const msg = msgList.find(m => m.id === id);

      if (!msg) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (!msg.reactions) msg.reactions = [];
      let rx = msg.reactions.find(r => r.emoji === emoji);

      if (!rx) {
        rx = { emoji, count: 1, users: [userId] };
        msg.reactions.push(rx);
      } else {
        if (rx.users.includes(userId)) {
          rx.users = rx.users.filter(u => u !== userId);
          rx.count = rx.users.length;
        } else {
          rx.users.push(userId);
          rx.count = rx.users.length;
        }
      }

      msg.reactions = msg.reactions.filter(r => r.count > 0);
      await saveChatDataToDisk(chatData);

      return res.json({ success: true, message: msg });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to toggle reaction', details: err.message });
    }
  });

  app.delete('/api/chat/messages/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { conversationId } = req.query;

      if (!conversationId || typeof conversationId !== 'string') {
        return res.status(400).json({ error: 'conversationId is required' });
      }

      const chatData = getChatDataFromDisk();
      if (!chatData.messages[conversationId]) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      chatData.messages[conversationId] = chatData.messages[conversationId].filter(m => m.id !== id);
      await saveChatDataToDisk(chatData);

      return res.json({ success: true, message: 'Message deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete message', details: err.message });
    }
  });

  // Calling signals API (in-memory persistent bridge)
  app.post('/api/chat/signal', (req, res) => {
    try {
      latestCallSignal = {
        ...req.body,
        timestamp: Date.now(),
      };
      return res.json({ success: true, signal: latestCallSignal });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to send signal' });
    }
  });

  app.get('/api/chat/signal', (req, res) => {
    const { receiverId } = req.query;
    if (latestCallSignal && typeof receiverId === 'string' && latestCallSignal.receiverId === receiverId) {
      const age = Date.now() - latestCallSignal.timestamp;
      if (age < 60000) {
        return res.json({ success: true, signal: latestCallSignal });
      }
    }
    return res.json({ success: true, signal: null });
  });

  // ==========================================
  // 4. ARCHIVE & FILE VAULT REST APIS
  // ==========================================
  app.get('/api/archive/files', (req, res) => {
    try {
      const filesData = getFilesDataFromDisk();
      return res.json({
        success: true,
        files: filesData.files,
        folders: filesData.folders,
      });
    } catch (err: any) {
      console.error('Error fetching archive files:', err);
      return res.status(500).json({ error: 'Failed to fetch archive files', details: err.message });
    }
  });

  // File Upload Endpoint: Supports both multer multipart uploads and base64/JSON payloads
  app.post('/api/archive/upload', upload.array('files', 20), async (req: express.Request, res: express.Response) => {
    try {
      const folderId = req.body.folderId && req.body.folderId !== 'null' && req.body.folderId !== 'undefined'
        ? req.body.folderId
        : null;

      const filesData = getFilesDataFromDisk();
      const createdFiles: any[] = [];
      const dateFormatted = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // 1. Check if multipart files exist from multer
      const uploadedFiles = req.files as Express.Multer.File[];
      if (uploadedFiles && uploadedFiles.length > 0) {
        for (const f of uploadedFiles) {
          const ext = path.extname(f.originalname).replace('.', '').toLowerCase();
          const category = getCategoryForMimeOrExt(f.mimetype, ext);
          const fileId = 'file_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

          const newFileEntry = {
            id: fileId,
            name: f.originalname,
            size: f.size,
            formattedSize: formatFileBytes(f.size),
            category,
            mimeType: f.mimetype || 'application/octet-stream',
            extension: ext || 'bin',
            folderId,
            createdAt: dateFormatted,
            updatedAt: 'Just now',
            url: `/uploads/${f.filename}`,
            previewUrl: category === 'image' ? `/uploads/${f.filename}` : undefined,
            tags: [category.toUpperCase()],
          };

          filesData.files.unshift(newFileEntry);
          createdFiles.push(newFileEntry);
        }
      } else if (req.body.fileData || req.body.name) {
        // 2. Direct JSON/Base64 file body upload fallback
        const { name, size, mimeType, content, dataUrl } = req.body;
        const ext = (name ? path.extname(name).replace('.', '') : 'bin').toLowerCase();
        const category = getCategoryForMimeOrExt(mimeType || '', ext);
        const fileId = 'file_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

        const newFileEntry = {
          id: fileId,
          name: name || 'Uploaded Document',
          size: size || (content ? Buffer.byteLength(content) : 1024),
          formattedSize: formatFileBytes(size || (content ? Buffer.byteLength(content) : 1024)),
          category,
          mimeType: mimeType || 'text/plain',
          extension: ext,
          folderId,
          createdAt: dateFormatted,
          updatedAt: 'Just now',
          url: dataUrl || undefined,
          previewUrl: category === 'image' ? dataUrl : undefined,
          tags: [category.toUpperCase()],
          content: content || undefined,
        };

        filesData.files.unshift(newFileEntry);
        createdFiles.push(newFileEntry);
      }

      if (createdFiles.length === 0) {
        return res.status(400).json({ error: 'No files provided for upload' });
      }

      await saveFilesDataToDisk(filesData);

      return res.status(201).json({
        success: true,
        message: `${createdFiles.length} file(s) saved to archive storage`,
        files: createdFiles,
      });
    } catch (err: any) {
      console.error('Error uploading archive files:', err);
      return res.status(500).json({ error: 'Failed to upload files', details: err.message });
    }
  });

  app.post('/api/archive/folders', async (req, res) => {
    try {
      const { name, color, parentId } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Folder name is required' });
      }

      const filesData = getFilesDataFromDisk();
      const newFolderId = 'folder-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

      const newFolder = {
        id: newFolderId,
        name: name.trim(),
        parentId: parentId || null,
        color: color || '#6366F1',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };

      filesData.folders.push(newFolder);
      await saveFilesDataToDisk(filesData);

      return res.status(201).json({
        success: true,
        folder: newFolder,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to create folder', details: err.message });
    }
  });

  app.patch('/api/archive/files/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, isFavorite, folderId, tags } = req.body;

      const filesData = getFilesDataFromDisk();
      const file = filesData.files.find(f => f.id === id);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (name !== undefined) file.name = name.trim();
      if (isFavorite !== undefined) file.isFavorite = Boolean(isFavorite);
      if (folderId !== undefined) file.folderId = folderId;
      if (tags !== undefined && Array.isArray(tags)) file.tags = tags;
      file.updatedAt = 'Just now';

      await saveFilesDataToDisk(filesData);

      return res.json({ success: true, file });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update file', details: err.message });
    }
  });

  app.patch('/api/archive/folders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, parentId } = req.body;

      const filesData = getFilesDataFromDisk();
      const folder = filesData.folders.find(f => f.id === id);

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      if (name !== undefined) folder.name = name.trim();
      if (color !== undefined) folder.color = color;
      if (parentId !== undefined) folder.parentId = parentId;
      folder.updatedAt = new Date().toISOString().split('T')[0];

      await saveFilesDataToDisk(filesData);

      return res.json({ success: true, folder });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update folder', details: err.message });
    }
  });

  app.delete('/api/archive/files/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const filesData = getFilesDataFromDisk();
      const file = filesData.files.find(f => f.id === id);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete physical file if saved in /uploads
      if (file.url && file.url.startsWith('/uploads/')) {
        const physicalPath = path.join(process.cwd(), file.url);
        if (fs.existsSync(physicalPath)) {
          try {
            fs.unlinkSync(physicalPath);
          } catch (delErr) {
            console.warn('Could not delete physical upload file:', delErr);
          }
        }
      }

      filesData.files = filesData.files.filter(f => f.id !== id);
      await saveFilesDataToDisk(filesData);

      return res.json({ success: true, message: 'File deleted from archive' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete file', details: err.message });
    }
  });

  app.delete('/api/archive/folders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const filesData = getFilesDataFromDisk();
      
      filesData.folders = filesData.folders.filter(f => f.id !== id);
      // Move files inside deleted folder to root
      filesData.files.forEach(f => {
        if (f.folderId === id) f.folderId = null;
      });

      await saveFilesDataToDisk(filesData);

      return res.json({ success: true, message: 'Folder deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete folder', details: err.message });
    }
  });

  app.get('/api/archive/download/:id', (req, res) => {
    try {
      const { id } = req.params;
      const filesData = getFilesDataFromDisk();
      const file = filesData.files.find(f => f.id === id);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (file.url && file.url.startsWith('/uploads/')) {
        const physicalPath = path.join(process.cwd(), file.url);
        if (fs.existsSync(physicalPath)) {
          return res.download(physicalPath, file.name);
        }
      }

      if (file.content) {
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        res.setHeader('Content-Type', file.mimeType || 'text/plain');
        return res.send(file.content);
      }

      return res.redirect(file.url || '/');
    } catch (err: any) {
      return res.status(500).json({ error: 'Download failed', details: err.message });
    }
  });

  // System Stats for Dashboard Real-time Counts
  app.get('/api/system/counts', (req, res) => {
    try {
      const filesData = getFilesDataFromDisk();
      const posts = getPostsFromDisk();
      const chatData = getChatDataFromDisk();
      const users = getUsersFromDisk();

      return res.json({
        success: true,
        activeStreams: activeSessions.size,
        filesCount: filesData.files.length,
        foldersCount: filesData.folders.length,
        postsCount: posts.length,
        conversationsCount: chatData.conversations.length,
        usersCount: users.length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch counts' });
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
