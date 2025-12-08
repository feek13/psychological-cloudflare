# Cloudflare Deployment Guide

## Problem: Mixed Content (HTTPS -> HTTP)

Cloudflare Pages runs on HTTPS, but your Supabase server runs on HTTP (148.135.56.115:8000). Browsers block these mixed content requests.

## Solution: Cloudflare Tunnel

Create a permanent Cloudflare Tunnel to expose Supabase over HTTPS.

---

## Prerequisites

1. A Cloudflare account
2. A domain configured in Cloudflare (any domain works)
3. SSH access to your server (148.135.56.115)

---

## Step 1: Setup Cloudflare Tunnel on Server

SSH to your server and run:

```bash
ssh root@148.135.56.115
# Password: y6fHEoB7AM6q0p45Pj

# Download and run setup script
curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
dpkg -i cloudflared.deb

# Login to Cloudflare (opens browser)
cloudflared tunnel login

# Create named tunnel
cloudflared tunnel create supabase-tunnel

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep supabase-tunnel | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# Create config
mkdir -p /etc/cloudflared
cat > /etc/cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - service: http://localhost:8000
EOF

# Copy credentials
cp /root/.cloudflared/${TUNNEL_ID}.json /etc/cloudflared/

# Create DNS route (replace YOUR_DOMAIN with your actual domain)
cloudflared tunnel route dns supabase-tunnel supabase.YOUR_DOMAIN.com

# Install as system service
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared

# Verify it's running
systemctl status cloudflared
```

---

## Step 2: Update Cloudflare Pages Environment Variables

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **psychological-cloudflare**
3. Click **Settings** → **Environment variables**
4. **Edit** the Production environment
5. Set/Update these variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://supabase.YOUR_DOMAIN.com` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your key) |

6. Click **Save**

---

## Step 3: Redeploy

Trigger a new deployment:

```bash
# Option 1: Empty commit
git commit --allow-empty -m "Trigger redeploy with new env vars"
git push

# Option 2: From Cloudflare Dashboard
# Pages -> psychological-cloudflare -> Deployments -> Retry deployment
```

---

## Verification

1. Test tunnel health:
```bash
curl https://supabase.YOUR_DOMAIN.com/rest/v1/ -H "apikey: YOUR_ANON_KEY"
```

2. Visit https://psychological-cloudflare.pages.dev/dashboard

3. Check browser console for any errors

---

## Troubleshooting

### Tunnel not working
```bash
# Check tunnel status
systemctl status cloudflared

# View logs
journalctl -u cloudflared -f

# Restart tunnel
systemctl restart cloudflared
```

### DNS not resolving
```bash
# Verify DNS route
cloudflared tunnel route ip show

# Re-add DNS route
cloudflared tunnel route dns supabase-tunnel supabase.YOUR_DOMAIN.com
```

### Still getting mixed content errors
- Verify `VITE_SUPABASE_URL` starts with `https://`
- Ensure Cloudflare Pages was redeployed after environment variable change
- Clear browser cache and hard refresh

---

## Architecture

```
Browser (HTTPS)
    ↓
Cloudflare Pages (psychological-cloudflare.pages.dev)
    ↓
Cloudflare Tunnel (supabase.YOUR_DOMAIN.com)
    ↓
Server (148.135.56.115:8000 - Supabase)
```

---

## Useful Commands

```bash
# List tunnels
cloudflared tunnel list

# Tunnel info
cloudflared tunnel info supabase-tunnel

# Delete tunnel (if needed)
systemctl stop cloudflared
cloudflared tunnel delete supabase-tunnel -f

# Logs
journalctl -u cloudflared --since "1 hour ago"
```
