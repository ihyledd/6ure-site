# Old Requests Site – Exhaustive Detail (section-by-section)

Use this document **together with** `REQUESTS-FEATURES-INVENTORY.md`. Work through **one part at a time** if needed (“do Part B next”, etc.). Each part aims to be as detailed as possible so the Node/Express app can be fully recreated in React/Next.js.

---

## How to use

- **Parts A–L** below: copy, API contracts, validation, helpers, dashboard fields, env, a11y, states, pages, DB, bot.
- Tick off or expand a part when done; say e.g. “do Part E (Dashboard)” to go deeper on that part only.

---

## Part A – Every user-facing string (copy)

### App shell
- Loading screen: logo `https://images.6ureleaks.com/logos/Untitled10.png`, alt "6ure Requests", text "Loading...".
- Main content blurred when settings open: class only; no extra text.

### Hero (home)
- Title: "Request **Premium Content**" (gradient on "Premium Content").
- Subtitle: "Request your most desired video editing packs, presets, templates and way more".
- Button: "Submit Request" / "Checking…" (when checking guild).

### Request form
- Form title: "Create New Request".
- Premium notice (when user has premium): "Your requests will be highlighted" + badge "⭐ Premium".
- Anonymous notice (when !user): "Please log in to submit a request. You can still submit anonymously to hide your name." + badge "🔒".
- Creator URL: label "Creator URL", placeholder "TikTok or YouTube only, e.g. tiktok.com/@user, vm.tiktok.com/..., youtube.com/@channel", small "TikTok or YouTube only".
- Product URL: label "Product URL", placeholder "https://example.com/product or any product page URL", small "Any valid product or page URL (http or https)".
- Duplicate alert: "A request for this product already exists." + "You can view or upvote the existing request instead." + button "View existing request".
- Toggle: "Submit anonymously" / "Your username won't be displayed on this request".
- Submit button: "Preview Request" / "Loading Preview...".
- Error/success: "Request created successfully!" (success); errors from API or "Please fill in both URLs", "Failed to preview request", etc.

### Guild invite popup
- Title (logged in): "Join our Discord server"; (not logged in): "Log in & join our Discord".
- Description (logged in): "You need to be a member of our Discord server to submit requests. Join once and you're all set."; (not logged in): "Log in with Discord and join our server to submit requests."
- Buttons: "Login with Discord", "Join Discord Server", "I've joined", "Not you? Log in again".
- Hint (when logged in): "After joining, click \"I've joined\" to continue."
- Close: aria-label "Close".
- All of the above can be overridden by site-settings popups (popup_discord_*).

### Preview modal
- Title: from popup_preview_title default "Review Your Request".
- Label: "Request Title *", hint popup_preview_title_hint "You can edit the title if it's incorrect", placeholder popup_preview_title_placeholder "Enter request title", maxLength 500.
- "Product Image" label; if no image: popup_preview_no_image "No image found for this page (OG/twitter:image)".
- "Price" label; value uses decodeHtmlEntities(price).
- "Description" label.
- "Links" label: Creator link (avatar + "Creator: …" or "Creator Profile (name not loaded)") + "Product Page".
- Anonymous badge: popup_preview_anonymous "🔒 This request will be submitted anonymously".
- Footer: popup_preview_btn_cancel "Cancel", popup_preview_btn_confirm "Confirm & Submit"; when loading popup_preview_creating "Creating...". When !user: popup_preview_login_required "Log in to submit this request."

### Premium upsell modal
- Title: popup_upsell_title "⭐ Upgrade to Premium".
- Message: popup_upsell_message "Get priority requests and extra features!"
- Bullets: popup_upsell_bullet1 "✨ Priority highlighting for your requests", bullet2 "🚀 Faster processing", bullet3 "🎨 Exclusive features".
- Buttons: popup_upsell_btn_skip "Maybe Later", popup_upsell_btn_upgrade "Upgrade Now".

### Leak modal
- Badge: popup_leaked_badge "Available".
- Message: popup_leaked_message "This resource is already available on our Discord Server. Click the button below to check it out."
- Button: popup_leaked_btn_open "Open in Discord", popup_leaked_btn_close "Close".
- No link: popup_leaked_no_link "Leak link not available."

### Protected modal
- Icon: FaLock.
- Title: popup_protected_title "Request Not Allowed".
- Message: dynamic (from API error); explanation popup_protected_explanation "Requests about this creator or content cannot be submitted. If you believe this is an error, please contact support."
- Button: popup_protected_btn "Understood".

