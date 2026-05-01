# Old Requests Site – Full Feature Inventory

Inventory of **all** features in the legacy requests app (`C:\Users\letab\6uresites\requests`) for parity when integrating into the new Next.js site. Categorized for easy reference.

**For exhaustive, section-by-section detail** (every string, API contract, validation rule, form field, env var, a11y, loading/error copy, DB columns, bot), see **`REQUESTS-FEATURES-INVENTORY-DETAILED.md`**. Work through it one part at a time (e.g. “do Part B next”) if needed.

---

## 1. Authentication & user

| Feature | Description | Where |
|--------|-------------|--------|
| Discord OAuth login | Login via Discord; redirect to `DISCORD_REDIRECT_URI` | `auth.js` GET `/discord`, `/discord/callback` |
| Session | Express session, file store in prod, cookie `6ure.sid`, 24h | `server/index.js` |
| Auth check | GET `/api/auth/me` returns user + `isStaff`, `patreon_premium`, etc. | `auth.js` |
| In-guild check | GET `/api/auth/in-guild` – user must be in Discord server to submit | `auth.js` |
| Logout | GET `/api/auth/logout` | `auth.js` |
| Staff from roles | Staff = user has any of `DISCORD_STAFF_ROLE_IDS` (from `users.roles` JSON) | `database.js`, `auth.js` |
| Premium from role | `patreon_premium` from `DISCORD_PREMIUM_ROLE_ID` in guild member | Sync at login |
| User sync on login | `syncRequestsUser`: upsert `users` (roles, patreon_premium, guild_nickname, guild_avatar, boost_level, etc.) | `sync-requests-user.ts` equivalent; old: `auth.js` + `database.js` |

---

## 2. Requests (CRUD, list, detail)

| Feature | Description | Where |
|--------|-------------|--------|
| List requests | GET `/api/requests` – status, page, limit, search, sort (recent/oldest/upvotes/price/popular), order | `requests.js` |
| Stats | GET `/api/requests/stats` – total, pending, completed, users (cached 30s) | `requests.js` |
| Single request | GET `/api/requests/:id` – record view (logged-in), add `hasUpvoted` | `requests.js` |
| Create request | POST `/api/requests` – creator_url, product_url, title, description, image_url, price, anonymous; protection + duplicate + leak checks; daily limit | `requests.js` |
| Preview (scraper) | POST `/api/requests/preview` – product_url + creator_url → title, description, image, price, creator name/avatar; duplicate + leak check before scrape | `requests.js` |
| Update status | PATCH `/api/requests/:id/status` – staff: set status (pending/completed/rejected) | `requests.js` |
| Delete request | DELETE `/api/requests/:id` – staff; body: reason, sendDm; notifies requester if sendDm | `requests.js` |
| Cancel request (user) | POST `/api/requests/:id/cancel-request` – requester requests cancellation with reason | `requests.js` |
| Cancel approve/reject (staff) | PATCH `/api/requests/:id/cancel-approve` – action approve/reject; reject needs rejection_reason | `requests.js` |
| User's requests | GET `/api/requests/user/:userId` – requests by user (auth) | `requests.js` |
| Record view | Per-request view count (per user/session); Discord embed view update via bot | `requests.js`, `database.js` |
| Rescrape | POST `/api/requests/:id/rescrape` – staff: re-run scraper for product/creator, update request | `requests.js` |
| Duplicate check | By canonical product URL before create/preview; 400 + existingRequestId | `requests.js`, `canonicalProductUrl.js` |
| Daily request limit | Per-user limit (e.g. rate limit); 429 response | `requests.js` |
| Payhip URL validation | Product URL must be direct product link (`/b/...`) not shop link | `requests.js` validateUrls |
| Creator URL validation | TikTok or YouTube only (vm.tiktok.com, youtu.be, etc.) | `requests.js`, `creator.js` |
| Upvoters list | GET `/api/requests/:id/upvoters` – staff only, paginated | `requests.js` |

---

## 3. Scraper & preview

| Feature | Description | Where |
|--------|-------------|--------|
| Product scrape | `scrapeProduct(url)` – SCRAPE_API_URL + SCRAPE_API_KEY (api.hlx.li); OG/twitter meta, fallback first content image, title, description, price; decode HTML entities | `scraper.js` |
| OG image only | `scrapeOgImageOnly(url)` – lightweight fetch for og:image only | `scraper.js` |
| Creator enrich | `enrichCreator(creatorUrl)` – TikTok/YouTube via api.hlx.li; name, avatar, platform, follower_count, etc. | `creator.js` |
| Creator domains | TikTok + YouTube only; vm.tiktok.com resolved to final URL | `creator.js` |
| YouTube thumbnail fallback | `getYouTubeThumbnailForUrl(productUrl)` when no image from scrape | `creator.js`, `requests.js` preview |
| Request info refresh (background) | Fill missing creator_avatar/creator_name/product title/description/image for requests created when scraper was down | `requestInfoRefresh.js`, runs periodically |
| Creator avatar refresh (background) | Check creator avatar URLs; if broken, re-fetch and re-host under `/uploads/creator-avatars/` | `creatorAvatarRefresh.js`, `server/index.js` |
| Canonical product URL | Normalize product URL for duplicate/leak checks | `canonicalProductUrl.js` |

