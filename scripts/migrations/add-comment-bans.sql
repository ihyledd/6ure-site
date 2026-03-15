-- Create comment_bans table for staff to ban users from commenting.
-- Run manually if table does not exist: mysql -u user -p database < add-comment-bans.sql

CREATE TABLE IF NOT EXISTS comment_bans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  reason TEXT,
  banned_by VARCHAR(20) NOT NULL,
  banned_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
