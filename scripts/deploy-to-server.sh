#!/bin/bash
# Deploy wiki-next from this folder to the server and rebuild.
# Usage:
#   1. Set your server (replace 173.249.56.89 with your server IP or hostname):
#      export WIKI_SERVER=root@173.249.56.89
#   2. From the wiki-next project root, run:
#      bash scripts/deploy-to-server.sh

set -e
SERVER="${WIKI_SERVER:-root@173.249.56.89}"
REMOTE_DIR="~/wiki-next"

echo "Deploying to $SERVER ..."
echo "Syncing files (src, app config, package.json, prisma)..."

rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  ./ "$SERVER:$REMOTE_DIR/"

echo "Running build and restart on server..."
ssh "$SERVER" "cd $REMOTE_DIR && npm install --omit=dev && npx next build && npm run db:seed-about 2>/dev/null || true && pm2 restart wiki-next || pm2 start npm --name wiki-next -- start -- -p 4000"

echo "Done. Open your wiki URL and hard-refresh (Cmd+Shift+R)."
