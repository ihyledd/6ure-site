# Requests data and schema (MySQL)

The **requests** feature is part of the main Next.js app and uses **MySQL** (same DB as the old standalone requests app). Staff and premium badges are driven by Discord roles and synced at login.

## Users table: `is_staff` and `roles`

The app expects the `users` table to have:

- **`roles`** – JSON or TEXT storing Discord role IDs (array). Updated at login and by the Discord bot on role change.
- **`patreon_premium`** – BOOLEAN, set from `DISCORD_PREMIUM_ROLE_ID` at login/sync.
- **`is_staff`** – BOOLEAN, set from `DISCORD_STAFF_ROLE_IDS` at login. If your table was created by the old requests app, it may not have this column.
- **`boost_level`** – INT (optional), server boost level for the “Server Boost” badge in the header; synced at login.

**If the column is missing**, add it and optionally backfill:

```sql
ALTER TABLE users ADD COLUMN is_staff BOOLEAN DEFAULT FALSE;
-- Optional: backfill from existing roles JSON (adjust STAFF_ROLE_ID to match DISCORD_STAFF_ROLE_IDS)
-- UPDATE users SET is_staff = (JSON_CONTAINS(roles, '"1153694643343597638"', '$') OR JSON_OVERLAPS(roles, '["1153694643343597638"]'));
```

Staff is also computed at read time from `users.roles` when `is_staff` is null, so the bot (which only updates `roles` and `patreon_premium`) does not need to write `is_staff`.

## Creator images

If the old app stored creator avatars under a different path, copy those files or adjust image URLs as needed.
