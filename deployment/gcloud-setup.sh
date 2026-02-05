#!/bin/bash

# Google Cloud Compute Engine Deployment Script
# This script sets up a free e2-micro instance for the RTMP streaming server

set -e

echo "=== RTMP Streaming Server - Google Cloud Setup ==="
echo ""

# Configuration
PROJECT_ID="rmtp-streaming"
INSTANCE_NAME="rtmp-streaming-server"
ZONE="us-central1-a"  # Free tier available in US regions
MACHINE_TYPE="e2-micro"  # Free tier eligible
BOOT_DISK_SIZE="30GB"  # Free tier includes 30GB
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
REGION="us-central1"
IP_NAME="rtmp-server-ip"

echo "Project ID: $PROJECT_ID"
echo "Instance Name: $INSTANCE_NAME"
echo "Zone: $ZONE"
echo "Machine Type: $MACHINE_TYPE (Free Tier)"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed."
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "Setting GCP project..."
gcloud config set project $PROJECT_ID

# Create firewall rules
echo ""
echo "Creating firewall rules..."

# RTMP port (1935)
gcloud compute firewall-rules create allow-rtmp \
    --allow tcp:1935 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow RTMP streaming traffic" \
    --direction INGRESS \
    || echo "Firewall rule 'allow-rtmp' may already exist"

# HTTP API port (8000)
gcloud compute firewall-rules create allow-http-api \
    --allow tcp:8000 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP API traffic" \
    --direction INGRESS \
    || echo "Firewall rule 'allow-http-api' may already exist"

# HTTPS (443) - for future use
gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTPS traffic" \
    --direction INGRESS \
    || echo "Firewall rule 'allow-https' may already exist"

# Reserve a static IP address
echo ""
echo "Reserving static IP address..."
if gcloud compute addresses describe $IP_NAME --region=$REGION &> /dev/null; then
    echo "Static IP '$IP_NAME' already exists"
    STATIC_IP=$(gcloud compute addresses describe $IP_NAME \
        --region=$REGION \
        --format='get(address)')
else
    gcloud compute addresses create $IP_NAME \
        --region=$REGION
    STATIC_IP=$(gcloud compute addresses describe $IP_NAME \
        --region=$REGION \
        --format='get(address)')
fi

echo "Reserved static IP: $STATIC_IP"

# Create the VM instance
echo ""
echo "Creating VM instance with static IP..."
gcloud compute instances create $INSTANCE_NAME \
    --zone=$ZONE \
    --machine-type=$MACHINE_TYPE \
    --image-family=$IMAGE_FAMILY \
    --image-project=$IMAGE_PROJECT \
    --boot-disk-size=$BOOT_DISK_SIZE \
    --boot-disk-type=pd-standard \
    --tags=rtmp-server,http-server \
    --metadata-from-file startup-script=./startup-script.sh \
    --scopes=cloud-platform \
    --address=$STATIC_IP

echo ""
echo "=== Instance Created Successfully with Static IP! ==="
echo ""

echo "Instance Name: $INSTANCE_NAME"
echo "Static IP Address: $STATIC_IP (PERMANENT)"
echo ""
echo "RTMP URL: rtmp://$STATIC_IP:1935/live"
echo "API URL: http://$STATIC_IP:8000/api"
echo ""
echo "✓ Your IP address will NEVER change, even if you stop/restart the VM"
echo "✓ Cost: FREE while VM is running, ~\$3/month if VM is stopped"
echo ""
echo "The server is being set up. This may take 5-10 minutes."
echo "Check status with: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo ""
echo "To view logs: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command 'sudo journalctl -u rtmp-server -f'"
echo ""
echo "IMPORTANT: Save this IP address - it's permanent!"
echo "  RTMP: rtmp://$STATIC_IP:1935/live"
echo "  API:  http://$STATIC_IP:8000/api"
echo ""
