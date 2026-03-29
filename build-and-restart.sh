#!/usr/bin/env bash
# Build Next.js site and run it in a single screen session (port 4000).
# Run from project dir: bash build-and-restart.sh
#
# Screen session name: 6ure-site  → reattach with: screen -r 6ure-site
# Env: .env in project root. Discord bot auth (DISCORD_BOT_TOKEN, DISCORD_GUILD_ID)
#      is synced from the Requests site .env so both use the same bot (REST-only here; no Gateway).

set -e
SCREEN_NAME="6ure-site"
cd "$(dirname "$0")"
ROOT="$(pwd)"
LOGFILE="$ROOT/wiki.log"
REQUESTS_ENV="/var/www/requests.6ureleaks.com/.env"

# Sync Discord bot auth from Requests site .env (same bot; 6ure uses REST only, does not run Gateway)
sync_discord_from_requests() {
  if [ ! -f "$REQUESTS_ENV" ]; then
    echo "==> Requests .env not found, skipping Discord auth sync."
    return
  fi
  BOT_TOKEN=$(grep -E '^DISCORD_BOT_TOKEN=' "$REQUESTS_ENV" | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  GUILD_ID=$(grep -E '^GUILD_ID=' "$REQUESTS_ENV" | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  BOT_API_URL=$(grep -E '^BOT_API_URL=' "$REQUESTS_ENV" | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  [ -z "$BOT_API_URL" ] && BOT_API_URL="http://localhost:3002"
  if [ -z "$BOT_TOKEN" ] || [ -z "$GUILD_ID" ]; then
    echo "==> Could not read DISCORD_BOT_TOKEN or GUILD_ID from Requests .env, skipping sync."
    return
  fi
  ENV_FILE="$ROOT/.env"
  [ -f "$ENV_FILE" ] || touch "$ENV_FILE"
  # Remove existing Discord/bot vars so we can append fresh from Requests
  awk '!/^DISCORD_BOT_TOKEN=|^DISCORD_GUILD_ID=|^REQUESTS_BOT_API_URL=/' "$ENV_FILE" > "${ENV_FILE}.tmp" 2>/dev/null || true
  mv "${ENV_FILE}.tmp" "$ENV_FILE"
  echo "DISCORD_BOT_TOKEN=$BOT_TOKEN" >> "$ENV_FILE"
  echo "DISCORD_GUILD_ID=$GUILD_ID" >> "$ENV_FILE"
  echo "REQUESTS_BOT_API_URL=$BOT_API_URL" >> "$ENV_FILE"
  echo "==> Synced Discord auth and REQUESTS_BOT_API_URL from Requests site .env"
}

sync_discord_from_requests

# Remove obsolete route so Next.js does not see ambiguous /api/comments/[requestId] vs [commentId]
rm -rf "src/app/api/comments/[requestId]" 2>/dev/null || true

echo "==> Ensuring public/uploads/creator-avatars exists (server-created avatars persist across deploys)..."
mkdir -p "public/uploads/creator-avatars"
chmod -R 755 "public/uploads" 2>/dev/null || true

# Only clear .next cache if --clean flag passed (incremental builds are much faster)
if [ "${1:-}" = "--clean" ]; then
  echo "==> Clearing .next cache (--clean flag)..."
  rm -rf .next
else
  echo "==> Keeping .next cache (incremental build). Pass --clean to force full rebuild."
fi

# Smart install: only run npm ci when lockfile changed
LOCK_HASH_FILE="$ROOT/.lockfile-hash"
CURRENT_HASH=$(md5sum "$ROOT/package-lock.json" 2>/dev/null | cut -d' ' -f1 || echo "none")
PREV_HASH=$(cat "$LOCK_HASH_FILE" 2>/dev/null || echo "")
if [ "$CURRENT_HASH" != "$PREV_HASH" ] || [ ! -d "$ROOT/node_modules" ]; then
  echo "==> Installing dependencies (lockfile changed or node_modules missing)..."
  npm ci --prefer-offline 2>/dev/null || npm install --prefer-offline
  echo "$CURRENT_HASH" > "$LOCK_HASH_FILE"
else
  echo "==> Skipping npm install (lockfile unchanged)."
fi

# Load .env so DB vars are available during next build (prerender of /wiki/sitemap.xml needs DB)
if [ ! -f "$ROOT/.env" ]; then
  echo "WARNING: $ROOT/.env not found. Create it with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME for build and runtime."
fi
if [ -f "$ROOT/.env" ]; then
  set -a
  . "$ROOT/.env"
  set +a
fi
if [ -z "${DB_HOST}" ]; then
  echo "ERROR: Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in $ROOT/.env (required for build and runtime)."
  exit 1
fi

echo "==> Building (turbopack, 4GB heap)..."
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
if npm run build -- --turbopack > "$ROOT/.build.log" 2>&1; then
  cat "$ROOT/.build.log"
  rm -f "$ROOT/.build.log"
else
  BUILD_EXIT=$?
  echo "==> BUILD FAILED (exit $BUILD_EXIT). Last 80 lines of .build.log:"
  echo "---"
  tail -80 "$ROOT/.build.log"
  echo "---"
  echo "Full log kept at: $ROOT/.build.log (inspect via SSH)"
  exit "$BUILD_EXIT"
fi

echo "==> Seeding about content (stats) from data/content.json..."
npm run db:seed-about 2>/dev/null || true

echo "==> Verifying BUILD_ID..."
if [ ! -f .next/BUILD_ID ]; then
  echo "ERROR: Build failed - no BUILD_ID found."
  exit 1
fi

# 1) Quit our screen session first (stops the server running inside it)
if screen -list 2>/dev/null | grep -q "\.$SCREEN_NAME\s"; then
  echo "==> Stopping screen session '$SCREEN_NAME'..."
  screen -S "$SCREEN_NAME" -X quit 2>/dev/null || true
  sleep 1
fi

# 2) Force-kill anything still bound to port 4000
echo "==> Freeing port 4000..."
if command -v fuser &>/dev/null; then
  fuser -k 4000/tcp 2>/dev/null || true
else
  PIDS=$(lsof -ti :4000 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
  fi
fi
sleep 1
# Retry if still in use
for _ in 1 2 3; do
  if ! lsof -ti :4000 &>/dev/null; then
    break
  fi
  lsof -ti :4000 | xargs -r kill -9 2>/dev/null || true
  sleep 1
done
if lsof -ti :4000 &>/dev/null; then
  echo "ERROR: Port 4000 still in use. Run: lsof -i :4000"
  exit 1
fi

# Start a real shell in screen, then send the start command so the session stays in screen -ls
# (If you see "nvm: version N/A is not installed", fix .nvmrc or run: nvm use default)
# Runs both: Discord bot (port 3002) and Next.js (port 4000). Bot is killed when Next.js exits.
echo "==> Starting in screen session '$SCREEN_NAME'..."
screen -dmS "$SCREEN_NAME" bash
sleep 1
screen -S "$SCREEN_NAME" -X stuff "cd $(printf '%q' "$ROOT")"
screen -S "$SCREEN_NAME" -X stuff "\n"
screen -S "$SCREEN_NAME" -X stuff "node bot/index.js & BOT_PID=\$!; trap 'kill \$BOT_PID 2>/dev/null' EXIT; npm run start:prod 2>&1 | tee -a $(printf '%q' "$LOGFILE")"
screen -S "$SCREEN_NAME" -X stuff "\n"

echo ""
echo "Done. Server runs in screen."
echo "  Attach:  screen -r $SCREEN_NAME"
echo "  Detach:  Ctrl+A, then D"
echo "  Log:     $LOGFILE"
echo ""
sleep 1
if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/ 2>/dev/null | grep -q "200"; then
  echo "==> Server is up (HTTP 200)."
else
  echo "==> Waiting for server... (check: screen -r $SCREEN_NAME  or  tail -f $LOGFILE)"
fi
