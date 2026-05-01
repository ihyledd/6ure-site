-- Add premium promo fields to announcements (discount % and end date).
-- Run manually: mysql -u user -p database < scripts/migrations/add-announcements-premium-promo.sql

ALTER TABLE announcements
  ADD COLUMN discount_percent INT NULL COMMENT 'e.g. 20 for 20% off',
  ADD COLUMN ends_at DATE NULL COMMENT 'Promo end date for display';
