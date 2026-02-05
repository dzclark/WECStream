# Church Livestreaming Platform

A complete church livestreaming solution with RTMP ingestion, HLS playback, automatic MP4 recording, and a modern web interface. Built for Welwyn Evangelical Church.

## Features

- **RTMP Server**: Docker nginx-rtmp container accepting streams from OBS Studio
- **Live Streaming**: Real-time HLS streaming with hls.js player
- **Automatic MP4 Recording**: All streams automatically recorded and saved
- **Recent Recordings**: Browse and playback recent livestream recordings with delete functionality
- **Auto Stream-End Detection**: Page automatically reloads when stream ends
- **Real-time Viewer Count**: Live viewer tracking displayed on video and landing page
- **Responsive Video Player**: 16:9 aspect ratio, scales with browser window
- **Stop Watching Button**: Manual control to stop playback and return to landing page
- **Sermon Archive Integration**: Embedded sermon.net iframe for historical recordings
- **Modern UI**: Clean, professional interface with church branding

## Architecture

### RTMP Server (Docker)
- **nginx-rtmp**: Docker container (`tiangolo/nginx-rtmp`) for RTMP ingestion
- **HLS Conversion**: Automatic conversion to HLS format for web playback
- **MP4 Recording**: Streams recorded with timestamp filenames
- **Systemd Service**: Auto-restart on boot and failure

### Backend (Node.js + Express)
- **Express API**: RESTful endpoints for recordings and stream management
- **Socket.IO**: Real-time viewer count and stream status updates
- **Stream Manager**: Tracks active streams and viewer counts
- **Recording API**: List and delete recent MP4 recordings

### Frontend (Vanilla JS + hls.js)
- **hls.js**: HLS video playback with error handling
- **Socket.IO Client**: Real-time updates for viewer count
- **Responsive Design**: CSS Grid and Flexbox for modern layout
- **Three Tabs**: Livestreams, Recent Recordings, Previous Recordings (sermon.net)

## Prerequisites

- Google Cloud account (for VM hosting)
- Node.js (v16 or higher)
- Docker (for nginx-rtmp container)
- OBS Studio or any RTMP streaming software
- Domain name (optional, for custom URL)

## Deployment (Google Cloud VM)

### 1. Create VM Instance

```bash
gcloud compute instances create rtmp-streaming-server \
  --machine-type=e2-micro \
  --zone=us-central1-a \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=10GB \
  --tags=rtmp-server,http-server
```

### 2. Configure Firewall Rules

```bash
# Allow RTMP (port 1935)
gcloud compute firewall-rules create allow-rtmp \
  --allow=tcp:1935 \
  --target-tags=rtmp-server

# Allow HTTP (port 8000 for API, 8888 for media)
gcloud compute firewall-rules create allow-streaming-http \
  --allow=tcp:8000,tcp:8888 \
  --target-tags=http-server
```

### 2. Clone and Install Dependencies

```bash
cd /Users/david/RMTP

# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=8000
RTMP_PORT=1935
HTTP_PORT=8000

# Optional: Firebase configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_PATH=./firebase-service-account.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

NODE_ENV=development
```

### 4. Firebase Setup (Optional)

If you want cloud storage for recordings:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database and Cloud Storage
3. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `firebase-service-account.json` in the project root
4. Update `.env` with your Firebase configuration

**Note**: The application works without Firebase - recordings will be stored locally.

## Running the Application

### Development Mode

**Terminal 1 - Start the backend server:**
```bash
npm start
```

**Terminal 2 - Start the React frontend:**
```bash
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- RTMP Server: rtmp://localhost:1935

### Production Mode

```bash
# Build the React app
cd client
npm run build
cd ..

# Start the server
npm start
```

## How to Stream

### Using OBS Studio

1. Open OBS Studio
2. Go to Settings → Stream
3. Configure:
   - **Service**: Custom
   - **Server**: `rtmp://localhost:1935/live`
   - **Stream Key**: Any unique identifier (e.g., `mystream123`)
4. Click "Start Streaming"
5. Your stream will appear on the web interface automatically

### Using FFmpeg (for testing)

```bash
ffmpeg -re -i input.mp4 -c:v libx264 -c:a aac -f flv rtmp://localhost:1935/live/test
```

## API Endpoints

### Get Live Streams
```
GET /api/streams/live
```

### Get Recorded Streams
```
GET /api/streams/recorded
```

### Get Stream Details
```
GET /api/streams/:streamId
```

### Generate Share URL
```
POST /api/streams/:streamId/share
```

### Health Check
```
GET /api/health
```

## WebSocket Events

### Server → Client

- `stream_started`: Emitted when a new stream begins
- `stream_ended`: Emitted when a stream ends

### Client → Server

- `subscribe`: Subscribe to updates for a specific stream
- `unsubscribe`: Unsubscribe from stream updates

## Project Structure

```
RMTP/
├── server/
│   ├── index.js              # Main server file
│   ├── firebaseService.js    # Firebase integration
│   └── streamManager.js      # Stream lifecycle management
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── LiveStreams.js    # Live streams page
│   │   │   ├── Recordings.js     # Recordings page
│   │   │   └── StreamPlayer.js   # Video player component
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── media/                    # Local stream storage
├── package.json
├── .env                      # Environment configuration
└── README.md
```

## Features in Detail

### Live Streaming
- Streams are converted to HLS format for web playback
- Real-time viewer count
- Automatic stream detection and listing
- Low-latency streaming

### Recording Management
- Automatic recording when stream ends
- Upload to Firebase Cloud Storage (if configured)
- Local storage fallback
- Metadata tracking (duration, start time, views)

### Sharing
- Generate unique URLs for each stream
- Share live streams or recordings
- Copy-to-clipboard functionality
- Direct link access

## Troubleshooting

### FFmpeg Not Found
If you get an FFmpeg error, update the path in `server/index.js`:
```javascript
trans: {
  ffmpeg: '/path/to/your/ffmpeg',  // Update this path
  ...
}
```

Find your FFmpeg path:
```bash
which ffmpeg
```

### Port Already in Use
Change the ports in `.env`:
```env
PORT=8001
RTMP_PORT=1936
HTTP_PORT=8001
```

### Firebase Connection Issues
- Verify your service account JSON file is correct
- Check Firebase project permissions
- Ensure Firestore and Storage are enabled

### Stream Not Appearing
- Check that RTMP port 1935 is not blocked by firewall
- Verify the stream key matches
- Check server logs for errors

## Performance Optimization

### For Production

1. **Enable HTTPS**: Use a reverse proxy like Nginx
2. **CDN Integration**: Serve recordings from a CDN
3. **Database Indexing**: Add indexes to Firestore queries
4. **Caching**: Implement Redis for stream metadata
5. **Load Balancing**: Use multiple server instances

### Recommended Server Specs

- **Minimum**: 2 CPU cores, 4GB RAM
- **Recommended**: 4 CPU cores, 8GB RAM, SSD storage
- **Network**: 100 Mbps upload for HD streaming

## Security Considerations

- Implement stream key authentication
- Add rate limiting to API endpoints
- Use HTTPS in production
- Secure Firebase rules
- Validate stream inputs
- Implement user authentication

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Stream key management
- [ ] Chat functionality
- [ ] Stream analytics and statistics
- [ ] Multi-bitrate streaming
- [ ] DVR functionality
- [ ] Mobile app support
- [ ] Stream scheduling
- [ ] Monetization features

## License

ISC

## Support

For issues and questions, please check:
- Server logs in the terminal
- Browser console for frontend errors
- Firebase console for cloud storage issues

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.
