# Deployment Scripts

This directory contains scripts and configuration for deploying the RTMP streaming server to Google Cloud Platform's free tier **with a permanent static IP address**.

## Files

- **`gcloud-setup.sh`** - Creates VM with static IP and firewall rules
- **`deploy.sh`** - Uploads code and starts the server
- **`startup-script.sh`** - VM initialization script (runs on first boot)
- **`setup-static-ip.sh`** - Add static IP to existing VM (optional)
- **`ecosystem.config.js`** - PM2 process manager configuration
- **`QUICKSTART.md`** - 5-minute quick start guide
- **`GOOGLE_CLOUD_DEPLOYMENT.md`** - Complete deployment guide

## Quick Start

1. **Install Google Cloud SDK**
   ```bash
   brew install --cask google-cloud-sdk  # macOS
   gcloud init
   ```

2. **Edit Configuration**
   - Update `PROJECT_ID` in `gcloud-setup.sh` (line 12)
   - Update `PROJECT_ID` in `deploy.sh` (line 9)

3. **Create VM with Static IP**
   ```bash
   chmod +x *.sh
   ./gcloud-setup.sh
   ```
   This automatically reserves a **permanent static IP** for your server.

4. **Deploy Application**
   ```bash
   ./deploy.sh
   ```

5. **Get Your Permanent IP**
   The script outputs your static IP that will **never change**.

## Cost

Using Google Cloud's **Always Free Tier**:
- e2-micro instance: **FREE**
- 30 GB disk: **FREE**
- 1 GB network egress/month: **FREE**
- Static IP (while VM runs): **FREE**
- Static IP (if VM stopped): **~$3/month**

**Total: $0/month** if VM runs 24/7 (within free tier limits)

## Support

See `GOOGLE_CLOUD_DEPLOYMENT.md` for detailed instructions and troubleshooting.