### Request list
- Filter tabs: "All Requests", "Pending" (FaClock), "Completed" (FaCheckCircle).
- Sort label: "Sort by:"; buttons "Popular", "Recent", "Most Upvotes", "Price" with ↑/↓ when active. Title attributes for tooltips (e.g. "Newest first (click to reverse)").
- Search placeholder: "Search by title, description or creator name...".
- Empty state: same logo, "No requests found", "Be the first to submit a request!".
- Card: status tags "Pending" / "Available" / "Rejected" / "Cancelled", "Priority", "Locked" (FaLock). Staff delete: title "Delete request", confirm "Permanently delete this request? This cannot be undone.", prompts for reason and "Send Discord DM to requester? (yes/no)".
- Rescrape: "Updating..." or spinner when rescaping.
- Pagination: "Prev", "Next", "Page X of Y", "(Z total)". First/Last buttons with double chevrons; ellipsis "…" when needed.
- Login prompt (below list when !user): "Want to submit or interact?", "Login with Discord to submit requests, upvote, and comment", button "Login with Discord".

### Request detail
- Back: "Back to Requests" (FaArrowLeft).
- Loading: "Loading request...".
- Error: "Request not found", "The request you are looking for does not exist.", button "Back to Home".
- Status tags: same as list (Pending, Available, Rejected, Cancelled); Priority tag "Priority".
- "Requested by": author block or "Anonymous" with optional "⭐ Premium Member", "Staff" badge.
- "Statistics": "X Upvotes", "X Comments", "X Views".
- "Price": value with decodeHtmlEntities.
- "Links": Creator (avatar + name or "Creator Profile"), "Product Page", optional "View Leak on Discord" when completed + leak_message_url.
- Upvoters (staff): "Upvoters" with badge count; "Loading upvoters..."; "No upvoters yet."; each row: avatar, name (link to discord.com/users/:id), upvoted_at.
- Share: "Share", "Close"; "Link copied!"; Copy Link, WhatsApp, X (Twitter), LinkedIn, Telegram.
- "Download in Discord" (SiDiscord) when completed + leak_message_url.
- Cancellation (requester): "Request cancellation"; if rejected within 24h: "You can request cancellation again 24 hours after the last rejection." + "Staff reason: …".
- Cancel modal: popup_cancel_title "Request cancellation", popup_cancel_note "Staff must approve your cancellation. A reason is required.", placeholder popup_cancel_placeholder "Reason for cancellation...", popup_cancel_btn_cancel "Cancel", popup_cancel_btn_submit "Submit cancellation request", popup_cancel_submitting "Submitting...".
- Staff: "Approve cancellation", "Reject cancellation". Reject modal: "Reject cancellation", "Provide a reason for rejecting this cancellation request. The requester can try again after 24 hours.", placeholder "Reason for rejection (required)".
- Delete modal: "Delete request", "Permanently delete this request? … The requester will see an in-app notification; you can optionally send them a Discord DM and add a reason below.", placeholder "Reason for deletion (optional – shown to the requester)", checkbox "Send Discord DM to requester (regardless of their website settings)", "Cancel", "Delete request" / "Deleting...".
- Cancel pending (requester): "Cancellation requested - pending staff approval", "Reason: …".
- Cancel log: "Cancellation log", "Reason: …", "Cancelled by staff on …".
- Upvote: "Upvote" + count; disabled when completed/rejected/cancelled.
- Comments: "Comments (X)"; "Lock Comments" / "Unlock Comments"; "Comments are locked" when locked.

### Comments
- Empty: "No comments yet. Be the first to comment!".
- Reply: "Reply"; placeholder "Write a reply..."; char count "X/2000"; "Cancel", "Reply" / "Posting...".
- Delete: "Delete"; confirm "Are you sure you want to delete this comment?".
- Ban (staff): "Ban from comments". Ban modal: reason, duration (days); success "User banned from commenting for X days" / "User permanently banned from commenting".
- Cooldown: server returns cooldown_seconds; client shows countdown (e.g. "M:SS"); sessionStorage key `commentCooldown`.

### Header
- Logo alt: "6ure" (integrated) / "6ure Requests" (standalone).
- Nav: "Protected", "Membership", "FAQ"; integrated: "About", "Requests", "Wiki", "Password", Discord icon title "Discord" aria-label "Discord".
- User: display name (getDisplayName), badges "Staff", "⭐ Premium", "Boost" (when boost_level > 0). Dropdown: Settings, Your Requests, Dashboard (staff), Logout. Menu trigger aria-label "Menu", aria-expanded.
- Login: "Login with Discord".

### Settings modal
- Categories: Appearance (Theme), Requests (Submit anonymously by default), Notifications (Push notifications, Discord DMs, Comment reply DMs, Timezone, Date format).
- Theme options: Dark, Light, System. Description: "Choose between dark, light, or follow system preference".
- Anonymous: "When logged in, new requests will default to anonymous".
- Others: labels and toggles/inputs as in Settings.jsx; save on change (localStorage + POST /api/settings if user).

### Announcement bar
- Icon FaBullhorn; title and message from API (Markdown); close button (FaTimes). Dismiss stores announcement id in localStorage.