---

## 4. Popups & modals (site-settings popups)

All strings configurable via dashboard → Popups. Keys in `site_settings` with `popup_` prefix.

| Popup | Keys (examples) | Used in |
|-------|------------------|--------|
| **Discord invite** | popup_discord_title_logged_in, popup_discord_title_not_logged_in, popup_discord_desc_*, popup_discord_btn_login, popup_discord_btn_join, popup_discord_btn_ive_joined, popup_discord_btn_not_you, popup_discord_hint, popup_discord_invite_url | GuildInvitePopup, RequestForm flow |
| **Already leaked** | popup_leaked_badge, popup_leaked_message, popup_leaked_btn_open, popup_leaked_btn_close, popup_leaked_no_link | RequestForm when product already in leaks |
| **Protected** | popup_protected_title, popup_protected_explanation, popup_protected_btn | RequestForm when protection blocks submit |
| **Preview (review request)** | popup_preview_title, popup_preview_title_hint, popup_preview_anonymous, popup_preview_login_required, popup_preview_title_placeholder, popup_preview_btn_cancel, popup_preview_btn_confirm, popup_preview_creating, popup_preview_no_image | RequestForm before confirm submit |
| **Premium upsell** | popup_upsell_title, popup_upsell_message, popup_upsell_bullet1/2/3, popup_upsell_btn_skip, popup_upsell_btn_upgrade, popup_upsell_url | RequestForm random chance (10–20%) for non-premium |
| **Cancel request** | popup_cancel_title, popup_cancel_note, popup_cancel_placeholder, popup_cancel_btn_cancel, popup_cancel_btn_submit, popup_cancel_submitting | RequestDetail cancel modal |

---

## 5. Dashboard (staff only)

Route: `/dashboard`. Sections via `?section=`.

| Section | Description | API |
|---------|-------------|-----|
| **Membership** | Membership page copy: hero, premium/protection cards, prices, CTAs, features, FAQs toggle, join URLs | GET/PUT `/api/site-settings/membership` |
| **Popups** | All popup copy (discord, leaked, protected, preview, upsell, cancel) | GET/PUT `/api/site-settings/popups` |
| **Announcements** | Create/edit/delete announcements; active one shown in AnnouncementBar | `/api/announcements` |
| **Protection** | Manage protection links/keywords, groups, YAML files, enable/disable | `/api/protection/*` |
| **Theme** | Site theme: default / winter; winter options: snow, frost borders, snowflake cursor, aurora bg, blue tint | GET/PUT `/api/site-settings/theme` |
| **Embeds** | Discord embed strings (new request, comment reply, completed/rejected/leak/deleted DM, cancel requested/approved/rejected, etc.) | GET/PUT `/api/site-settings/embeds` |
| **User settings (defaults)** | Default theme, anonymous, push, discordDm, discordDmCommentReplies, timezone, dateFormat for new users | Settings API default + apply |
| **FAQs** | CRUD FAQs; categories: general, membership | GET/POST/PUT/DELETE `/api/faqs` |
| **Refresh all embeds** | Button: update all Discord request embeds (views/upvotes) or repost missing; status poll; cancel | POST `/api/requests/refresh-all-embeds`, GET refresh-all-embeds-status, POST refresh-all-embeds-cancel |
| **Republish missing Discord logs** | Staff: repost Discord messages for requests that never got one | POST `/api/requests/republish-missing-discord-logs` |

---

## 6. Site settings (tables / API)

| Setting group | Storage | Endpoints |
|---------------|---------|-----------|
| Membership | `site_settings` keys `membership_*` | GET/PUT `/api/site-settings/membership` |
| Popups | `site_settings` keys `popup_*` | GET/PUT `/api/site-settings/popups` |
| Embeds | `site_settings` keys `embed_*` | GET/PUT `/api/site-settings/embeds` (staff) |
| Theme | `site_settings` keys `theme_*` | GET/PUT `/api/site-settings/theme` |

---

## 7. Protection system

| Feature | Description | Where |
|--------|-------------|--------|
| Protection file | JSON file at PROTECTION_FILE_PATH; protection_groups (keywords, links, enabled, etc.) | `protection.js` utils |
| Check on submit | Before create: check creator/product URL against protection links/keywords | `requests.js`, `checkRequestProtection` |
| Protected users list | Public list of users with Leak Protection (subscription_ends_at, social_link, creator info) | GET `/api/protection/users` |
| Staff: add/update/delete protected user | user_id, subscription_ends_at, social_link (TikTok/YouTube – enriched for name/avatar) | POST/PATCH/DELETE `/api/protection/users` |
| Staff: list protection links | By group; enabled state | GET `/api/protection/links` |
| Staff: enable/disable protection globally | PATCH `/api/protection/links/enabled` | |
| Staff: add link/keyword | POST `/api/protection/links` – groupName, link, type (keyword/link) | |
| Staff: delete link | DELETE `/api/protection/links/:id` | |
| Staff: group enable/disable | PATCH `/api/protection/links/group-enabled` | |
| Staff: YAML file per group | List YAMLs from PROTECTION_PROTECTED_PATH; assign to group | GET `/api/protection/links/yaml-files`, PATCH group-yaml |
| Protected page | Public page showing protected users (list from API) | `Protected.jsx` |
| Refresh protected followers | Background: refresh follower/video counts for protected users (sorting) | `refreshProtectedFollowers.js` |

