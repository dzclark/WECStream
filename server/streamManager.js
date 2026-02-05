const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const firebaseService = require('./firebaseService');

const activeStreams = new Map();
const completedStreams = [];
const streamViewers = new Map(); // Map of streamKey -> Set of socket IDs

async function startStream(streamKey, io, notifyClients = true) {
  const streamId = uuidv4();
  const startTime = new Date();
  
  const streamData = {
    streamId,
    streamKey,
    status: 'live',
    startTime: startTime.toISOString(),
    viewCount: 0,
    title: `Stream ${streamKey}`,
    description: 'Live stream'
  };
  
  activeStreams.set(streamKey, streamData);
  
  try {
    const firestoreId = await firebaseService.saveStreamMetadata(streamData);
    if (firestoreId) {
      streamData.firestoreId = firestoreId;
      activeStreams.set(streamKey, streamData);
    }
  } catch (error) {
    console.error('Error saving stream metadata:', error);
  }
  
  if (io && notifyClients) {
    io.emit('stream_started', {
      streamKey,
      streamId,
      startTime: startTime.toISOString()
    });
  }
  
  console.log(`Stream started: ${streamKey} (ID: ${streamId})${notifyClients ? '' : ' - waiting for buffer'}`);
  return streamData;
}

async function endStream(streamKey, io) {
  const streamData = activeStreams.get(streamKey);
  
  if (!streamData) {
    console.warn(`Stream ${streamKey} not found in active streams`);
    return;
  }
  
  const endTime = new Date();
  const duration = Math.floor((endTime - new Date(streamData.startTime)) / 1000);
  
  streamData.status = 'processing';
  streamData.endTime = endTime.toISOString();
  streamData.duration = duration;
  
  if (io) {
    io.emit('stream_ended', {
      streamKey,
      streamId: streamData.streamId,
      endTime: endTime.toISOString(),
      duration
    });
  }
  
  try {
    if (streamData.firestoreId) {
      await firebaseService.updateStreamStatus(streamData.firestoreId, 'processing', {
        endTime: endTime.toISOString(),
        duration
      });
    }
    
    await processRecording(streamKey, streamData);
    
    if (streamData.firestoreId) {
      await firebaseService.updateStreamStatus(streamData.firestoreId, 'completed', {
        recordingUrl: streamData.recordingUrl || null
      });
    }
  } catch (error) {
    console.error('Error processing stream end:', error);
  }
  
  // Add to completed streams for recordings API
  completedStreams.unshift(streamData);
  if (completedStreams.length > 50) {
    completedStreams.pop(); // Keep only last 50 recordings
  }
  
  activeStreams.delete(streamKey);
  console.log(`Stream ended: ${streamKey} (Duration: ${duration}s)`);
}

async function processRecording(streamKey, streamData) {
  const mediaRoot = path.join(__dirname, '../media/live', streamKey);
  
  if (!fs.existsSync(mediaRoot)) {
    console.warn(`No recording found for stream ${streamKey}`);
    return;
  }
  
  const files = fs.readdirSync(mediaRoot);
  const mp4Files = files.filter(f => f.endsWith('.mp4'));
  
  if (mp4Files.length === 0) {
    console.warn(`No MP4 files found for stream ${streamKey}`);
    console.log(`Available files: ${files.join(', ')}`);
    
    // Use HLS playlist as fallback
    const m3u8Files = files.filter(f => f.endsWith('.m3u8'));
    if (m3u8Files.length > 0) {
      streamData.recordingUrl = `http://136.112.153.78:8888/live/${streamKey}/${m3u8Files[0]}`;
      streamData.recordingType = 'hls';
      console.log(`HLS recording available for stream ${streamKey}`);
      return;
    }
    return;
  }
  
  const recordingPath = path.join(mediaRoot, mp4Files[0]);
  streamData.recordingType = 'mp4';
  
  try {
    if (firebaseService.isInitialized()) {
      const publicUrl = await firebaseService.uploadRecording(recordingPath, streamData.streamId);
      streamData.recordingUrl = publicUrl;
      console.log(`Recording uploaded for stream ${streamKey}`);
    } else {
      streamData.recordingUrl = `http://136.112.153.78:8888/live/${streamKey}/${mp4Files[0]}`;
      console.log(`Recording available locally for stream ${streamKey}: ${streamData.recordingUrl}`);
    }
  } catch (error) {
    console.error('Error processing recording:', error);
  }
}

