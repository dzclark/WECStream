#!/bin/bash

# Setup Static IP Address for RTMP Server
# NOTE: This is now included in gcloud-setup.sh by default
# Only use this script if you need to add a static IP to an existing VM

set -e

echo "=== Setting Up Static IP Address ==="
echo ""
echo "NOTE: If you're creating a new VM, use gcloud-setup.sh instead"
echo "      (it includes static IP setup automatically)"
echo ""

# Configuration
PROJECT_ID="rmtp-streaming"
INSTANCE_NAME="rtmp-streaming-server"
ZONE="us-central1-a"
REGION="us-central1"
IP_NAME="rtmp-server-ip"

echo "Project ID: $PROJECT_ID"
echo "Instance: $INSTANCE_NAME"
echo "Region: $REGION"
echo ""

# Set project
gcloud config set project $PROJECT_ID

# Check if IP already exists
if gcloud compute addresses describe $IP_NAME --region=$REGION &> /dev/null; then
    echo "Static IP '$IP_NAME' already exists"
    STATIC_IP=$(gcloud compute addresses describe $IP_NAME \
        --region=$REGION \
        --format='get(address)')
    echo "IP Address: $STATIC_IP"
else
    # Reserve a new static IP
    echo "Reserving static IP address..."
    gcloud compute addresses create $IP_NAME \
        --region=$REGION
    
    STATIC_IP=$(gcloud compute addresses describe $IP_NAME \
        --region=$REGION \
        --format='get(address)')
    
    echo "Static IP reserved: $STATIC_IP"
fi

echo ""
echo "Attaching static IP to instance..."

# Remove existing external IP
gcloud compute instances delete-access-config $INSTANCE_NAME \
    --zone=$ZONE \
    --access-config-name="External NAT" \
    || echo "No existing access config to remove"

# Add static IP
gcloud compute instances add-access-config $INSTANCE_NAME \
    --zone=$ZONE \
    --access-config-name="External NAT" \
    --address=$STATIC_IP

echo ""
echo "=== Static IP Setup Complete! ==="
echo ""
echo "Your permanent IP address: $STATIC_IP"
echo ""
echo "RTMP URL: rtmp://$STATIC_IP:1935/live"
echo "API URL: http://$STATIC_IP:8000/api"
echo ""
echo "This IP will remain the same even if you stop/start the VM."
echo ""
echo "COST: Free while VM is running, ~\$3/month if VM is stopped"
echo ""
