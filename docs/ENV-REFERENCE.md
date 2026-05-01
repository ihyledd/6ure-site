# Environment variables (integrated site)

Use this on the server at **`/var/www/html/new complete site/.env`**. The deploy script does **not** upload `.env`; create or edit it manually on the VPS.

**Database:** The app uses **MySQL** (same as the previous requests app / phpMyAdmin). You can either set **`DATABASE_URL`** (e.g. `mysql://user:pass@host:3306/dbname`) or the same **`DB_HOST`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`** (and optionally **`DB_PORT`**) as in `requests/.env.example`; the app builds `DATABASE_URL` from those.

## Mapping from old Requests site

| Old (Requests Express .env) | Integrated site (Next.js) | Notes |
|-----------------------------|---------------------------|--------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | **Use as-is** or **`DATABASE_URL`** | MySQL. If you set `DB_*`, the app builds `DATABASE_URL` automatically. |
| `SESSION_SECRET` | **`AUTH_SECRET`** or **`NEXTAUTH_SECRET`** | NextAuth + wiki unlock signing (min 16 chars). |
| `DISCORD_CLIENT_ID` | **`DISCORD_CLIENT_ID`** | Same. |
| `DISCORD_CLIENT_SECRET` | **`DISCORD_CLIENT_SECRET`** | Same. |
| `DISCORD_REDIRECT_URI` | (not used) | NextAuth uses its own callback URL. |
| `GUILD_ID` / `DISCORD_SERVER_ID` | **`DISCORD_GUILD_ID`** or **`DISCORD_SERVER_ID`** | One is enough; both are read. |
| `DISCORD_BOT_TOKEN` | **`DISCORD_BOT_TOKEN`** | Same. |
| `DISCORD_STAFF_ROLE_IDS` | **`DISCORD_STAFF_ROLE_IDS`** | Same (comma-separated). |
| `DISCORD_PREMIUM_ROLE_ID` | **`DISCORD_PREMIUM_ROLE_ID`** | Optional; used for requests user sync. |
| `BOT_API_URL` (if any) | **`REQUESTS_BOT_API_URL`** or **`BOT_API_URL`** | Optional; used by About staff API. |
| `FRONTEND_URL` | **`NEXT_PUBLIC_SITE_URL`** | e.g. `https://6ureleaks.com`. |
| — | **`WIKI_DEVELOPER_DISCORD_ID`** | Optional; Discord ID always treated as admin. |

Old vars that are **not** used by the integrated app (no need to copy):

- `PORT`, `NODE_ENV` (handled by run script)
- `DISCORD_REDIRECT_URI` (NextAuth builds it)
- `DISCORD_REQUEST_CHANNEL_ID`, `DISCORD_LEAK_FORUM_ID`, etc. (only if you add features that post to those channels)
- `SCRAPE_API_KEY`, `SCRAPE_API_URL` (only if you add scraper integration)
- `PROTECTION_*`, `LEAKS_DATA_PATH` (only if you implement leaks/protection file reads)
- `CREATOR_AVATAR_REFRESH_INTERVAL_MS` (handled in code defaults if needed)
- `VITE_MEMBERSHIP_SUBSCRIBE_URL` (use in app config or `NEXT_PUBLIC_*` if needed)

---

## Required for build and runtime

```bash
# Database – MySQL (required for build: sitemap prerender + runtime)
# Option A: same as requests / phpMyAdmin
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD="B)E6Nid3%V"
DB_NAME=6ure_requests

# Option B: single URL (password must be URL-encoded if it contains special chars)
# DATABASE_URL="mysql://root:PASSWORD@localhost:3306/6ure_requests"

# NextAuth + cookie signing (required for auth and wiki unlock)
AUTH_SECRET="your-secret-at-least-16-chars"
# or
NEXTAUTH_SECRET="your-secret-at-least-16-chars"

# Discord OAuth (required for login)
DISCORD_CLIENT_ID="948565930034749501"
DISCORD_CLIENT_SECRET="your-client-secret"

# Discord bot + guild (required for verify page + requests user sync)
DISCORD_BOT_TOKEN="your-bot-token"
DISCORD_GUILD_ID="1118862694980788276"

# Staff role for requests + wiki admin (required for staff features)
DISCORD_STAFF_ROLE_IDS="1153694643343597638"
```

---

## Optional but recommended

```bash
# Site URL (links, sitemaps, redirects)
NEXT_PUBLIC_SITE_URL="https://6ureleaks.com"

# Developer always admin (optional)
WIKI_DEVELOPER_DISCORD_ID="1352515058738925669"

# Requests user sync: Patreon premium role
DISCORD_PREMIUM_ROLE_ID="1415313760243159100"

# About page staff (Discord bot API)
REQUESTS_BOT_API_URL="http://localhost:3002"
# or
BOT_API_URL="http://localhost:3002"

# Logout redirect (defaults to NEXT_PUBLIC_SITE_URL in prod)
NEXT_PUBLIC_LOGOUT_REDIRECT_URL="https://6ureleaks.com"
```

---

## Optional (other features)

- **Password page:** `NEXT_PUBLIC_PASSWORD`, `NEXT_PUBLIC_PASSWORD_VIA`
- **Apply / contact email:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, or `RESEND_API_KEY`
- **Wiki unlock cookie:** uses `AUTH_SECRET` / `NEXTAUTH_SECRET`
- **Protected stats refresh (every 30 min):** set **`CRON_SECRET`** and call `GET /api/cron/refresh-protected-stats?key=YOUR_CRON_SECRET` from cron (e.g. `0,30 * * * * curl -s "https://yoursite.com/api/cron/refresh-protected-stats?key=YOUR_CRON_SECRET"`).

---

## Example .env (minimal for 6ureleaks.com, same DB as requests/phpMyAdmin)

```bash
# MySQL – same credentials as requests .env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD="B)E6Nid3%V"
DB_NAME=6ure_requests

AUTH_SECRET="kJfBVNMup5ftCzWKBFQR1OfOXJHV5VyaYoyQrXK2UDY="
NEXTAUTH_SECRET="kJfBVNMup5ftCzWKBFQR1OfOXJHV5VyaYoyQrXK2UDY="

DISCORD_CLIENT_ID=948565930034749501
DISCORD_CLIENT_SECRET=CCUlo5c_I4xG_5XemTasdRTvIkyxMT5W
DISCORD_BOT_TOKEN=OTQ4NTY1OTMwMDM0NzQ5NTAx.Gqqy35....
DISCORD_GUILD_ID=1118862694980788276
DISCORD_STAFF_ROLE_IDS=1153694643343597638

NEXT_PUBLIC_SITE_URL=https://6ureleaks.com
```

**Note:** `build-and-restart.sh` can sync `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, and `REQUESTS_BOT_API_URL` from `/var/www/requests.6ureleaks.com/.env` if that file still exists. You must set **DB_*** (or `DATABASE_URL`) and **AUTH_SECRET** (or `NEXTAUTH_SECRET`) yourself on the server.

**Tables in MySQL:** After the first run, create tables with `npx prisma db push` (or `npx prisma migrate dev` for a new MySQL migration). If you use the same database as the old requests app (`6ure_requests`), the integrated app uses tables like `User`, `Account`, `Session`, `Page`, `Category`, `requests_users`, `requests`, etc. Using a **new** database name (e.g. `6ure_wiki`) avoids conflicts with old tables.