---

## 8. Leaks integration

| Feature | Description | Where |
|--------|-------------|--------|
| Leaks data path | LEAKS_DATA_PATH – YAML files (Skript) | `leaksLoader.js` |
| Load leaks | Parse YAMLs; map product URL → leak info (name, place, discordMessageUrl, thumbnail, etc.) | `leaksLoader.js` |
| Check leak by product URL | Used in preview/create to block or show “already leaked” popup | `getLeakByProductUrl`, `requests.js` |
| GET leak check | GET `/api/leaks/check?url=...` – { leaked, leak? } | `leaks.js` |
| Sync requests to completed | On startup: for each leak, find request by product URL and set status completed + leak_message_url | `server/index.js` |

---

## 9. Comments

| Feature | Description | Where |
|--------|-------------|--------|
| List comments | GET `/api/comments/:requestId` | `comments.js` |
| Post comment | POST `/api/comments/:requestId` – content, parent_id (optional for reply) | `comments.js` |
| Comment cooldown | Server returns cooldown seconds; client shows countdown in UI + sessionStorage | Comments.jsx, comments route |
| Replies | Threaded: parent_id; expand/collapse replies | Comments.jsx |
| Staff: delete comment | DELETE `/api/comments/:commentId` | `comments.js` |
| Staff: lock/unlock | PATCH `/api/requests/:id/comments/lock` – comments_locked | `requests.js` |
| Comment ban (mute) | Staff: add/remove ban; list bans; user sees ban status and cannot post | `comments.js` GET/POST ban, DELETE ban/:userId; bot mute/unmute slash |
| Comment reply DM | When someone replies, DM to parent author (embed text from site-settings embeds) | Bot / backend |

---

## 10. Upvotes

| Feature | Description | Where |
|--------|-------------|--------|
| Toggle upvote | POST `/api/upvotes/:requestId` – add or remove | `upvotes.js` |
| Upvote status | GET `/api/upvotes/:requestId/status` – hasUpvoted | `upvotes.js` |
| Upvoters list | Staff: GET `/api/requests/:id/upvoters` | `requests.js` |

---

## 11. Notifications

| Feature | Description | Where |
|--------|-------------|--------|
| List | GET `/api/notifications` – for current user | `notifications.js` |
| Mark read | POST `/api/notifications/:id/read` | `notifications.js` |
| Mark all read | POST `/api/notifications/read-all` | `notifications.js` |
| Types | e.g. request_deleted, cancel_request, leak; title/body/link | NotificationCenter.jsx, backend createNotification |
| Polling | Every 60s when user logged in | App.jsx |
| Staff: cancel request | Notification links to request; staff can approve/reject from notification panel | NotificationCenter.jsx |

---

## 12. Announcements

| Feature | Description | Where |
|--------|-------------|--------|
| Active announcement | GET `/api/announcements/active` – one active (e.g. by date/priority) | `announcements.js` |
| Bar UI | Dismissible bar; title + message (Markdown); centered option; dismiss stored by id in localStorage | AnnouncementBar.jsx |
| Staff: CRUD | GET/POST/PUT/DELETE `/api/announcements` | `announcements.js` |

---

## 13. FAQ

| Feature | Description | Where |
|--------|-------------|--------|
| List (public) | GET `/api/faqs` – all FAQs (category: general, membership) | `faqs.js` |
| Staff: CRUD | POST/PUT/DELETE `/api/faqs`, PUT `/api/faqs/:id` | `faqs.js` |
| FAQ page | Public page rendering FAQs | FAQ.jsx |

---

## 14. User settings

| Feature | Description | Where |
|--------|-------------|--------|
| Get | GET `/api/settings` – theme, anonymous, push, discordDm, discordDmCommentReplies, timezone, dateFormat | `settings.js` |
| Save | POST `/api/settings` – same keys | `settings.js` |
| Defaults (public) | GET `/api/settings/default` – default values for new users | `settings.js` |
| Staff: apply defaults to all users | POST `/api/settings/apply` | `settings.js` |
| Staff: list users’ settings | GET `/api/settings/users` | `settings.js` |
| Settings modal | Theme (dark/light/system), anonymous default, push, Discord DMs, comment reply DMs, timezone, date format | Settings.jsx |
| Persist in localStorage | Keys like settings-theme, settings-anonymous-default, etc.; synced from API when logged in | App.jsx, Settings.jsx |

---

## 15. UI / UX

