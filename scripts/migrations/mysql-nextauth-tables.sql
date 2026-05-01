-- NextAuth tables for MySQL (User, Account, Session, VerificationToken).
-- Run this if User/Account/Session are missing (e.g. after migrating from Prisma/PostgreSQL).
-- Use same database as requests (DB_NAME, e.g. 6ure_requests).

-- User table (NextAuth adapter)
CREATE TABLE IF NOT EXISTS `User` (
  id VARCHAR(25) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NULL,
  email VARCHAR(255) NULL UNIQUE,
  emailVerified DATETIME(3) NULL,
  image TEXT NULL,
  passwordHash TEXT NULL,
  role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Account table (OAuth providers)
CREATE TABLE IF NOT EXISTS `Account` (
  id VARCHAR(25) NOT NULL PRIMARY KEY,
  userId VARCHAR(25) NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  providerAccountId VARCHAR(255) NOT NULL,
  refresh_token TEXT NULL,
  access_token TEXT NULL,
  expires_at INT NULL,
  token_type VARCHAR(255) NULL,
  scope TEXT NULL,
  id_token TEXT NULL,
  session_state VARCHAR(255) NULL,
  UNIQUE KEY Account_provider_providerAccountId (provider, providerAccountId),
  CONSTRAINT Account_userId_fkey FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session table
CREATE TABLE IF NOT EXISTS `Session` (
  id VARCHAR(25) NOT NULL PRIMARY KEY,
  sessionToken VARCHAR(255) NOT NULL UNIQUE,
  userId VARCHAR(25) NOT NULL,
  expires DATETIME(3) NOT NULL,
  CONSTRAINT Session_userId_fkey FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VerificationToken table (password reset etc.)
CREATE TABLE IF NOT EXISTS `VerificationToken` (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires DATETIME(3) NOT NULL,
  UNIQUE KEY VerificationToken_identifier_token (identifier, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
