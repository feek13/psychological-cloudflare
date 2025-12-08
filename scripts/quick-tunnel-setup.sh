#!/bin/bash
# Quick Cloudflare Tunnel Setup for Supabase
# Creates a named tunnel with systemd service
# Run on server: bash <(curl -s https://raw.githubusercontent.com/xxx/quick-tunnel-setup.sh)

set -e

echo "=== Quick Cloudflare Tunnel Setup ==="

# Install cloudflared if needed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
fi

echo "cloudflared version: $(cloudflared --version)"

# Login if needed
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo ""
    echo "Please login to Cloudflare (browser will open)..."
    cloudflared tunnel login
fi

TUNNEL_NAME="supabase-tunnel"

# Delete existing tunnel if it exists (clean setup)
if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
    echo "Removing existing tunnel..."
    systemctl stop cloudflared 2>/dev/null || true
    cloudflared tunnel delete $TUNNEL_NAME -f 2>/dev/null || true
fi

# Create new tunnel
echo "Creating tunnel: $TUNNEL_NAME"
cloudflared tunnel create $TUNNEL_NAME

TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# Setup config
mkdir -p /etc/cloudflared
cat > /etc/cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - service: http://localhost:8000
EOF

# Copy credentials
cp "/root/.cloudflared/${TUNNEL_ID}.json" "/etc/cloudflared/" 2>/dev/null || true

# Configure DNS route
echo ""
echo "Enter your Cloudflare domain (e.g., yourdomain.com):"
read -p "Domain: " DOMAIN

if [ -n "$DOMAIN" ]; then
    HOSTNAME="supabase.${DOMAIN}"
    echo "Creating DNS route: $HOSTNAME"
    cloudflared tunnel route dns $TUNNEL_NAME $HOSTNAME

    FINAL_URL="https://${HOSTNAME}"
else
    echo "No domain provided. You'll need to configure DNS manually."
    FINAL_URL="[Configure domain first]"
fi

# Install service
echo "Installing systemd service..."
cloudflared service install 2>/dev/null || true
systemctl daemon-reload
systemctl enable cloudflared
systemctl restart cloudflared

sleep 3
systemctl status cloudflared --no-pager || true

echo ""
echo "========================================="
echo "SETUP COMPLETE!"
echo "========================================="
echo ""
echo "Your Supabase URL: $FINAL_URL"
echo ""
echo "Next steps:"
echo "1. Go to Cloudflare Pages Dashboard"
echo "2. Settings -> Environment Variables"
echo "3. Set VITE_SUPABASE_URL = $FINAL_URL"
echo "4. Redeploy your Pages project"
echo ""
echo "Tunnel will auto-start on server reboot."
echo "========================================="
