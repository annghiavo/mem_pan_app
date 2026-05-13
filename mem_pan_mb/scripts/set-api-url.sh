#!/bin/bash
# Detects the current LAN IP and writes it to .env so the app always hits the right backend.
IP=$(ip addr show | awk '/inet / && !/127\.0\.0\.1/ && !/172\.1[6-9]\./ && !/172\.2[0-9]\./ && !/172\.3[0-1]\./ && !/172\.17\./ && !/172\.18\./{print $2}' | cut -d/ -f1 | head -1)

if [ -z "$IP" ]; then
  echo "No suitable network interface found. Are you connected to Wi-Fi or a hotspot?"
  exit 1
fi

PORT=8000
URL="http://$IP:$PORT/v1"

sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$URL|" .env
echo "EXPO_PUBLIC_API_URL set to $URL"
