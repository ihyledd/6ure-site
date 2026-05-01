#!/usr/bin/env bash
# Deploy from Mac to VPS: push code via git, then SSH to VPS, pull and build.
#
# Prerequisites:
#   - You have pushed from Mac to GitHub (git push).
#   - VPS has the repo cloned and can git pull (e.g. origin main).
#   - .env and any secrets live on the VPS only (this script does not upload them).
#
# Usage:
#   1. Set env (once per terminal or in .env.deploy / your shell profile):
#      export DEPLOY_VPS_HOST="user@your-vps-ip"
#      export DEPLOY_VPS_DIR="/path/on/vps/to/6ure-site"
#   2. From project root on your Mac:
#      bash scripts/deploy-vps.sh
#   Or: npm run deploy:vps
#
# What it does on the VPS:
#   - cd to project dir, git pull, then run build-and-restart.sh (build + restart app in screen).

set -e

HOST="root@173.249.56.89"
DIR="/var/www/html/new complete site"

if [ -z "$HOST" ] || [ -z "$DIR" ]; then
  echo "Set DEPLOY_VPS_HOST and DEPLOY_VPS_DIR before running this script."
  echo ""
  echo "  export DEPLOY_VPS_HOST=\"root@173.249.56.89\""
  echo "  export DEPLOY_VPS_DIR=\"/path/on/vps/to/6ure-site\""
  echo ""
  echo "Example (replace with your VPS user and path):"
  echo "  export DEPLOY_VPS_HOST=\"root@173.249.56.89\""
  echo "  export DEPLOY_VPS_DIR=\"/var/www/html/6ure-site\""
  exit 1
fi

echo "==> Deploying to VPS..."
echo "    Host: $HOST"
echo "    Dir:  $DIR"
echo ""

ssh "$HOST" "cd $(printf '%q' "$DIR") && git pull origin main && bash build-and-restart.sh"

echo ""
echo "Done. If the app uses a different process manager (e.g. pm2), edit build-and-restart.sh on the VPS or run your own commands after git pull."
