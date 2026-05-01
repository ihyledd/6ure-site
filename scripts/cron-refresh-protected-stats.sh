#!/bin/bash
# Refresh protected users stats (follower/video counts). Run every 30 min via cron.
# Usage: run from project root or pass path to .env
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$DIR/.env}"
if [[ -f "$ENV_FILE" ]]; then
  export CRON_SECRET
  CRON_SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//')
fi
curl -s "http://localhost:4000/api/cron/refresh-protected-stats?key=${CRON_SECRET}"
