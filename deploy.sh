#!/bin/bash
# Cloudflare Deployment Script for Psychological Assessment Platform
# Usage: ./deploy.sh [workers|frontend|all]

set -e

echo "============================================"
echo "Cloudflare Deployment Script"
echo "============================================"

# Check if wrangler is authenticated
check_auth() {
    echo "Checking Cloudflare authentication..."
    if ! npx wrangler whoami 2>/dev/null | grep -q "You are logged in"; then
        echo "Not authenticated. Please run: npx wrangler login"
        exit 1
    fi
    echo "Authentication OK"
}

# Deploy scoring worker
deploy_scoring_worker() {
    echo ""
    echo "Deploying scoring-worker..."
    cd workers/scoring
    npm install
    npx wrangler deploy
    cd ../..
    echo "scoring-worker deployed successfully!"
}

# Deploy AI report worker
deploy_ai_report_worker() {
    echo ""
    echo "Deploying ai-report-worker..."
    cd workers/ai-report
    npm install

    # Check if OPENROUTER_API_KEY secret is set
    echo "Checking secrets..."
    if ! npx wrangler secret list 2>/dev/null | grep -q "OPENROUTER_API_KEY"; then
        echo "WARNING: OPENROUTER_API_KEY not set. Run:"
        echo "  npx wrangler secret put OPENROUTER_API_KEY"
    fi

    npx wrangler deploy
    cd ../..
    echo "ai-report-worker deployed successfully!"
}

# Deploy frontend to Cloudflare Pages
deploy_frontend() {
    echo ""
    echo "Building and deploying frontend..."
    cd frontend

    # Check for required environment variables
    if [ -z "$VITE_SUPABASE_URL" ]; then
        echo "WARNING: VITE_SUPABASE_URL not set"
        echo "Using default: http://148.135.56.115:8000"
    fi

    if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
        echo "WARNING: VITE_SUPABASE_ANON_KEY not set"
    fi

    # Install dependencies
    npm install

    # Build
    npm run build

    # Deploy to Cloudflare Pages
    echo "Deploying to Cloudflare Pages..."
    npx wrangler pages deploy dist --project-name=psychological-assessment

    cd ..
    echo "Frontend deployed successfully!"
}

# Main
case "$1" in
    workers)
        check_auth
        deploy_scoring_worker
        deploy_ai_report_worker
        ;;
    frontend)
        check_auth
        deploy_frontend
        ;;
    all)
        check_auth
        deploy_scoring_worker
        deploy_ai_report_worker
        deploy_frontend
        ;;
    *)
        echo "Usage: ./deploy.sh [workers|frontend|all]"
        echo ""
        echo "Commands:"
        echo "  workers   - Deploy both Cloudflare Workers (scoring + ai-report)"
        echo "  frontend  - Build and deploy frontend to Cloudflare Pages"
        echo "  all       - Deploy everything"
        echo ""
        echo "Prerequisites:"
        echo "  1. Run: npx wrangler login"
        echo "  2. Set environment variables for frontend:"
        echo "     - VITE_SUPABASE_URL"
        echo "     - VITE_SUPABASE_ANON_KEY"
        echo "  3. Set worker secrets:"
        echo "     - cd workers/ai-report && npx wrangler secret put OPENROUTER_API_KEY"
        ;;
esac

echo ""
echo "============================================"
echo "Deployment complete!"
echo "============================================"
