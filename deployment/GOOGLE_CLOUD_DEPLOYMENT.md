# Google Cloud Deployment Guide

Deploy your RTMP streaming server to Google Cloud's **free tier e2-micro instance**.

## Prerequisites

1. **Google Cloud Account**
   - Sign up at https://cloud.google.com/
   - $300 free credit for new accounts (90 days)
   - Always-free tier includes e2-micro instance

2. **Google Cloud SDK (gcloud)**
   - Install from: https://cloud.google.com/sdk/docs/install
   - Verify: `gcloud --version`

3. **Firebase Project** (Optional)
   - Create at https://console.firebase.google.com/
   - Download service account key as `firebase-service-account.json`

## Important: IP Address Persistence

**By default, your VM's external IP changes when you stop/restart it.**

### Options:

1. **Keep VM running 24/7** (Free - IP won't change)
2. **Reserve a static IP** (Free while VM runs, ~$3/month if stopped)
3. **Use a domain name** (Recommended for production)

To reserve a static IP, see the "Reserve Static IP" section below.

## Step-by-Step Deployment

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

**Windows:**
Download installer from https://cloud.google.com/sdk/docs/install

### 2. Initialize gcloud

```bash
gcloud init
```

Follow the prompts to:
- Log in to your Google account
- Select or create a project
- Set default region (choose US region for free tier)

### 3. Enable Required APIs

```bash
# Enable Compute Engine API
gcloud services enable compute.googleapis.com

# Enable Cloud Storage (for Firebase)
gcloud services enable storage.googleapis.com
```

### 4. Configure Deployment Scripts

Edit the configuration in the deployment scripts:

**`deployment/gcloud-setup.sh`:**
```bash
PROJECT_ID="your-actual-project-id"  # Change this!
```

**`deployment/deploy.sh`:**
```bash
PROJECT_ID="your-actual-project-id"  # Change this!
```

Find your project ID:
```bash
gcloud projects list
```

### 5. Make Scripts Executable

```bash
cd /Users/david/RMTP/deployment
chmod +x gcloud-setup.sh
chmod +x deploy.sh
chmod +x startup-script.sh
```

### 6. Create the VM Instance

```bash
./gcloud-setup.sh
```

This will:
- Create firewall rules for ports 1935, 8000, 443
- Create an e2-micro VM instance (free tier)
- Configure startup script
- Display the external IP address

**Wait 2-3 minutes** for the instance to fully boot.

### 7. Deploy Your Application

```bash
./deploy.sh
```

This will:
- Upload your server code to the VM
- Install Node.js dependencies
- Start the server with PM2
- Display your server URLs

### 8. Verify Deployment

Test the health endpoint:
```bash
# Replace with your actual IP
curl http://YOUR_EXTERNAL_IP:8000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-04T10:57:00.000Z"}
```

### 9. Configure Your Frontend

Update your React app to use the production server:

**`client/src/components/LiveStreams.js`:**
```javascript
// Replace localhost with your external IP
const socket = io('http://YOUR_EXTERNAL_IP:8000');
```

**`client/package.json`:**
```json
{
  "proxy": "http://YOUR_EXTERNAL_IP:8000"
}
```

### 10. Reserve Static IP (Optional but Recommended)

To ensure your IP address never changes:

```bash
cd /Users/david/RMTP/deployment
chmod +x setup-static-ip.sh

# Edit PROJECT_ID in the script first
./setup-static-ip.sh
```

This reserves a permanent IP address for your server.

**Cost:** 
- Free while VM is running
- ~$3/month if VM is stopped (to keep the reservation)

### 11. Deploy Frontend to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
cd /Users/david/RMTP
firebase init hosting

# Select:
# - Your Firebase project
# - Public directory: client/build
# - Single-page app: Yes
# - Automatic builds: No

# Build the React app
cd client
npm run build
cd ..

# Deploy to Firebase
firebase deploy --only hosting
```

## Server Management

### View Logs
```bash
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a --command 'pm2 logs rtmp-server'
```

### Restart Server
```bash
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a --command 'pm2 restart rtmp-server'
```

### Stop Server
```bash
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a --command 'pm2 stop rtmp-server'
```

### SSH into Server
```bash
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a
```

### Check Server Status
```bash
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a --command 'pm2 status'
```

### Update Code
After making changes, redeploy:
```bash
cd /Users/david/RMTP/deployment
./deploy.sh
```

## Cost Management

### Free Tier Limits (Always Free)

- **1 e2-micro instance** per month (US regions)
- **30 GB standard persistent disk**
- **1 GB network egress** per month
- **5 GB Cloud Storage**

### Monitor Usage

```bash
# View instance details
gcloud compute instances describe rtmp-streaming-server --zone=us-central1-a

# Check billing
gcloud billing accounts list
```

### Stop Instance (to save costs if needed)

```bash
# Stop instance
gcloud compute instances stop rtmp-streaming-server --zone=us-central1-a

# Start instance
gcloud compute instances start rtmp-streaming-server --zone=us-central1-a
```

**Note:** Stopped instances still incur disk storage costs (~$1.20/month for 30GB).

## Firewall Configuration

The deployment automatically creates these firewall rules:

| Rule | Port | Protocol | Purpose |
|------|------|----------|---------|
| allow-rtmp | 1935 | TCP | RTMP streaming input |
| allow-http-api | 8000 | TCP | REST API & WebSocket |
| allow-https | 443 | TCP | HTTPS (future use) |

### View Firewall Rules
```bash
gcloud compute firewall-rules list
```

### Delete Firewall Rule
```bash
gcloud compute firewall-rules delete RULE_NAME
```

## SSL/HTTPS Setup (Optional)

For production, you should use HTTPS:

### 1. Get a Domain Name
- Register a domain (e.g., Namecheap, Google Domains)
- Point A record to your VM's external IP

### 2. Install Certbot
```bash
gcloud compute ssh rtmp-streaming-server --zone=us-central1-a

sudo apt-get update
sudo apt-get install -y certbot
```

### 3. Get SSL Certificate
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

### 4. Configure Nginx as Reverse Proxy
```bash
sudo apt-get install -y nginx

# Configure Nginx to proxy to your Node.js server
# See Nginx configuration examples online
```

## Troubleshooting

### Can't Connect to Server

1. **Check instance is running:**
   ```bash
   gcloud compute instances list
   ```

2. **Check firewall rules:**
   ```bash
   gcloud compute firewall-rules list
   ```

3. **Check server logs:**
   ```bash
   gcloud compute ssh rtmp-streaming-server --zone=us-central1-a --command 'pm2 logs'
   ```

### FFmpeg Not Found

SSH into server and check:
```bash
which ffmpeg
```

If not found, install:
```bash
sudo apt-get install -y ffmpeg
```

### Out of Memory

The e2-micro has only 1GB RAM. If you run out:

1. **Add swap space:**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **Or upgrade instance:**
   ```bash
   gcloud compute instances set-machine-type rtmp-streaming-server \
     --machine-type=e2-small \
     --zone=us-central1-a
   ```
   **Note:** e2-small is NOT free tier (~$13/month)

### Network Egress Limit

Free tier includes 1GB egress/month. If exceeded:
- Upgrade to paid tier
- Use Cloud CDN
- Compress videos more aggressively

## Cleanup (Delete Everything)

To remove all resources:

```bash
# Delete instance
gcloud compute instances delete rtmp-streaming-server --zone=us-central1-a

# Delete firewall rules
gcloud compute firewall-rules delete allow-rtmp
gcloud compute firewall-rules delete allow-http-api
gcloud compute firewall-rules delete allow-https
```

## Production Checklist

- [ ] Domain name configured
- [ ] SSL certificate installed
- [ ] Environment variables set (not hardcoded)
- [ ] Firebase service account uploaded
- [ ] Firewall rules configured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] PM2 configured for auto-restart
- [ ] Nginx reverse proxy (optional)
- [ ] CDN configured (optional)

## Support

- Google Cloud Documentation: https://cloud.google.com/compute/docs
- Firebase Documentation: https://firebase.google.com/docs
- PM2 Documentation: https://pm2.keymetrics.io/

## Next Steps

1. Deploy frontend to Firebase Hosting
2. Configure custom domain
3. Set up SSL/HTTPS
4. Add authentication
5. Configure monitoring and alerts
6. Set up automated backups