### Footer
- Integrated: "Sites" (Requests, Wiki, Password, Verify), "Community" (Discord, About), "Legal" (Privacy Policy, Terms, DMCA), "Contact" (Email). Copyright "© 2026 6ure. All rights reserved.", "Made with ❤️ by ihyledd".
- Standalone: "Platform" (Home, Protected, Membership, FAQ, Getting Discord access), "Account" (Your Requests) if user, "Contact", "Legal"; copyright "© 2026 6ure Requests...", "Made with ❤️ by tcmmi.ae".

### Your Requests
- !user: "Please log in to view your requests".
- Loading: "Loading your requests...".
- Empty: "You haven't submitted any requests yet" (or similar).
- Filters/sort; cards same structure as main list.

### FAQ
- Title "FAQ" or "Frequently Asked Questions"; staff see Edit/Add/Delete. Categories general / membership. Expand/collapse per item; __text__ → <u> in markdown.

### Membership
- Hero title/subtitle from site-settings membership_hero_title, membership_hero_subtitle. Premium/Protection cards: badge, card label, title, prices, old price, save label, CTA, warning, note, features list, join URL. PREMIUM_FEATURES and PROTECTION_FEATURES arrays (icons + text). FAQ block when show_faq; __ in markdown → <u>.

### Protected
- Title "Protected Creators" or similar; list from GET /api/protection/users. Each: avatar, display name, subscription_ends_at (formatSubscriptionDuration), social link, platform icon (TikTok/YouTube), follower_count (formatFollowers), video_count, likes_count, verified, creator_bio (formatBioLines), creator_bio_link. Flag emojis in bio parsed (parseBioWithFlags).

### Legal
- LEGAL_PAGES: privacy, terms, cookies, dmca. Each: title, tagline, badges[], contactTitle, lastUpdated, content (JSX with sections and ids for TOC). Privacy: "Privacy Policy", tagline "Transparent data practices...", badges ["Data Protection", "Privacy Rights", "Transparency"], TOC and sections (Who we are, Information we collect, etc.). Similar for terms, cookies, DMCA.

### Meta (document title & og/twitter)
- DEFAULT_TITLE "6ure Requests – Premium Content Request Platform", DEFAULT_DESCRIPTION "Discover and request premium video editing packs...", SITE_NAME "6ure Requests", DEFAULT_IMAGE logo URL.
- PAGE_META per path: /, /faq, /discord-access, /your-requests, /membership, /dashboard, /protected, /privacy, /terms, /cookies, /dmca (title "X · 6ure Requests", description).
- Request detail: buildRequestTitle(request) "Title (#id) · 6ure Requests", buildRequestDescription(request) (status, upvotes, views, creator, price, requester, description snippet), image request.image_url, url requestUrl, type "article".

---

## Part B – API contracts (request/response, errors)

### GET /api/auth/me
- Response 200: `{ authenticated: true, user: { id, username, avatar, guild_nickname, guild_avatar, isStaff, patreon_premium, boost_level, ... } }` or `{ authenticated: false }`.
- 429: rate limit (no body needed).

### GET /api/auth/in-guild
- 200: `{ inGuild: true }` or `{ inGuild: false }`.

### GET /api/requests
- Query: status, page, limit, search, sort (recent|oldest|upvotes|price|popular), order (asc|desc).
- 200: `{ requests: RequestData[], pagination: { page, limit, total, totalPages } }`. Each request: id, user_id, creator_url, product_url, title, description, image_url, price, status, upvotes, views, comments_locked, anonymous, created_at, updated_at, username, avatar, patreon_premium, is_staff, has_priority, comments_count, hasUpvoted (if auth).

### GET /api/requests/stats
- 200: `{ total, pending, completed, users }`. Cache-Control public max-age=30.

### GET /api/requests/:id
- 200: single RequestData + hasUpvoted if auth. 404 `{ error: "Request not found" }`. 400 invalid id.

### POST /api/requests/preview
- Body: `{ product_url, creator_url }`.
- 200: `{ title, description, image_url, price, creator_url, creator_name, creator_avatar, creator_platform }` or `{ leaked: true, leak: { name, place, discordMessageUrl, thumbnail } }`.
- 400: duplicate `{ error, duplicate: true, existingRequestId }`; invalid URL. 503: `{ error: "SCRAPE_API_KEY is not set..." }`.

### POST /api/requests
- Body: creator_url, product_url, title?, description?, image_url?, price?, anonymous?.
- 201: `{ id, message? }`. 400 validation errors. 401 "Please log in to submit a request...". 403 notInGuild `{ notInGuild: true }`, protected `{ protected: true, error }`. 409 leaked `{ leaked: true, leak }`. 429 daily limit `{ error: "Daily request limit reached. Try again tomorrow." }`.

### POST /api/requests/:id/cancel-request
- Body: `{ reason }`. 200. 400 "Only pending requests can be cancelled", "Cancellation already requested...", "You can request cancellation again 24 hours...", "A reason for cancellation is required". 403 "Only the original requester can request cancellation". 404.

