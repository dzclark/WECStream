# How to View Streams

There are multiple ways for viewers to watch your RTMP streams.

## Option 1: Direct HLS URL (Any HLS Player)

Once a stream is live, viewers can watch using the HLS URL:

```
http://136.112.153.78:8000/live/STREAM_KEY/index.m3u8
```

Replace `STREAM_KEY` with the actual stream key being used.

### Example URLs:
- **Secure stream:** `http://136.112.153.78:8000/live/ed1533c0f280f8800139f8afec3451df/index.m3u8`
- **Test stream:** `http://136.112.153.78:8000/live/test-stream/index.m3u8`
- **Live broadcast:** `http://136.112.153.78:8000/live/live-broadcast/index.m3u8`

### Players that support HLS:

**Desktop:**
- **VLC Media Player** (Free)
  1. Download from https://www.videolan.org/
  2. Open VLC → Media → Open Network Stream
  3. Paste the HLS URL
  4. Click Play

- **Safari Browser** (Mac)
  - Just paste the URL directly in Safari
  - Native HLS support

**Mobile:**
- **Safari (iOS)** - Native support, paste URL in browser
- **Chrome (Android)** - Paste URL in browser
- **VLC for Mobile** - Available on iOS and Android

**Web Browsers:**
- Safari (Mac/iOS) - Native HLS support
- Other browsers need a player (see Option 2)

## Option 2: Web Player (React Frontend)

Deploy the React frontend (in `/Users/david/RMTP/client/`) to provide a beautiful web interface:

### Features:
- Browse all live streams
- View recordings
- Share stream links
- Real-time viewer count
- Professional video player

### To deploy the frontend:
```bash
cd /Users/david/RMTP/client
npm install
npm start
```

Then viewers can visit: `http://localhost:3000`

## Option 3: Embed in Website

You can embed streams in any website using Video.js or HLS.js:

### Using Video.js:
```html
<!DOCTYPE html>
<html>
<head>
  <link href="https://vjs.zencdn.net/8.6.1/video-js.css" rel="stylesheet" />
</head>
<body>
  <video id="my-video" class="video-js" controls preload="auto" width="640" height="360">
    <source src="http://136.112.153.78:8000/live/test-stream/index.m3u8" type="application/x-mpegURL">
  </video>
  
  <script src="https://vjs.zencdn.net/8.6.1/video.min.js"></script>
  <script>
    var player = videojs('my-video');
  </script>
</body>
</html>
```

### Using HLS.js:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Live Stream</title>
</head>
<body>
  <video id="video" controls width="640" height="360"></video>
  
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <script>
    var video = document.getElementById('video');
    var videoSrc = 'http://136.112.153.78:8000/live/test-stream/index.m3u8';
    
    if (Hls.isSupported()) {
      var hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
    }
  </script>
</body>
</html>
```

## Option 4: Check Available Streams via API

Viewers (or your app) can query which streams are currently live:

```bash
curl http://136.112.153.78:8000/api/streams/live
```

Response:
```json
{
  "success": true,
  "streams": [
    {
      "streamId": "abc-123",
      "streamKey": "test-stream",
      "status": "live",
      "startTime": "2026-02-04T11:30:00.000Z",
      "viewCount": 5
    }
  ]
}
```

## Important Notes

### Latency
- **Expected delay:** 5-15 seconds (normal for HLS)
- **Why:** HLS breaks video into segments for compatibility
- **Lower latency options:** WebRTC or RTMP (requires different setup)

### Stream Availability
- Streams only appear when someone is actively broadcasting
- The HLS URL only works while the stream is live
- Recordings are saved and can be viewed later via the API

### CORS (Cross-Origin)
- The server has CORS enabled (`Access-Control-Allow-Origin: *`)
- Streams can be embedded on any website

### Mobile Viewing
- iOS Safari: Works natively, no player needed
- Android Chrome: Works natively in most cases
- For best compatibility: Use the React frontend

## Quick Test

To test if a stream is working:

1. **Start streaming** in OBS with key: `test-stream`
2. **Wait 5-10 seconds** for HLS segments to generate
3. **Open in VLC:** `http://136.112.153.78:8000/live/test-stream/index.m3u8`
4. **Or open in Safari:** Same URL

## Sharing Streams

The easiest way to share:
1. Give viewers the HLS URL
2. Tell them to open it in VLC or Safari
3. Or deploy the React frontend for a better experience

## Next Steps

For the best viewer experience, deploy the React frontend to Firebase Hosting:
- Professional UI
- Stream discovery
- Recording playback
- Share buttons
- Responsive design

See `/Users/david/RMTP/deployment/GOOGLE_CLOUD_DEPLOYMENT.md` for frontend deployment instructions.
