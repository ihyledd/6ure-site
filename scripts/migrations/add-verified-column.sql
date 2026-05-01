-- Add the `verified` flag to users so we can gate downloads on Discord guild verification.
-- Run manually: mysql -u user -p database < scripts/migrations/add-verified-column.sql

ALTER TABLE users ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 0;