| Feature | Description | Where |
|--------|-------------|--------|
| Header | Logo, nav (Home, Protected, Membership, FAQ, Discord access; Your Requests if logged in; Dashboard if staff); user menu (avatar, name, Staff/Premium/Boost badges, Settings, Logout); Login with Discord | Header.jsx |
| Integrated header | When path starts with `/requests`: 6ure logo → About, Requests, Wiki, Password, Verify; same user menu | Header.jsx, App.jsx |
| Notification center | Bell icon; dropdown with unread/read; mark read / mark all read; staff: approve/reject cancel from list | NotificationCenter.jsx |
| Footer | Two variants: integrated (ure-footer) vs standalone; links: Sites, Community, Legal, Contact | App.jsx |
| Back to top | Button after scroll > 320px; smooth scroll to top | BackToTop.jsx |
| Snow effect | When site theme is winter and snow enabled; canvas snow; intensity from theme | SnowEffect.jsx |
| Theme (app) | data-theme (light/dark) from user setting or system | App.jsx, Settings.jsx |
| Site theme | data-site-theme (default/winter); winter: frost borders, snowflake cursor, aurora bg, blue tint classes | App.jsx fetchSiteTheme, Dashboard theme section |
| Loading screen | Logo + spinner + “Loading…” until defaults + auth + requests + stats + theme loaded | App.jsx |
| Meta tags | Per-route og/twitter title, description, image; request detail uses request title/description/image | metaTags.js, App.jsx, RequestDetail.jsx |
| Crawler meta | Server-side inject og/twitter into HTML for crawlers (request detail + static pages) | server/index.js, crawlerMeta utils |
| Request list | Cards: image, title, creator, status, upvotes, comments count, Staff/Premium badges; filter tabs (All/Pending/Completed); search; sort; pagination | RequestList.jsx |
| Request detail | Full request view; status tag; priority tag; upvote; comments; share (copy link, Discord, Twitter, etc.); staff: status change, lock comments, delete, cancel approve/reject, upvoters list | RequestDetail.jsx |
| Request form | Creator URL + Product URL; anonymous checkbox; Preview → preview modal (editable title) → Confirm; or Guild invite popup / Protected popup / Leaked popup / Premium upsell modal | RequestForm.jsx |
| Your Requests | Page listing current user’s requests | YourRequests.jsx |
| Membership page | Renders membership settings (hero, premium/protection cards, pricing, CTAs from site-settings) | Membership.jsx |
| Discord access page | How to get Discord access | DiscordAccess.jsx |
| Legal | Privacy, Terms, Cookies, DMCA – one Legal component, route by path | Legal.jsx |
| 404 | NotFound.jsx | |
| Lazy load | RequestDetail, Protected, YourRequests lazy-loaded | App.jsx |

---

## 16. Discord bot

| Feature | Description | Where |
|--------|-------------|--------|
| Slash command `/request` | list, view, user, search, stats, recent, top, voters, comments, complete, reject, lock, unlock, mute, unmute, delete, defaultsettings | bot/index.js |
| New request → channel | When request created, post to DISCORD_REQUEST_CHANNEL_ID (and/or DISCORD_NEW_REQUESTS_CHANNEL_ID); embed from site-settings | Bot |
| Staff channel | DISCORD_STAFF_CHANNEL_ID – e.g. cancel requested, embed updates | Bot |
| Comments channel | DISCORD_COMMENTS_CHANNEL_ID – comment activity | Bot |
| Leak forums | DISCORD_LEAK_FORUM_ID, DISCORD_PREMIUM_LEAK_FORUM_ID – when post in forum, mark request completed | Bot |
| Embed updates | When request view count or upvotes change, update Discord embed via BOT_API_URL | requests.js, bot |
| Refresh all embeds | Bot endpoint for bulk embed refresh (views/upvotes) | Bot |
| Role sync | On guild member update (roles), update users.roles + patreon_premium in DB | Bot |
| DMs | Completed, rejected, leak, deleted, cancel approved/rejected – embed text from site-settings | Bot / discordDm utils |
| Comment reply DM | Send DM when someone replies to a comment | Bot |

---

## 17. Background jobs (server)

| Job | Description | Where |
|-----|-------------|--------|
| Currency rates | Fetch EUR rates for price sort; every 6h | currencyRates.js, server/index.js |
| Protected followers refresh | Refresh follower counts for protected users; once at startup + periodic | refreshProtectedFollowers.js |
| Creator avatar refresh | Check/re-host broken creator avatars; interval CREATOR_AVATAR_REFRESH_INTERVAL_MS | creatorAvatarRefresh.js |
| Request info refresh | Fill missing creator/product info for requests; interval REQUEST_INFO_REFRESH_INTERVAL_MS | requestInfoRefresh.js |
| Load leaks | On startup; then sync request status from YAML leaks to completed | server/index.js, leaksLoader.js |

---

## 18. API routes summary

