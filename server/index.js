require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');
const streamManager = require('./streamManager');
const firebaseService = require('./firebaseService');
const streamKeys = require('./streamKeys');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

const mediaRoot = path.join(__dirname, '../media');
if (!fs.existsSync(mediaRoot)) {
  fs.mkdirSync(mediaRoot, { recursive: true });
}

// Nginx-RTMP authentication endpoint
app.post('/api/rtmp/auth', async (req, res) => {
  const streamKey = req.body.name;
  console.log(`[Nginx-RTMP Auth] Stream key: ${streamKey}`);
  
  if (!streamKeys.isValidStreamKey(streamKey)) {
    console.log(`[Auth] Rejected stream with invalid key: ${streamKey}`);
    return res.status(403).send('Forbidden');
  }
  
  console.log(`[Auth] Accepted stream with valid key: ${streamKey}`);
  
  // Start stream tracking and immediately notify clients
  await streamManager.startStream(streamKey, io, true);
  
  console.log(`Stream ${streamKey} started, clients notified`);
  
  res.status(200).send('OK');
});

// Nginx-RTMP stream done endpoint
app.post('/api/rtmp/done', async (req, res) => {
  const streamKey = req.body.name;
  console.log(`[Nginx-RTMP Done] Stream ${streamKey} ended`);
  
  // Wait to verify stream truly ended (balanced timeout)
  setTimeout(async () => {
    const m3u8Path = path.join(mediaRoot, 'live', streamKey, 'index.m3u8');
    
    if (fs.existsSync(m3u8Path)) {
      const stats = fs.statSync(m3u8Path);
      const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
      
      if (ageSeconds < 8) {
        console.log(`Stream ${streamKey} - still active, ignoring done event`);
        return res.status(200).send('OK');
      }
    }
    
    console.log(`Stream ${streamKey} confirmed ended`);
    await streamManager.endStream(streamKey, io);
    res.status(200).send('OK');
  }, 10000);
});

app.get('/api/streams/live', async (req, res) => {
  try {
    const liveStreams = await streamManager.getLiveStreams();
    res.json({ success: true, streams: liveStreams });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/streams/recorded', async (req, res) => {
  try {
    // Try Firebase first
    let recordings = [];
    if (firebaseService.isInitialized()) {
      recordings = await firebaseService.getRecordings();
    }
    
    // If no Firebase recordings, use in-memory completed streams
    if (recordings.length === 0) {
      recordings = streamManager.getCompletedStreams();
    }
    
    res.json({ success: true, recordings });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/streams/:streamId', async (req, res) => {
  try {
    const streamData = await firebaseService.getStreamData(req.params.streamId);
    res.json({ success: true, stream: streamData });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/streams/:streamId/share', async (req, res) => {
  try {
    const { streamId } = req.params;
    const shareUrl = await streamManager.generateShareUrl(streamId);
    res.json({ success: true, shareUrl });
  } catch (error) {
    console.error('Error generating share URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/recordings/recent', async (req, res) => {
  try {
    const recordingsPath = '/opt/rtmp-server/recordings';
    
    if (!fs.existsSync(recordingsPath)) {
      return res.json({ success: true, recordings: [] });
    }
    
    const files = fs.readdirSync(recordingsPath);
    const recordings = files
      .filter(file => file.endsWith('.mp4'))
      .map(file => {
        const filePath = path.join(recordingsPath, file);
        const stats = fs.statSync(filePath);
        
        // Parse filename: test-stream-20260205-103045.mp4
        const match = file.match(/(.+)-(\d{8})-(\d{6})\.mp4$/);
        let streamKey = 'unknown';
        let date = new Date(stats.mtime);
        
        if (match) {
          streamKey = match[1];
          const dateStr = match[2]; // YYYYMMDD
          const timeStr = match[3]; // HHMMSS
          date = new Date(
            dateStr.substring(0, 4) + '-' + 
            dateStr.substring(4, 6) + '-' + 
            dateStr.substring(6, 8) + 'T' +
            timeStr.substring(0, 2) + ':' + 
            timeStr.substring(2, 4) + ':' + 
            timeStr.substring(4, 6) + 'Z'
          );
        }
        
        return {
          filename: file,
          streamKey,
          date: date.toISOString(),
          size: stats.size,
          duration: null, // Would need ffprobe to get actual duration
          url: `http://136.112.153.78:8888/recordings/${file}`
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first
    
    res.json({ success: true, recordings });
  } catch (error) {
    console.error('Error fetching recent recordings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/recordings/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: only allow deleting .mp4 files, prevent path traversal
    if (!filename.endsWith('.mp4') || filename.includes('/') || filename.includes('..')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const filePath = path.join('/opt/rtmp-server/recordings', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }
    
    fs.unlinkSync(filePath);
    console.log(`Deleted recording: ${filename}`);
    
    res.json({ success: true, message: 'Recording deleted' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/keys/create', (req, res) => {
  try {
    const { username, description } = req.body;
    const key = streamKeys.createStreamKey(username || 'user');
    if (description) {
      streamKeys.addStreamKey(key, { username, description });
    }
    res.json({ success: true, streamKey: key });
  } catch (error) {
    console.error('Error creating stream key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/keys', (req, res) => {
  try {
    const keys = streamKeys.getAllStreamKeys();
    res.json({ success: true, keys });
  } catch (error) {
    console.error('Error fetching stream keys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/keys/:key', (req, res) => {
  try {
    const { key } = req.params;
    const revoked = streamKeys.revokeStreamKey(key);
    res.json({ success: revoked });
  } catch (error) {
    console.error('Error revoking stream key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Track which stream this socket is watching
  let watchingStreamKey = null;
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove viewer from any stream they were watching
    if (watchingStreamKey) {
      streamManager.removeViewer(watchingStreamKey, socket.id, io);
    }
  });
  
  socket.on('subscribe', (streamKey) => {
    socket.join(`stream_${streamKey}`);
    console.log(`Client ${socket.id} subscribed to stream ${streamKey}`);
  });
  
  socket.on('unsubscribe', (streamKey) => {
    socket.leave(`stream_${streamKey}`);
    console.log(`Client ${socket.id} unsubscribed from stream ${streamKey}`);
  });
  
  socket.on('start_watching', (streamKey) => {
    // Remove from previous stream if watching another
    if (watchingStreamKey && watchingStreamKey !== streamKey) {
      streamManager.removeViewer(watchingStreamKey, socket.id, io);
    }
    
    // Add to new stream
    watchingStreamKey = streamKey;
    streamManager.addViewer(streamKey, socket.id, io);
  });
  
  socket.on('stop_watching', (streamKey) => {
    if (watchingStreamKey === streamKey) {
      streamManager.removeViewer(streamKey, socket.id, io);
      watchingStreamKey = null;
    }
  });
});

const PORT = process.env.PORT || 8000;

const secureKey = streamKeys.initializeDefaultKeys();

server.listen(PORT, async () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`\nYour secure stream key: ${secureKey}`);
  console.log(`Stream URL: rtmp://136.112.153.78:1935/live/${secureKey}`);
  console.log(`\nNginx-RTMP Server is handling RTMP on port 1935`);
  console.log(`Stream authentication: ENABLED`);
  
  // Scan for existing recordings on startup
  console.log('\nScanning for existing recordings...');
  await streamManager.scanExistingRecordings();
});
