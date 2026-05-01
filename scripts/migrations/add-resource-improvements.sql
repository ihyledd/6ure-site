-- Resources System Overhaul - schema additions.
-- Adds payout-scoring columns, hidden/protected flags to resources_items,
-- and creates resource_comments, monthly_upload_snapshots, payout_pools tables.
-- Run manually: mysql -u user -p database < scripts/migrations/add-resource-improvements.sql

-- resources_items: new columns
ALTER TABLE resources_items
  ADD COLUMN price VARCHAR(50) DEFAULT NULL AFTER place_url,
  ADD COLUMN price_numeric DECIMAL(10,2) DEFAULT 0 AFTER price,
  ADD COLUMN file_size_bytes BIGINT DEFAULT 0 AFTER price_numeric,
  ADD COLUMN is_protected TINYINT(1) DEFAULT 0 AFTER counts_for_payout,
  ADD COLUMN hidden TINYINT(1) DEFAULT 0 AFTER is_protected;

ALTER TABLE resources_items
  ADD INDEX idx_discord_member (discord_member_id),
  ADD INDEX idx_hidden_status (hidden, status),
  ADD INDEX idx_protected (is_protected),
  ADD INDEX idx_price_numeric (price_numeric);

-- resource_comments
CREATE TABLE IF NOT EXISTS resource_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  user_avatar VARCHAR(500),
  body TEXT NOT NULL,
  is_deleted TINYINT(1) DEFAULT 0,
  is_pinned TINYINT(1) DEFAULT 0,
  is_staff_reply TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_resource (resource_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- monthly_upload_snapshots: frozen monthly performance per leaker.
-- `period` is YYYY-MM (year_month is a reserved word in modern MySQL).
CREATE TABLE IF NOT EXISTS monthly_upload_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  discord_member_id VARCHAR(255) NOT NULL,
  discord_member_name VARCHAR(255),
  period CHAR(7) NOT NULL,
  upload_count INT DEFAULT 0,
  total_downloads INT DEFAULT 0,
  total_views INT DEFAULT 0,
  total_filesize_bytes BIGINT DEFAULT 0,
  total_price_value DECIMAL(12,2) DEFAULT 0,
  raw_score DECIMAL(12,4) DEFAULT 0,
  normalized_share DECIMAL(8,6) DEFAULT 0,
  is_eligible TINYINT(1) DEFAULT 0,
  estimated_payout DECIMAL(10,2) DEFAULT 0,
  finalized TINYINT(1) DEFAULT 0,
  snapshotted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_member_period (discord_member_id, period),
  INDEX idx_period (period),
  INDEX idx_eligible (is_eligible)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- payout_pools: one row per month.
CREATE TABLE IF NOT EXISTS payout_pools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period CHAR(7) NOT NULL UNIQUE,
  total_pool DECIMAL(10,2) NOT NULL DEFAULT 0,
  mode ENUM('split','fixed') DEFAULT 'split',
  fixed_amount DECIMAL(10,2) DEFAULT NULL,
  min_uploads_required INT DEFAULT 12,
  finalized TINYINT(1) DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- users.tags: JSON column for protected and future tags
ALTER TABLE users ADD COLUMN tags JSON DEFAULT NULL;
