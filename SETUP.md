# Quick Setup Guide

## Step-by-Step Installation

### 1. Install FFmpeg

FFmpeg is required for video transcoding.

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
- Download from https://ffmpeg.org/download.html
- Add to system PATH

Verify installation:
```bash
ffmpeg -version
```

### 2. Install Node.js Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 3. Configure Environment

```bash
cp .env.example .env
```

The default configuration works for local development. No changes needed unless you want Firebase integration.

### 4. Start the Application

**Option A: Two Terminals (Recommended for Development)**

Terminal 1 - Backend:
```bash
npm start
```

Terminal 2 - Frontend:
```bash
npm run client
```

**Option B: Production Build**

```bash
cd client
npm run build
cd ..
npm start
```

### 5. Access the Application

Open your browser to: **http://localhost:3000**

### 6. Start Streaming

#### Using OBS Studio:

1. Download OBS Studio from https://obsproject.com/
2. Open OBS Studio
3. Go to **Settings** → **Stream**
4. Set:
   - Service: **Custom**
   - Server: **rtmp://localhost:1935/live**
   - Stream Key: **test** (or any name you want)
5. Click **OK** and then **Start Streaming**

Your stream will appear on the web interface within seconds!

## Firebase Setup (Optional)

Only needed if you want cloud storage for recordings.

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Follow the setup wizard

### 2. Enable Services

1. In Firebase Console, enable **Firestore Database**
2. Enable **Cloud Storage**

### 3. Generate Service Account Key

1. Go to **Project Settings** (gear icon)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the JSON file as `firebase-service-account.json` in the project root

### 4. Update .env File

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_PATH=./firebase-service-account.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### 5. Restart the Server

```bash
npm start
```

## Verification Checklist

- [ ] FFmpeg installed and accessible
- [ ] Node.js dependencies installed
- [ ] Backend server running on port 8000
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000
- [ ] OBS Studio configured with RTMP URL
- [ ] Test stream appears on web interface

## Common Issues

### "FFmpeg not found"

Update the FFmpeg path in `server/index.js`:

```javascript
trans: {
  ffmpeg: '/usr/local/bin/ffmpeg',  // Change this to your FFmpeg path
}
```

Find your path:
```bash
which ffmpeg
```

### "Port already in use"

Change ports in `.env`:
```env
PORT=8001
HTTP_PORT=8001
RTMP_PORT=1936
```

### Stream not showing up

1. Check server terminal for errors
2. Verify RTMP URL in OBS: `rtmp://localhost:1935/live`
3. Make sure stream key is set
4. Check firewall isn't blocking port 1935

## Next Steps

1. Try streaming with OBS Studio
2. View your live stream in the browser
3. Stop the stream and check the Recordings page
4. Share a stream using the share button
5. Explore the API endpoints

## Need Help?

Check the full README.md for detailed documentation and troubleshooting.