function getLiveStreams() {
  return Array.from(activeStreams.values());
}

function getStreamByKey(streamKey) {
  return activeStreams.get(streamKey);
}

async function generateShareUrl(streamId) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/watch/${streamId}`;
}

function getCompletedStreams() {
  return completedStreams;
}

function addViewer(streamKey, socketId, io) {
  if (!streamViewers.has(streamKey)) {
    streamViewers.set(streamKey, new Set());
  }
  
  streamViewers.get(streamKey).add(socketId);
  const viewCount = streamViewers.get(streamKey).size;
  
  // Update stream data
  const streamData = activeStreams.get(streamKey);
  if (streamData) {
    streamData.viewCount = viewCount;
    activeStreams.set(streamKey, streamData);
  }
  
  // Emit viewer count update
  if (io) {
    io.emit('viewer_count_update', {
      streamKey,
      viewCount
    });
  }
  
  console.log(`Viewer ${socketId} joined stream ${streamKey}. Total viewers: ${viewCount}`);
  return viewCount;
}

function removeViewer(streamKey, socketId, io) {
  if (!streamViewers.has(streamKey)) {
    return 0;
  }
  
  streamViewers.get(streamKey).delete(socketId);
  const viewCount = streamViewers.get(streamKey).size;
  
  // Update stream data
  const streamData = activeStreams.get(streamKey);
  if (streamData) {
    streamData.viewCount = viewCount;
    activeStreams.set(streamKey, streamData);
  }
  
  // Clean up empty viewer sets
  if (viewCount === 0) {
    streamViewers.delete(streamKey);
  }
  
  // Emit viewer count update
  if (io) {
    io.emit('viewer_count_update', {
      streamKey,
      viewCount
    });
  }
  
  console.log(`Viewer ${socketId} left stream ${streamKey}. Total viewers: ${viewCount}`);
  return viewCount;
}

function getViewerCount(streamKey) {
  if (!streamViewers.has(streamKey)) {
    return 0;
  }
  return streamViewers.get(streamKey).size;
}

async function scanExistingRecordings() {
  const mediaRoot = path.join(__dirname, '../media/live');
  
  if (!fs.existsSync(mediaRoot)) {
    console.log('No media directory found');
    return;
  }
  
  const streamDirs = fs.readdirSync(mediaRoot);
  console.log(`Scanning ${streamDirs.length} stream directories for recordings...`);
  
  for (const streamKey of streamDirs) {
    const streamPath = path.join(mediaRoot, streamKey);
    const stat = fs.statSync(streamPath);
    
    if (!stat.isDirectory()) continue;
    
    const files = fs.readdirSync(streamPath);
    const mp4Files = files.filter(f => f.endsWith('.mp4')).sort();
    
    for (const mp4File of mp4Files) {
      const filePath = path.join(streamPath, mp4File);
      const fileStat = fs.statSync(filePath);
      
      // Extract timestamp from filename (format: YYYY-MM-DD-HH-MM-SS.mp4)
      const match = mp4File.match(/(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})\.mp4/);
      const startTime = match ? new Date(match[1].replace(/-/g, '-').replace(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/, '$1-$2-$3T$4:$5:$6Z')) : new Date(fileStat.mtime);
      
      // Check if this recording is already in completedStreams
      const exists = completedStreams.some(s => 
        s.streamKey === streamKey && s.recordingUrl && s.recordingUrl.includes(mp4File)
      );
      
      if (!exists) {
        const streamData = {
          streamId: uuidv4(),
          streamKey,
          status: 'completed',
          startTime: startTime.toISOString(),
          endTime: new Date(fileStat.mtime).toISOString(),
          duration: Math.floor(fileStat.size / 1000000), // Rough estimate based on file size
          title: `Stream ${streamKey}`,
          recordingUrl: `http://136.112.153.78:8888/live/${streamKey}/${mp4File}`,
          recordingType: 'mp4',
          viewCount: 0
        };
        
        completedStreams.push(streamData);
        console.log(`Found recording: ${streamKey}/${mp4File}`);
      }
    }
  }
  
  console.log(`Total recordings found: ${completedStreams.length}`);
}

module.exports = {
  startStream,
  endStream,
  getLiveStreams,
  getStreamByKey,
  generateShareUrl,
  getCompletedStreams,
  scanExistingRecordings,
  addViewer,
  removeViewer,
  getViewerCount
};