### PATCH /api/requests/:id/cancel-approve
- Body: `{ action: "approve" }` or `{ action: "reject", rejection_reason: string }`. 400 "No cancellation requested...", "Invalid action. Use \"approve\" or \"reject\"." 404.

### DELETE /api/requests/:id
- Body: `{ reason?, sendDm?: boolean }`. 200. 404. 500.

### GET /api/comments/:requestId
- 200: array of comment objects (id, request_id, user_id, parent_id, content, created_at, updated_at, username, avatar, is_staff, patreon_premium).

### POST /api/comments/:requestId
- Body: `{ content, parent_id? }`. 201: comment object + `cooldown_seconds` (0 for staff). 400 "Comment content is required", "Comment must be 2000 characters or less", "Invalid parent comment". 403 banned `{ error, reason?, expires_at? }`. 404 "Request not found". 429 cooldown `{ error: "Please wait X minute(s) before...", cooldown_seconds }`.

### DELETE /api/comments/:commentId
- 200 `{ success: true }`. 403 "Not authorized to delete this comment". 404.

### GET /api/comments/ban/status
- 200: `{ banned: boolean, reason?, expires_at? }`.

### POST /api/upvotes/:requestId
- 200: toggles; response can be empty or updated count. 404 "Request not found".

### GET /api/upvotes/:requestId/status
- 200: `{ hasUpvoted: boolean }`.

### GET /api/notifications
- 200: array of `{ id, type, request_id, title, message, read, created_at, ... }`.

### POST /api/notifications/:id/read
- 200. 404 "Notification not found".

### POST /api/notifications/read-all
- 200.

### GET /api/settings
- 200: `{ theme, anonymous, push, discordDm, discordDmCommentReplies, timezone, dateFormat }`.

### POST /api/settings
- Body: any of the above keys (string values). 200.

### GET /api/settings/default
- 200: same shape; defaults for new users.

### GET/PUT /api/site-settings/membership
- GET 200: all membership_* keys. PUT body: key-value; 200 returns full membership.

### GET/PUT /api/site-settings/popups
- GET 200: all popup_* keys. PUT: key-value; 200 returns full popups.

### GET/PUT /api/site-settings/theme
- GET 200: theme_active, theme_winter_*. PUT: same; 200.

### GET/PUT /api/site-settings/embeds
- Staff only. GET/PUT embed_* keys.

### GET /api/announcements/active
- 200: single announcement `{ id, title, message, centered?, ... }` or null.

### GET/POST/PUT/DELETE /api/faqs
- GET ?category=general|membership. POST/PUT body: question, answer, order_index?, category. DELETE /:id.

### GET /api/protection/users
- 200: array of protected user objects.

### GET /api/leaks/check?url=
- 200: `{ leaked: false }` or `{ leaked: true, leak: { name, place, discordMessageUrl, thumbnail } }`. 400 "url query is required".

(Other routes: see main inventory; errors listed in Part C.)

---

## Part C – Validation rules & constants

### Comments
- COMMENT_COOLDOWN_MINUTES = 10. Staff skip cooldown. Cooldown stored in response and sessionStorage; client shows countdown.
- Max length: 2000 characters. Server 400 "Comment content is required", "Comment must be 2000 characters or less".
- parent_id: optional; must exist and belong to same request_id.

### Requests
- **creator_url**: required, valid URL (`validator.isURL` with http/https). TikTok or YouTube only (`isAllowedCreatorDomain`). Error strings: "Invalid creator URL", "Creator URL must be TikTok or YouTube only (e.g. tiktok.com/@user, vm.tiktok.com/..., youtube.com/@channel)".
- **product_url**: required, valid URL. **Payhip**: hostname `payhip.com` → path must match `/b/...` (direct product link). Error: "Please use the direct product link (e.g. https://payhip.com/b/ProductCode), not the shop or store page link." Other invalid URL: "Invalid product URL".
- All validation errors returned as single string: `validationErrors.join(', ')` in 400 body.
- title: from preview or body; max 500 in UI. description, image_url, price: from preview; optional.
- Duplicate: by canonical product URL. Leak check before create. Protection check (creator/product URL) before create.
- Daily limit: per user (e.g. rate limit); 429.

### Cancel request
- reason: required (trimmed). Only pending; only requester; not if already requested; not within 24h of reject.

### Reject cancellation
- rejection_reason: required.

### Username / display
- getDisplayName(username): strip after #, trim, remove trailing space+number.
- getCreatorDisplayName(creatorName, creatorUrl, creatorPlatform): TikTok use @username from URL; else creatorName.
- toProperCase: first letter each word upper, rest lower.
- decodeHtmlEntities: &#N;, &#xH;, &dollar;, &euro;, &pound;, &yen;, &amp;, &lt;, &gt;, &quot;.

