-- Add avatar_decoration column to users table for Discord avatar decoration (Nitro profile frames).
-- Run via: npm run migrate:avatar-decoration
-- Or manually: mysql -u user -p database -e "ALTER TABLE users ADD COLUMN avatar_decoration VARCHAR(255) NULL;"

ALTER TABLE users ADD COLUMN avatar_decoration VARCHAR(255) NULL;
