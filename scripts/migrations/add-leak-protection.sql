-- Add leak_protection column to users table for Leak Protection membership (Discord role 1283627752229961800).
-- Run manually: mysql -u user -p database < scripts/migrations/add-leak-protection.sql

ALTER TABLE users ADD COLUMN leak_protection TINYINT(1) NOT NULL DEFAULT 0;