### Dates
- formatDate(dateString): relative ("Just now", "Xm ago", "Xh ago", "Today", "Yesterday", "Xd ago", "Xw ago") when dateFormat === 'relative'; else short (DD/MM/YYYY) or long (weekday, day month year) or default (Mon DD, YYYY). Language from settings-language (en/de); locale en-US or de-DE.
- formatDateTime: full locale string (year, month, day, hour, minute).
- Relative strings (en): "Just now", "Xm ago", "Xh ago", "Today", "Yesterday", "Xd ago", "Xw ago". (de): "Gerade eben", "Vor X Min.", "Vor X Std.", "Heute", "Gestern", "Vor X Tagen", "Vor X Woche(n)".

---

## Part D – Helpers (display, meta, Protected)

- formatSubscriptionDuration(endsAt): "-" | "Ended Mon YYYY" | "X days left" | "Until Mon YYYY".
- formatFollowers / formatCount: null if 0; else 1.5M, 1.2K, etc.
- formatBioLines(bio): trim or null. parseBioWithFlags(bio): segments { type: 'text'|'flag', value|code } for flag emojis (regional indicators).
- buildRequestTitle(request): "Title (#id) · 6ure Requests". buildRequestDescription(request): status label, upvotes, views, creator/price, requester, description snippet truncated at word; max ~200 chars.
- getPageMetaForPath(pathname): from PAGE_META; url, image DEFAULT_IMAGE, type website, siteName, card summary.
- Avatar: userId, avatar, username, size, className; fallback to default avatar or initial.

---

## Part E – Dashboard (every form field)

*(Can expand per subsection: Membership, Popups, Theme, Embeds, FAQs, User settings, Announcements, Protection.)*

### Membership section
- Hero: hero_title (placeholder "Choose your membership"), hero_subtitle (placeholder "Short description…", rows 3).
- Toggles: discount_active (aria-pressed), show_faq ("Show FAQ section").
- Premium card: badge text (placeholder "Most popular"), card label ("Access to leaks"), card title ("Premium"), monthly price ("2.40"), yearly ("28.80"), old price monthly/yearly, save label monthly/yearly (placeholder "Leave blank to hide"), CTA text ("Join Premium"), warning note, note below CTA (rows 2, "To access all perks…"), join URL, features (one per line or JSON; placeholder "Feature 1").
- Protection card: same structure; placeholders "Your stuff at all cost", "Leak Protection", "6", "55", "Join Leak Protection", "Must open a ticket…", "By subscribing…", etc.
- Hint: "Old price and save label: leave blank to hide. Display order: old price → current price → save label."

### Popups section
- Discord: title logged in/not, description logged in/not (rows 2), Login button, Join button, "I've joined", "Not you? Log in again", hint, invite URL.
- Leaked: badge ("Available"), message (rows 2), Open button, Close button, no-link fallback.
- Protected: title, explanation (rows 2), button ("Understood").
- Preview: title, title hint, anonymous badge text, login required message, title placeholder, no-image placeholder, Cancel button, Confirm button, Creating… text.
- Upsell: title, message, bullet1/2/3, Skip, Upgrade, URL.
- Cancel: title, note, placeholder, Cancel button, Submit button, Submitting….
- Each card has "Preview" mockup where applicable.

### Theme section
- theme_active: default | winter. Winter options: theme_winter_snow_enabled, theme_winter_snow_intensity (number), theme_winter_frost_borders, theme_winter_blue_tint, theme_winter_snowflake_cursor, theme_winter_aurora_bg. THEMES array: id, name, description, icon, previewClass (dashboard-theme-card-preview-default, -winter).

### Embeds section
- Many embed_* keys (new request, comment reply, completed/rejected/leak/deleted DM, cancel requested/approved/rejected, etc.). Each card: title, description, color (0x hex), footer, footer_icon, author_name, author_icon, field names, image_enabled, thumbnail_enabled. EmbedPreview component for live preview.

### User settings (defaults)
- theme, anonymous, push, discordDm, discordDmCommentReplies, timezone, dateFormat. Scope: default | user (with userId) | all_users. Apply button to push defaults to users.

### FAQs section
- GET /api/faqs; list by category general | membership. Add/Edit: question, answer, order_index, category. Delete with confirm.

### Announcements section
- List; Add: title, message (required). Edit/Delete.

### Protection section
- Links list by group; enable/disable global and per group; add link/keyword (group name, value, type link|keyword); delete link; YAML file list and assign to group.

### Refresh embeds
- Button "Refresh all embeds (views & upvotes)"; POST refresh-all-embeds; poll refresh-all-embeds-status (total, processed, inProgress); Cancel POST refresh-all-embeds-cancel. Status token for load-balanced servers.

---

## Part F – Environment variables (full list & purpose)