- **Auth:** `/api/auth` – discord, discord/callback, me, in-guild, logout  
- **Requests:** `/api/requests` – GET /, GET /stats, GET /refresh-all-embeds-status, GET /:id, GET /:id/upvoters, POST /preview, POST /, POST /:id/cancel-request, PATCH /:id/cancel-approve, DELETE /:id, POST /republish-missing-discord-logs, POST /refresh-all-embeds, POST /refresh-all-embeds-cancel, PATCH /:id/status, POST /:id/rescrape, GET /user/:userId, PATCH /:id/comments/lock  
- **Upvotes:** `/api/upvotes` – POST /:requestId, GET /:requestId/status  
- **Comments:** `/api/comments` – GET /ban/status, GET /bans/list, POST /ban, DELETE /ban/:userId, GET /:requestId, POST /:requestId, DELETE /:commentId  
- **Notifications:** `/api/notifications` – GET /, POST /:id/read, POST /read-all  
- **Faqs:** `/api/faqs` – GET /, POST /, PUT /:id, DELETE /:id  
- **Announcements:** `/api/announcements` – GET /active, GET /, POST /, PUT /:id, DELETE /:id  
- **Protection:** `/api/protection` – GET /users, POST /users, PATCH /users/:userId, DELETE /users/:userId, GET /links, PATCH /links/enabled, GET /links/yaml-files, PATCH /links/group-enabled, PATCH /links/group-yaml, POST /links, DELETE /links/:id  
- **Settings:** `/api/settings` – GET /default, GET /, POST /, POST /default (staff), GET /users (staff), POST /apply (staff)  
- **Site settings:** `/api/site-settings` – GET/PUT /membership, GET/PUT /popups, GET/PUT /embeds, GET/PUT /theme  
- **Leaks:** `/api/leaks` – GET /check?url=  

---

## 19. Environment variables (from .env.example)

- NODE_ENV, PORT, SESSION_SECRET, FRONTEND_URL  
- DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, DISCORD_SERVER_ID  
- GUILD_ID, DISCORD_BOT_TOKEN, DISCORD_REQUEST_CHANNEL_ID, DISCORD_LEAK_FORUM_ID, DISCORD_PREMIUM_LEAK_FORUM_ID, DISCORD_PREMIUM_ROLE_ID, DISCORD_STAFF_CHANNEL_ID, DISCORD_COMMENTS_CHANNEL_ID, DISCORD_STAFF_ROLE_IDS, DISCORD_NEW_REQUESTS_CHANNEL_ID, VITE_MEMBERSHIP_SUBSCRIBE_URL  
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME  
- SCRAPE_API_KEY, SCRAPE_API_URL  
- PROTECTION_FILE_PATH, PROTECTION_PROTECTED_PATH, LEAKS_DATA_PATH  
- CREATOR_AVATAR_REFRESH_INTERVAL_MS  
- (Implied: BOT_API_URL for embed refresh, REQUEST_INFO_REFRESH_INTERVAL_MS)

---

## 20. Pages / routes (client)

| Path | Component | Notes |
|------|-----------|--------|
| / | Main (hero, stats bar, request list, login prompt) | RequestForm + GuildInvitePopup modals |
| /request/:id | RequestDetail | Upvote, comments, share, staff actions |
| /faq | FAQ | |
| /discord-access | DiscordAccess | |
| /protected | Protected | Protected users list |
| /membership | Membership | From site-settings membership |
| /dashboard | Dashboard | Staff; section= membership, popups, announcements, protection, theme, embeds, user_settings, faqs |
| /your-requests | YourRequests | User’s own requests |
| /privacy, /terms, /cookies, /dmca | Legal | |
| * | NotFound | |

---

## 21. Database (MySQL)

- **users** – id, username, roles (JSON), patreon_premium, guild_nickname, guild_avatar, boost_level, premium_since, etc.  
- **requests** – id, user_id, creator_url, product_url, title, description, image_url, price, price_numeric, status, upvotes, views, comments_locked, anonymous, creator_name, creator_avatar, creator_platform, thread_id, message_id, leak_message_id, leak_message_url, cancel fields, etc.  
- **comments** – id, request_id, user_id, parent_id, content, created_at, updated_at  
- **upvotes** – user_id, request_id  
- **notifications** – id, user_id, type, request_id, title, message, read, etc.  
- **site_settings** – key, value (membership_*, popup_*, embed_*, theme_*)  
- **protected_users** – user_id, subscription_ends_at, social_link, creator info, etc.  
- **comment_bans** – user_id (mute list)  
- **request_views** – for view counting  
- **announcements** – id, title, message, active, start/end date, etc.  
- **faqs** – id, question, answer, category  
- **Account, Session** – NextAuth (if using same DB for wiki)  
- **_migrations** – for price_numeric etc.

---

## 22. Static assets & uploads

- **Re-hosted creator avatars** – served at `/uploads/creator-avatars/` (express.static); permanent URLs stored in DB.  
- **getAssetUrl(url)** – when app is under `/requests`, prepend `/requests` to relative asset URLs so they hit the right backend.

---

## 23. Rate limiting

- Auth endpoints: 50 / 15 min  
- Read-heavy: 10000 / 15 min for /api/requests, /api/notifications, /api/auth/me  
- General API: 1000 / 15 min  

---

## 24. Action → Reaction (every user interaction)

Every click, submit, and navigation so the Node/Express app can be fully recreated in React/Next.js.

### Home: Submit Request flow (exact sequence)

