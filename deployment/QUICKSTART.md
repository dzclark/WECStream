# Quick Start - Deploy with Static IP

Your RTMP server will be deployed with a **permanent static IP address** that never changes.

## Prerequisites

1. Google Cloud account (free tier)
2. Google Cloud SDK installed

## Installation (5 minutes)

### 1. Install Google Cloud SDK

**macOS:**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Initialize gcloud

```bash
gcloud init
```

Follow prompts to:
- Login to Google account
- Create or select a project
- Choose US region (for free tier)

### 3. Get Your Project ID

```bash
gcloud projects list
```

Copy your PROJECT_ID.

### 4. Configure Deployment

```bash
cd /Users/david/RMTP/deployment

# Edit gcloud-setup.sh
# Change line 12: PROJECT_ID="your-project-id"

# Edit deploy.sh  
# Change line 9: PROJECT_ID="your-project-id"
```

### 5. Deploy Everything

```bash
# Make scripts executable
chmod +x gcloud-setup.sh deploy.sh

# Create VM with static IP (takes 2-3 minutes)
./gcloud-setup.sh

# Deploy your code (takes 1-2 minutes)
./deploy.sh
```

## What You Get

After deployment completes, you'll receive:

```
Static IP Address: 34.123.45.67 (PERMANENT)

RTMP URL: rtmp://34.123.45.67:1935/live
API URL: http://34.123.45.67:8000/api
```

**This IP address will NEVER change** - even if you stop/restart the VM!

## Stream with OBS

1. Open OBS Studio
2. Settings → Stream
3. Server: `rtmp://YOUR_STATIC_IP:1935/live`
4. Stream Key: `mystream` (or any name)
5. Start Streaming

Your stream appears instantly on the web interface!

## Cost

- **VM (e2-micro)**: FREE (always-free tier)
- **30 GB Disk**: FREE (always-free tier)
- **Static IP**: FREE while VM runs, ~$3/month if stopped

**Total: $0/month** if you keep the VM running 24/7

## Useful Commands

```bash
# View server logs
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a --command 'pm2 logs'

# Restart server
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a --command 'pm2 restart rtmp-server'

# SSH into server
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a

# Check health
curl http://YOUR_STATIC_IP:8000/api/health
```

## Next Steps

1. Deploy frontend to Firebase Hosting
2. Add custom domain (optional)
3. Configure SSL/HTTPS (optional)

See `GOOGLE_CLOUD_DEPLOYMENT.md` for detailed documentation.