- NODE_ENV, PORT (6969), SESSION_SECRET, FRONTEND_URL: server/session.
- DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, DISCORD_SERVER_ID: OAuth.
- GUILD_ID, DISCORD_BOT_TOKEN, DISCORD_REQUEST_CHANNEL_ID, DISCORD_LEAK_FORUM_ID, DISCORD_PREMIUM_LEAK_FORUM_ID, DISCORD_PREMIUM_ROLE_ID, DISCORD_STAFF_CHANNEL_ID, DISCORD_COMMENTS_CHANNEL_ID, DISCORD_STAFF_ROLE_IDS, DISCORD_NEW_REQUESTS_CHANNEL_ID, VITE_MEMBERSHIP_SUBSCRIBE_URL: bot and role sync.
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME: MySQL.
- SCRAPE_API_KEY, SCRAPE_API_URL: product/creator scrape (api.hlx.li).
- PROTECTION_FILE_PATH, PROTECTION_PROTECTED_PATH, LEAKS_DATA_PATH: protection file and YAML leaks path.
- CREATOR_AVATAR_REFRESH_INTERVAL_MS (default 2h). REQUEST_INFO_REFRESH_INTERVAL_MS (default 30 min). BOT_API_URL (e.g. http://localhost:3002) for embed update, comment reply, comment log.

---

## Part G – Accessibility

- Guild invite: role="dialog", aria-modal="true", aria-labelledby="guild-invite-title". Close button aria-label "Close".
- Header: logo aria-label "6ure Home" (integrated). Nav links aria-current="page" when active. Menu trigger aria-label "Menu", aria-expanded. Discord icon title "Discord" aria-label "Discord".
- Request list: filter/sort buttons; pagination buttons title "First page", "Previous page", etc.
- Request detail: share menu role="menu", options role="menuitem". Upvoters header aria-expanded.
- Back to top: aria-label "Back to top".
- Snow canvas: aria-hidden="true".
- Dashboard: toggles aria-pressed where applicable. Form labels associated with inputs.

---

## Part H – Loading / empty / error states (exact copy)

- App loading: "Loading...".
- Request list empty: "No requests found", "Be the first to submit a request!".
- Request detail loading: "Loading request...".
- Request detail error: "Request not found", "The request you are looking for does not exist.", "Back to Home".
- Your Requests !user: "Please log in to view your requests". Loading: "Loading your requests...".
- Comments empty: "No comments yet. Be the first to comment!".
- Upvoters loading: "Loading upvoters...". Empty: "No upvoters yet.".
- Share feedback: "Link copied!" (2s).
- Form: "Loading Preview...", "Creating...", "Checking…". Duplicate: "A request for this product already exists.", "View existing request". 429: "Daily request limit reached. Try again tomorrow."
- Comment cooldown: server message "Please wait X minute(s) before posting another comment."; client shows countdown.
- Ban: "You are not allowed to comment." (optional reason/expires_at).
- Cancel rejected: "You can request cancellation again 24 hours after the last rejection.", "Staff reason: …".
- Cancel pending: "Cancellation requested - pending staff approval".
- FAQ save error: "Failed to save FAQ. You may not have permission." Delete: "Are you sure you want to delete this FAQ?", "You do not have permission...", "Failed to delete FAQ. Please try again."
- Notification center: unread count badge; "Mark all read"; list with type-specific icons (FaCheckCircle, FaBan, FaTrash, FaExclamationCircle).

---

## Part I – Notifications (types, payloads, UI)

- Types: request_deleted, cancel_request (staff approve/reject from dropdown), leak, comment_reply, etc.
- GET /api/notifications: array of { id, type, request_id, title, message, read, created_at }.
- message: can contain markdown **bold** and [text](url); client renderMessage parses and renders links/bold.
- Mark read: POST /:id/read. Mark all: POST /read-all.
- Click: navigate to /request/:requestId; if cancel_request and staff, can approve/reject in dropdown (PATCH cancel-approve). Poll every 60s when user present.

---

## Part J – YourRequests, Membership, FAQ, Protected, Legal (full detail)

- **YourRequests**: GET /api/requests/user/:userId with page, limit, sort, status (all|pending|completed|rejected). Pagination; status filter; sort recent/oldest/upvotes. Cards same as main list; click to /request/:id. Login prompt when !user.
- **Membership**: GET /api/site-settings/membership; render hero (title, subtitle), premium card (badge, label, title, prices, old price, save label, CTA, warning, note, features parseFeaturesStr, join URL), protection card (same). Discount toggle; show_faq toggle. If show_faq, GET /api/faqs and filter category membership; accordion. formatSaveLabelDisplay for save labels. PREMIUM_FEATURES / PROTECTION_FEATURES icons + text. Staff can edit membership and FAQs inline (separate dashboard section).
- **FAQ**: GET /api/faqs (no category or category=general). Accordion; __ in markdown → <u>. Staff: Add/Edit/Delete with form (question, answer, order_index, category).
- **Protected**: GET /api/protection/users. List cards: avatar, display name, subscription_ends_at (formatSubscriptionDuration), social link (TikTok/YouTube icon), follower_count (formatFollowers), video_count, likes_count (formatCount), verified, creator_bio (formatBioLines; preserve newlines), creator_bio_link. parseBioWithFlags for flag emojis in bio. Empty state if none.
- **Legal**: LEGAL_PAGES[path]: privacy, terms, cookies, dmca. Each: title, tagline, badges, contactTitle, lastUpdated, content (full JSX with TOC nav aria-label "Table of contents", sections with ids). Links to same site /mailto. Legal.css for layout.

---

## Part K – Database columns (reference)

- **users**: id, username, discriminator, global_name, display_name, avatar, banner, accent_color, public_flags, premium_type, roles (JSON), patreon_premium, guild_nickname, guild_avatar, guild_tag, guild_badge, boost_level, premium_since, created_at, updated_at. (is_staff optional; can be derived from roles.)
- **requests**: id, user_id, creator_url, product_url, title, description, image_url, price, price_numeric, status, thread_id, message_id, public_message_id, leak_message_id, leak_message_url, upvotes, views, comments_locked, anonymous, creator_name, creator_avatar, creator_platform, cancel_requested_at, cancel_reason, cancel_approved_by, cancel_approved_at, cancel_rejected_at, cancel_rejection_reason, created_at, updated_at.
- **comments**: id, request_id, user_id, parent_id, content, created_at, updated_at.
- **upvotes**: user_id, request_id (composite primary).
- **notifications**: id, user_id, type, request_id, title, message, read, created_at.
- **site_settings**: key (VARCHAR 128 PK), value (TEXT).
- **comment_bans**: user_id, reason, expires_at?, created_by, created_at.
- **request_views**: (session/user scoped for view count).
- **announcements**: id, title, message, centered?, active?, start_date?, end_date?, created_at, updated_at.
- **faqs**: id, question, answer, order_index, category, created_at, updated_at.
- **protected_users**: user_id, subscription_ends_at, social_link, created_by, display_name, avatar_url, creator_name, creator_avatar, creator_platform, follower_count, video_count, likes_count, verified, creator_bio, creator_bio_link, created_at, updated_at.
- **Account, Session**: NextAuth (if shared DB).

---

## Part L – Bot (slash, DMs, events)

- **Slash /request**: list (status?, page?), view (id), user (user, page?), search (query, limit?), stats, recent (limit?), top (limit?, status?), voters (id), comments (id), complete (id, link?) [staff], reject (id) [staff], lock (id) [staff], unlock (id) [staff], mute (user, reason?, days?) [staff], unmute (user) [staff], delete (confirm "DELETE ALL") [admin], defaultsettings [staff].
- **Channels**: DISCORD_REQUEST_CHANNEL_ID (or NEW_REQUESTS), DISCORD_STAFF_CHANNEL_ID, DISCORD_COMMENTS_CHANNEL_ID. Leak forums: DISCORD_LEAK_FORUM_ID, DISCORD_PREMIUM_LEAK_FORUM_ID (post marks request completed).
- **DMs**: Completed, Rejected, Leak, Deleted, Cancel approved/rejected. Embed text from site-settings embeds. comment-reply DM when someone replies (if user setting discordDmCommentReplies).
- **Role sync**: On guildMemberUpdate (roles), update users.roles + patreon_premium in DB (updateUserRoles).
- **BOT_API_URL**: embed-update (views/upvotes), comment (new comment log), comment-reply (reply DM), refresh-all-embeds-status, etc.

---

---

## Part M – Edge cases & error recovery

- **Network failure during submit**: Show error toast/message; keep form state so user can retry. Do not close modal on 5xx.
- **Session expired mid-flow**: On 401 from any API, redirect to login or show “Session expired, please log in again”; optionally preserve intended action (e.g. callbackUrl).
- **Duplicate submit (double-click)**: Disable submit button and show “Creating...” until response; ignore second click.
- **Comment cooldown across tabs**: Cooldown stored in sessionStorage; if user posts from another tab, this tab’s countdown may be wrong until next fetch – optional: refetch ban/cooldown on focus.
- **Request deleted while viewing**: If GET /api/requests/:id returns 404 on detail page, show “Request not found” and “Back to Home”.
- **Pagination edge**: If total or totalPages is 0, hide pagination or show “Page 1 of 1”. Last page may have fewer than `limit` items.
- **Empty search**: Same empty state as no results: “No requests found”, “Be the first to submit a request!” (or “Try different filters”).
- **Scraper timeout / 503**: Show “Preview is temporarily unavailable. You can still submit with the URLs and edit later.” or retry once.
- **Protection block**: After protection check, show Protected modal with dynamic message; do not submit.
- **Leak detected on preview**: Show Leak modal with “Open in Discord” / “Close”; do not show preview modal.
- **Cancel request – already cancelled**: If staff approved/rejected between page load and click, 400 “No cancellation requested”; refresh request and hide cancel UI.
- **Avatar URL 404**: Use fallback (default avatar or initial letter). Optional: background job re-fetches and re-hosts (creatorAvatarRefresh).
- **Markdown / XSS in comments**: Sanitize or use safe markdown renderer; no raw HTML from users.
- **Very long title/description**: Truncate in list cards (e.g. 2 lines); full text on detail. OG description truncated at ~200 chars (buildRequestDescription).
- **Timezone invalid**: User setting timezone; if invalid, fallback to UTC or browser default for formatDate.

---

## Part N – CSS classes & structure (quick reference)

- **App**: `.app`, `.app-below-header`, `.header-spacer`, `.main-content`, `.blurred`, `.loading-screen`, `.loading-logo`, `.loading-spinner`, `.loading-text`.
- **Hero**: `.hero`, `.hero-title`, `.hero-subtitle`, `.hero-cta`, gradient on part of title.
- **Stats**: `.stats-bar`, `.stat-item`, `.stat-value`, `.stat-label`.
- **Request list**: `.request-list`, `.request-card`, `.request-card-image`, `.request-card-content`, `.request-card-title`, `.request-card-meta`, `.status-badge`, `.priority-badge`, `.filter-tabs`, `.sort-buttons`, `.search-input`, `.pagination`.
- **Request detail**: `.request-detail`, `.request-detail-header`, `.request-detail-stats`, `.request-detail-links`, `.upvoters-list`, `.share-menu`.
- **Modals**: `.modal-overlay`, `.modal`, `.modal-header`, `.modal-body`, `.modal-footer`, `.popup-preview-label`, `.popup-preview-input`, `.popup-preview-image-placeholder`, `.guild-invite-popup`, `.leak-modal`, `.protected-modal`.
- **Comments**: `.comments-section`, `.comment`, `.comment-avatar`, `.comment-content`, `.comment-reply`, `.comment-form`, `.comment-cooldown`.
- **Header**: `.header`, `.header-link`, `.ure-header-link`, `.active`, `.logo`, `.dropdown-avatar-badge`, `.staff-badge`, `.staff-badge-icon`.
- **Footer**: `.footer`, `.footer-links`, `.footer-copyright`.
- **Dashboard**: `.dashboard`, `.dashboard-section`, `.dashboard-form`, `.dashboard-btn`, `.dashboard-btn-primary`, `.dashboard-toggle-label`, `.embed-preview-*`, `.popup-preview-*`.
- **Your Requests**: `.your-requests-container`, `.your-requests-loading`, `.login-prompt`, `.status-badge` (with `--status-color`).
- **Membership**: `.membership-hero`, `.membership-card`, `.membership-features`, `.faq-accordion`.
- **Protected**: `.protected-list`, `.protected-card`, `.creator-bio`, flag segments.
- **Legal**: `.legal-lead`, `.legal-summary-box`, `.legal-toc`, `.legal-toc-title`.
- **Theme**: `.theme-dark`, `.theme-light`, `.theme-winter`; winter: `.snow-effect`, `.frost-border`, `.aurora-bg`, `.snowflake-cursor`.

---

## Part O – “Did we miss anything?” checklist

- [ ] **Cookie consent**: If the old site had a cookie banner, document copy and behaviour.
- [ ] **Analytics / tracking**: Any GA, GTM, or custom events (e.g. “request_created”, “comment_posted”).
- [ ] **Rate limit headers**: Does the API send Retry-After or X-RateLimit-*? Document for client retry/backoff.
- [ ] **Localization**: All copy in English (and some German in formatDate); any other languages or RTL?
- [ ] **Keyboard**: Tab order, Enter to submit forms, Escape to close modals – document expected behaviour.
- [ ] **Focus trap**: Modals should trap focus and return focus on close.
- [ ] **Print styles**: Any print-specific CSS or “Print” button?
- [ ] **Share targets**: Only Copy, WhatsApp, X, LinkedIn, Telegram – any others (e.g. Reddit, Email)?
- [ ] **Embed iframes**: Is the request detail page embeddable (e.g. oembed or iframe allowed)?
- [ ] **Webhooks**: Any outbound webhooks (e.g. on request completed) besides Discord/bot?
- [ ] **Backup/export**: User data export or “Download my data” flow?
- [ ] **Audit log**: Staff actions (delete, status change, ban) logged anywhere for audit?
- [ ] **Feature flags**: Any env or DB flags to toggle features (e.g. “disable comments site-wide”)?
- [ ] **Maintenance mode**: Any “Site under maintenance” page or header?
- [ ] **Redirects**: Old URLs (e.g. /request/:id vs /requests/:id) – document mapping for 301s.

Use this checklist to confirm nothing is left out when recreating the site.

---

*End of detailed inventory. To go deeper on a part, say e.g. "expand Part E (Dashboard) with every embed key" or "add more to Part M (edge cases)".*