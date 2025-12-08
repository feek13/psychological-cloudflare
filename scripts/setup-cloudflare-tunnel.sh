#!/bin/bash
# Cloudflare Tunnel Setup Script for Supabase
# This creates a permanent tunnel that survives server restarts
# Run this script on your server (148.135.56.115)

set -e

echo "=== Cloudflare Tunnel Setup for Supabase ==="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared.deb
    rm cloudflared.deb
    echo "cloudflared installed successfully"
else
    echo "cloudflared is already installed: $(cloudflared --version)"
fi

# Check if already logged in
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo ""
    echo "=== Step 1: Login to Cloudflare ==="
    echo "A browser window will open. Please login to your Cloudflare account."
    echo "If no browser opens, copy the URL and open it manually."
    echo ""
    cloudflared tunnel login
else
    echo "Already logged in to Cloudflare"
fi

# Tunnel name
TUNNEL_NAME="supabase-tunnel"

# Check if tunnel already exists
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo ""
    echo "Tunnel '$TUNNEL_NAME' already exists"
    TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
else
    echo ""
    echo "=== Step 2: Creating tunnel '$TUNNEL_NAME' ==="
    cloudflared tunnel create $TUNNEL_NAME
    TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
fi

echo "Tunnel ID: $TUNNEL_ID"

# Create config directory
mkdir -p /etc/cloudflared

# Create tunnel config
echo ""
echo "=== Step 3: Creating tunnel configuration ==="
cat > /etc/cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  # Supabase REST API and Auth
  - service: http://localhost:8000
EOF

echo "Configuration saved to /etc/cloudflared/config.yml"

# Copy credentials to /etc/cloudflared if needed
if [ -f "/root/.cloudflared/${TUNNEL_ID}.json" ] && [ ! -f "/etc/cloudflared/${TUNNEL_ID}.json" ]; then
    cp "/root/.cloudflared/${TUNNEL_ID}.json" "/etc/cloudflared/"
fi

# Ask about DNS configuration
echo ""
echo "=== Step 4: DNS Configuration ==="
echo ""
echo "You have two options:"
echo "1. Use a custom domain (recommended for production)"
echo "2. Use the default tunnel URL"
echo ""
read -p "Do you have a domain in Cloudflare you want to use? (y/n): " HAS_DOMAIN

if [ "$HAS_DOMAIN" = "y" ] || [ "$HAS_DOMAIN" = "Y" ]; then
    echo ""
    read -p "Enter your domain (e.g., example.com): " DOMAIN
    read -p "Enter subdomain for Supabase (e.g., supabase): " SUBDOMAIN

    HOSTNAME="${SUBDOMAIN}.${DOMAIN}"

    echo ""
    echo "Creating DNS route: $HOSTNAME -> $TUNNEL_NAME"
    cloudflared tunnel route dns $TUNNEL_NAME $HOSTNAME

    SUPABASE_URL="https://${HOSTNAME}"
    echo ""
    echo "DNS route created successfully!"
else
    echo ""
    echo "Using default tunnel hostname..."
    # For tunnels without custom domain, we need to use a workaround
    SUPABASE_URL="Use the URL from 'cloudflared tunnel info $TUNNEL_NAME'"
fi

# Install as systemd service
echo ""
echo "=== Step 5: Installing as system service ==="
cloudflared service install

# Enable and start the service
systemctl enable cloudflared
systemctl start cloudflared

# Check status
sleep 2
systemctl status cloudflared --no-pager

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Tunnel is now running as a system service and will auto-start on boot."
echo ""
if [ "$HAS_DOMAIN" = "y" ] || [ "$HAS_DOMAIN" = "Y" ]; then
    echo "Your Supabase URL: $SUPABASE_URL"
    echo ""
    echo "Update your Cloudflare Pages environment variable:"
    echo "  VITE_SUPABASE_URL=$SUPABASE_URL"
else
    echo "To get your tunnel info, run:"
    echo "  cloudflared tunnel info $TUNNEL_NAME"
fi
echo ""
echo "Useful commands:"
echo "  systemctl status cloudflared   # Check status"
echo "  systemctl restart cloudflared  # Restart tunnel"
echo "  journalctl -u cloudflared -f   # View logs"
echo "  cloudflared tunnel list        # List tunnels"
