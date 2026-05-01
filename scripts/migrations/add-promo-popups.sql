-- Promo popup banner (mid-screen modal for promotions).
-- Run manually when you want to use the popup builder feature.

CREATE TABLE IF NOT EXISTS promo_popups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT,
  image_url VARCHAR(1024) NULL,
  features TEXT NULL COMMENT 'JSON array of feature strings',
  cta_text VARCHAR(255) NULL,
  cta_url VARCHAR(1024) NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