1. **User clicks "Submit Request"**  
   - If **no user**: `setShowInvitePopup(true)` → **GuildInvitePopup** opens (overlay + popup).  
   - If **user**: button shows "Checking…", `setCheckingGuild(true)`, GET `/api/auth/in-guild`.  
     - If **inGuild**: `setShowRequestForm(true)` → **RequestForm** opens as modal (overlay + form).  
     - If **not in guild** or request fails: `setShowInvitePopup(true)`.  
   - `setCheckingGuild(false)` in finally.

2. **GuildInvitePopup**  
   - **Overlay click** → `onClose()` → popup closes.  
   - **"Login with Discord"** (when not logged in) → redirect to `getApiUrl() + /auth/discord`.  
   - **"Join Discord Server"** → `window.open(inviteUrl, '_blank')`.  
   - **"I've joined"** (when logged in) → button shows "Checking…", parent calls GET `/api/auth/in-guild`; if inGuild → close popup, open RequestForm.  
   - **"Not you? Log in again"** → same as Login with Discord.  
   - Popup uses site-settings popups (GET `/api/site-settings/popups`) for all button/label text. Title and description differ for logged-in vs not.

3. **RequestForm (modal)**  
   - **Creator URL** input: placeholder "TikTok or YouTube only, e.g. tiktok.com/@user...". Small text: "TikTok or YouTube only".  
   - **Product URL** input: placeholder "https://example.com/product or any product page URL". On change: clear `duplicateExistingId`.  
   - **Submit anonymously** toggle: only when user present; default from `localStorage.getItem('settings-anonymous-default')`.  
   - **"Preview Request"** click:  
     - Validate both URLs; else setError('Please fill in both URLs').  
     - If user and !effectivePremium: 10–20% random → show **Premium upsell modal** (skip / upgrade), return.  
     - setPreviewLoading(true), POST `/api/requests/preview` { product_url, creator_url }.  
     - If 400 + duplicate: setDuplicateExistingId, setError, show **duplicate alert** with "View existing request" → on close navigate to `/request/:existingId`.  
     - If response leaked: setLeakInfo, **Leak modal** (Already available; Open in Discord / Close).  
     - Else: setPreviewData, setEditableTitle, **Preview modal** opens.  
   - **Preview modal**: Editable title (max 500), product image or "No image found", price, description, creator/product links, anonymous badge if checked. Buttons: Cancel (close preview), "Confirm & Submit" (disabled if !user or !editableTitle).  
   - **Confirm & Submit**: POST `/api/requests` with all fields. Success → setSuccess(true), close modal, clear form, 2s later onRequestCreated() (parent refetches list + stats). 403 notInGuild → close form, show invite popup. 403 protected → **Protected modal** (Understood). 409 leaked → Leak modal. 429 → daily limit error.  
   - **Premium upsell**: "Maybe Later" → close upsell, run same preview again. "Upgrade Now" → open popup_upsell_url in new tab.  
   - **Leak modal**: "Open in Discord" → link to leakInfo.discordMessageUrl. "Close" → close modal.  
   - **Protected modal**: "Understood" → close.  
   - **Form close** (X or overlay) → onClose(); if onNotInGuild was triggered, parent shows invite popup.

### Home: List, filter, sort, search, pagination

- **Filter tabs** "All Requests" | "Pending" | "Completed": `onFilterChange` → parent setFilter, fetchRequests(1, searchQuery, sortBy, sortOrder). Active tab has class `active`.  
- **Sort buttons** Popular | Recent | Most Upvotes | Price: same sort click toggles asc/desc; else set sort + DEFAULT_ORDER. Parent setSortBy, setSortOrder, fetchRequests(1, ...).  
- **Search**: Debounced 400ms; placeholder "Search by title, description or creator name...". Parent setSearchQuery, fetchRequests(1, q, sortBy, sortOrder).  
- **Request card**: Click → `navigate('/request/' + request.id)`. Upvote / Comments / links use `e.stopPropagation`.  
- **Upvote on card**: POST `/api/upvotes/:requestId`; optimistic flip hasUpvoted and upvotes; on error revert. Button class `upvoted` when hasUpvoted. Disabled when !user or status completed/rejected.  
- **Staff delete on card**: confirm, prompt reason, prompt send DM yes/no, DELETE `/api/requests/:id` { reason, sendDm }, onUpdate().  
- **Pagination**: First / Prev / page numbers (1 ... range ... total) / Next / Last. onPageChange(page) → fetchRequests(page), scrollTo(0). Disable at boundaries.

### Request detail page

