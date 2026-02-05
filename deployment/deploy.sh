#!/bin/bash

# Deployment Script - Upload code to Google Cloud VM
# Run this after creating the VM instance

set -e

echo "=== Deploying RTMP Server to Google Cloud ==="
echo ""

# Configuration
PROJECT_ID="rmtp-streaming"
INSTANCE_NAME="rtmp-streaming-server"
ZONE="us-central1-a"

echo "Project ID: $PROJECT_ID"
echo "Instance: $INSTANCE_NAME"
echo "Zone: $ZONE"
echo ""

# Check if instance exists
if ! gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE &> /dev/null; then
    echo "Error: Instance '$INSTANCE_NAME' not found in zone '$ZONE'"
    echo "Please run gcloud-setup.sh first"
    exit 1
fi

# Create a temporary directory with only server files
echo "Preparing files for deployment..."
TEMP_DIR=$(mktemp -d)
mkdir -p $TEMP_DIR/server

# Copy server files
cp -r ../server/* $TEMP_DIR/server/
cp ../package.json $TEMP_DIR/
cp ../.env.example $TEMP_DIR/.env

# Copy Firebase service account if it exists
if [ -f ../firebase-service-account.json ]; then
    cp ../firebase-service-account.json $TEMP_DIR/
    echo "Firebase service account included"
fi

echo "Creating application directory on VM..."

# Create directory with proper permissions first
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command '
    sudo mkdir -p /opt/rtmp-server
    sudo chown -R $USER:$USER /opt/rtmp-server
'

echo "Uploading files to VM..."

# Upload files to VM
gcloud compute scp --recurse $TEMP_DIR/* \
    $INSTANCE_NAME:/opt/rtmp-server/ \
    --zone=$ZONE

# Clean up temp directory
rm -rf $TEMP_DIR

echo ""
echo "Installing dependencies and starting server..."

# SSH into instance and set up
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command '
    cd /opt/rtmp-server
    npm install --production
    pm2 start ecosystem.config.js
    pm2 save
    pm2 list
'

echo ""
echo "=== Deployment Complete! ==="
echo ""

# Get the external IP
EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
    --zone=$ZONE \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "Your RTMP server is now running!"
echo ""
echo "RTMP URL: rtmp://$EXTERNAL_IP:1935/live"
echo "API URL: http://$EXTERNAL_IP:8000/api"
echo "Health Check: http://$EXTERNAL_IP:8000/api/health"
echo ""
echo "Test the health endpoint:"
echo "curl http://$EXTERNAL_IP:8000/api/health"
echo ""
echo "View logs:"
echo "gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command 'pm2 logs rtmp-server'"
echo ""
