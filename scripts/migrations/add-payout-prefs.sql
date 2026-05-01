-- Round 2: payout preferences columns on users.
-- Run manually: mysql -u user -p database < scripts/migrations/add-payout-prefs.sql

ALTER TABLE users
  ADD COLUMN paypal_email VARCHAR(255) DEFAULT NULL,
  ADD COLUMN payout_method VARCHAR(20) DEFAULT 'paypal';