- **Load**: GET `/api/requests/:id`, GET `/api/upvotes/:id/status` if user, setMetaTags, load popups.  
- **Back to Requests** → navigate('/').  
- **Upvote**: Same optimistic POST; disabled when completed/rejected/cancelled.  
- **Share**: Toggle menu; Copy Link (clipboard + "Link copied!" 2s), WhatsApp, Twitter, LinkedIn, Telegram (each `window.open` with built URL).  
- **Upvoters (staff)**: Toggle panel; GET `/api/requests/:id/upvoters?limit=10000`; list avatar, name (link to discord.com/users/:id), upvoted_at.  
- **Request cancellation (requester)**: Button opens cancel modal. If rejected in last 24h: show message + staff reason, no button. Modal: textarea reason (required), Submit → POST cancel-request, close, fetchRequest, onUpdate.  
- **Staff approve/reject cancellation**: Approve → PATCH cancel-approve { action: 'approve' }, then navigate('/'). Reject → open reject modal, textarea reason, PATCH { action: 'reject', rejection_reason }.  
- **Staff delete**: Delete modal with reason textarea and "Send Discord DM" checkbox; DELETE request; navigate('/').  
- **Lock/Unlock Comments**: PATCH comments/lock { locked }; fetchRequest, onUpdate.  
- **Comments**: Submit POST; cooldown from response, stored in sessionStorage; Reply toggles inline form with parent_id; Delete confirm + DELETE; Staff Ban opens ban modal, POST ban.

### Header

- **Logo**: navigate('/') or href="/" when integrated.  
- **Nav links**: Link to path; class `active` when isActive(path). Mobile: same in dropdown; click closes menu.  
- **User menu**: Hover (desktop) or click opens dropdown; 200ms delay on mouse leave; click outside closes. Mobile: body overflow hidden while open.  
- **Dropdown**: Settings → setMenuOpen(false), onOpenSettings(). Your Requests / Dashboard (staff) / Logout → link or GET logout, close menu.  
- **Notifications**: Bell opens dropdown; mark read on item click; "Mark all read"; staff can approve/reject cancel from list and navigate to request.

### Other

- **Settings modal**: Theme (dark/light/system), anonymous default, push, discordDm, comment reply DM, timezone, date format. Each change: localStorage + POST `/api/settings` if user. Close → setSettingsOpen(false). Main gets class `blurred` when open.  
- **AnnouncementBar**: Dismiss → localStorage `dismissedAnnouncement` = announcement.id, setDismissed(true). Bar hidden when no active or dismissed.  
- **Back to top**: Visible when scrollY > 320; click smooth scroll to top.

---

## 25. Design & CSS (layout, classes, states)

