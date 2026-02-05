#!/bin/bash

# VM Startup Script - Runs when the instance boots
# This installs all dependencies and starts the RTMP server

set -e

echo "=== Starting RTMP Server Setup ==="

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install FFmpeg
apt-get install -y ffmpeg

# Install Git
apt-get install -y git

# Install PM2 for process management globally
npm install -g pm2

# Verify PM2 is installed
which pm2 || echo "PM2 installation failed"

# Create application directory
mkdir -p /opt/rtmp-server
cd /opt/rtmp-server

# Clone or copy your application
# For now, we'll create the necessary files
# In production, you'd clone from a Git repository

cat > package.json << 'EOF'
{
  "name": "rtmp-streaming-app",
  "version": "1.0.0",
  "description": "RTMP streaming application with Firebase backend",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {
    "node-media-server": "^2.6.2",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "firebase-admin": "^12.0.0",
    "dotenv": "^16.3.1",
    "fluent-ffmpeg": "^2.1.2",
    "uuid": "^9.0.1",
    "socket.io": "^4.6.1"
  }
}
EOF

# Create .env file
cat > .env << 'EOF'
PORT=8000
RTMP_PORT=1935
HTTP_PORT=8000
NODE_ENV=production
EOF

# Create directory structure
mkdir -p server
mkdir -p media

# Note: You'll need to upload your actual server files
# This is a placeholder - see deployment instructions

echo "Waiting for application files to be uploaded..."
echo "Please upload your server files to /opt/rtmp-server/server/"

# Install dependencies
npm install

# Set up PM2 to run on startup
pm2 startup systemd -u root --hp /root

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'rtmp-server',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Set permissions
chown -R root:root /opt/rtmp-server
chmod -R 755 /opt/rtmp-server

echo "=== Setup Complete ==="
echo "To start the server, upload your code and run:"
echo "cd /opt/rtmp-server && pm2 start ecosystem.config.js"
echo "pm2 save"