- **App:** `.app` → `.app-below-header` (`.header-spacer`, AnnouncementBar, Settings, Routes), footer, BackToTop, SnowEffect. Loading: `.loading-screen`, `.loading-logo`, `.loading-spinner`, `.loading-text`. Main: `.main-content`, `.blurred` when settings open.  
- **Hero:** `.hero`, `.hero-logo`, `.hero-logo-image`, `.hero-title`, `.gradient-text`, `.hero-subtitle`, `.btn-submit-request`.  
- **Stats:** `.stats-bar`, `.stats-bar-inner`, `.stat-card` (total/pending/completed/users), `.stat-card-icon`, `.stat-card-value`, `.stat-card-label`.  
- **Request list:** `.request-list-container`, `.filters-section`, `.filter-tabs`, `.filter-tab.active`, `.sort-options`, `.sort-btn.active`, `.search-section`, `.search-input`, `.requests-grid`, `.request-card` (+ `.premium`, `.completed`, `.priority`), `.request-image-wrapper`, `.request-image`, `.image-overlay`, `.request-image-placeholder`, `.placeholder-icon`, `.request-content`, `.request-tags`, `.request-tag`, `.request-tag-priority`, `.request-tag-locked`, `.request-card-delete`, `.request-title`, `.rescrape-indicator`, `.request-description`, `.request-price-box`, `.request-footer`, `.request-meta-row`, `.request-author-info`, `.request-author`, `.staff-badge-inline`, `.premium-indicator`, `.anonymous-avatar`, `.request-date`, `.request-links-row`, `.request-link-btn`, `.request-creator-link`, `.request-creator-avatar`, `.btn-leak`, `.request-actions`, `.btn-upvote.upvoted`, `.request-views`, `.btn-comments`, `.empty-state`, `.pagination`, `.pagination-btn`, `.pagination-nav`, `.pagination-num.active`, `.pagination-ellipsis`, `.pagination-info`.  
- **Request form:** `.request-form-container`, `.request-form-overlay`, `.request-form`, `.form-group`, `.toggle-label`, `.alert`, `.alert-duplicate`, `.btn-view-existing`. Preview: `.preview-modal-overlay`, `.preview-modal`, `.preview-modal-header`, `.preview-modal-close`, `.preview-section`, `.preview-title-input`, `.preview-image-container`, `.preview-image-placeholder`, `.preview-links`, `.preview-anonymous-badge`, `.preview-modal-footer`, `.btn-preview-cancel`, `.btn-preview-confirm`. Upsell: `.premium-upsell-overlay`, `.premium-upsell-modal`, `.premium-upsell-skip`, `.premium-upsell-upgrade`. Leak: `.leak-modal-overlay`, `.leak-modal-box`, `.leak-modal-header-badge`, `.leak-modal-close`, `.leak-modal-message`, `.leak-modal-card`, `.leak-modal-thumb`, `.btn-leak-discord`, `.btn-leak-close`. Protected: `.protected-modal-overlay`, `.protected-modal`, `.protected-modal-icon`, `.protected-modal-explanation`.  
- **Guild invite:** `.guild-invite-overlay`, `.guild-invite-popup`, `.guild-invite-close`, `.guild-invite-glow`, `.guild-invite-icon`, `.guild-invite-title`, `.guild-invite-desc`, `.guild-invite-actions`, `.guild-invite-btn` (primary/secondary/tertiary/link), `.guild-invite-hint`; role="dialog", aria-modal, aria-labelledby.  
- **Request detail:** `.request-detail-container`, `.loading-state`, `.error-state`, `.btn-back`, `.request-detail-card` (+ `.premium`, `.completed`, `.cancelled`, `.priority`), `.detail-image-wrapper`, `.detail-image-placeholder`, `.detail-tags`, `.detail-tag`, `.detail-tag-priority`, `.detail-header`, `.detail-title`, `.detail-date`, `.detail-description`, `.detail-info-grid`, `.info-card`, `.info-label`, `.info-value`, `.author-info-large`, `.staff-badge-inline`, `.premium-tag`, `.stat-item`, `.detail-link-btn`, `.detail-creator-avatar`, `.leak-link`, `.info-card-upvoters`, `.upvoters-header`, `.upvoters-body`, `.upvoters-list`, `.upvoter-item`, `.info-card-share`, `.detail-share-trigger`, `.detail-share-feedback`, `.detail-share-menu`, `.detail-share-option`, `.leak-access-section`, `.btn-leak-large`, `.detail-cancel-request-section`, `.btn-cancel-request`, `.detail-cancel-pending-section`, `.detail-cancel-staff-actions`, `.btn-cancel-approve`, `.btn-cancel-reject`, `.detail-delete-section`, `.btn-delete-request`, `.detail-actions`, `.btn-upvote-large.upvoted`, `.comments-section`, `.btn-lock-comments.locked`, `.comments-locked-notice`. Modals: `.cancel-request-modal-overlay`, `.cancel-request-modal`, `.cancel-modal-note`, `.cancel-reason-input`, `.cancel-modal-actions`, `.btn-cancel-modal-cancel`, `.btn-cancel-modal-submit`, `.btn-cancel-reject`, `.delete-dm-requester-label`.  
- **Comments:** `.comments-container`, `.comments-list`, `.comments-empty`, `.comment-thread`, `.comment`, `.comment-reply`, `.comment-avatar`, `.comment-content`, `.comment-header`, `.comment-username`, `.comment-time`, `.comment-text`, `.comment-actions`, `.comment-reply-btn`, `.comment-delete`, `.comment-ban-btn`, `.comment-reply-form`, `.comment-form-input`, `.comment-char-count`, `.comment-reply-cancel`, `.comment-submit`, `.comment-replies-wrap`, `.comment-view-replies-btn`; cooldown display; sessionStorage `commentCooldown`.  
- **Header:** `.header`, `.header-menu-open`, `.header-content`, `.logo`, `.ure-logo`, `.header-nav`, `.header-link`, `.ure-header-link`, `.active`, `.user-section`, `.notification-wrapper`, `.user-menu-wrapper`, `.user-menu-trigger`, `.user-info`, `.user-avatar`, `.user-name`, `.staff-badge`, `.premium-badge`, `.header-hamburger`, `.user-dropdown-backdrop`, `.user-dropdown-menu`, `.dropdown-mobile-nav`, `.dropdown-divider`, `.dropdown-header`, `.dropdown-avatar-wrapper`, `.dropdown-avatar`, `.dropdown-avatar-badge`, `.dropdown-username`, `.guild-boost-tag`, `.dropdown-items`, `.dropdown-item`, `.dropdown-item-danger`, `.btn-login`; createPortal(headerContent, document.body).  
- **Announcement:** `.announcement-bar`, `.announcement-bar-centered`, `.announcement-content`, `.announcement-icon`, `.announcement-text`, `.announcement-close`; Markdown __text__ → <u>.  
- **Footer:** `.ure-footer`, `.app-footer`, `.ure-footer-content`, `.ure-footer-brand`, `.ure-footer-links`, `.ure-footer-column`; or standalone `.footer-content`, `.footer-links`, etc.  
- **Back to top:** `.back-to-top`, `.back-to-top-visible` (scrollY > 320). **Snow:** `.snow-canvas` when theme winter + snow enabled.  
- **Status tags:** `.detail-tag` / `.request-tag` with --tag-color: pending #f59e0b, completed #10b981, rejected #ef4444, cancelled #6b7280. Labels: Pending, Available, Rejected, Cancelled. Priority: `.request-tag-priority`, #fbbf24. Locked: `.request-tag-locked`.

---

## 26. Not yet fully enumerated

- **RequestDetail:** Staff status change UI (Mark Complete / Reject) may be via bot or API only; confirm if any in-page control.  
- **Dashboard:** Every single embed form field label and placeholder.  
- **Bot:** Full list of slash subcommands and DM templates.  
- **Database:** All columns and indexes for every table.  

Say “continue” if you want this inventory extended (e.g. full embed keys, full DB schema, or per-file line references).
