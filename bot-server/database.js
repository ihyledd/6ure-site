const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

/** Format a DATE value as YYYY-MM-DD without timezone shift. MySQL DATE is often returned as local midnight; toISOString() would shift the day in non-UTC servers. */
function formatDateOnly(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim().slice(0, 10) || null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse price string to number. Returns { value, currency } or null. Currency: USD, EUR, GBP, AUD, CAD, etc. */
function parsePriceAndCurrency(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') return null;
  const raw = priceStr.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  let currency = 'USD';
  if (upper.includes('€') || /\bEUR\b/.test(upper) || raw.includes('€')) currency = 'EUR';
  else if (upper.includes('£') || /\bGBP\b/.test(upper) || raw.includes('£')) currency = 'GBP';
  else if (/\bA\$|AUD\b/.test(upper) || /A\s*\$/.test(raw)) currency = 'AUD';
  else if (/\bC\$|CAD\b/.test(upper) || /C\s*\$/.test(raw)) currency = 'CAD';
  else if (/\bCHF\b/.test(upper) || raw.includes('CHF')) currency = 'CHF';
  else if (/\bJPY\b|\b¥\s*\d|¥\d/.test(upper) || (raw.includes('¥') && !raw.includes('A¥'))) currency = 'JPY';
  else if (/\bMXN\b|MX\$/.test(upper) || raw.includes('MX$')) currency = 'MXN';
  else if (/\bBRL\b|R\s*\$/.test(upper) || raw.includes('R$')) currency = 'BRL';
  else if (/\bINR\b|₹/.test(upper) || raw.includes('₹')) currency = 'INR';
  else if (/\bPLN\b|zł/.test(upper) || raw.includes('zł')) currency = 'PLN';
  else if (/\bSEK\b|kr\b/.test(upper)) currency = 'SEK';
  else if (/\bNOK\b/.test(upper)) currency = 'NOK';
  else if (/\bDKK\b/.test(upper)) currency = 'DKK';
  else if (/\bUSD\b/.test(upper) || (raw.includes('$') && !/\bA\$|AUD|C\$|CAD|R\$|BRL|MX\$|MXN/.test(upper))) currency = 'USD';
  let s = raw;
  try {
    s = s.replace(/\p{Sc}/gu, '');
  } catch (_) {
    s = s.replace(/[\s€$£¥₹₽₩₪₺₴₸₦₱฿₫﷼₵₲￠￡￥]+/g, '');
  }
  s = s.replace(/^\s*[A-Za-z]{2,3}\s*/i, '').replace(/\s*[A-Za-z]{2,3}\s*$/i, '');
  const currencyWords = /\s*(zł|kr|Ft|lei|pesos?|dollars?|pounds?|euros?|reais?|rand|francs?|yuan|yen|rupees?|baht|won|ringgit|rupiah|liras?|dinars?|riyals?|shekels?|dirhams?)\s*/gi;
  s = s.replace(currencyWords, '');
  let cleaned = s.replace(/[^\d.,]/g, '').replace(/\s/g, '');
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    cleaned = lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  } else if (lastComma > -1) {
    const afterComma = cleaned.length - lastComma - 1;
    cleaned = afterComma === 2 ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  }
  const num = parseFloat(cleaned, 10);
  return Number.isFinite(num) ? { value: num, currency } : null;
}

const { getRateToEur } = require('./utils/currencyRates');

/** Parse price string and return value in EUR for sorting (VDS Frankfurt). UI always shows original price. */
function getPriceInEur(priceStr) {
  const parsed = parsePriceAndCurrency(priceStr);
  if (!parsed) return null;
  const rate = getRateToEur(parsed.currency);
  const eur = parsed.value * rate;
  return Number.isFinite(eur) ? Math.round(eur * 100) / 100 : null;
}

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || '6ure_requests',
      waitForConnections: true,
      connectionLimit: 40,
      queueLimit: 0
    });
  }
  return pool;
};

const initialize = async () => {
  const pool = getPool();
  
  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(20) PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      discriminator VARCHAR(4),
      global_name VARCHAR(255),
      display_name VARCHAR(255),
      avatar VARCHAR(255),
      banner VARCHAR(255),
      accent_color INT,
      public_flags INT DEFAULT 0,
      premium_type INT DEFAULT 0,
      roles JSON,
      patreon_premium BOOLEAN DEFAULT FALSE,
      guild_nickname VARCHAR(255),
      guild_avatar VARCHAR(255),
      guild_tag VARCHAR(10),
      guild_badge VARCHAR(255),
      boost_level INT DEFAULT 0,
      premium_since TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Add avatar_decoration to users if missing (used by Next.js requests API)
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_decoration'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE users ADD COLUMN avatar_decoration VARCHAR(255) NULL`);
    }
  } catch (error) {
    console.log('Migration note (users.avatar_decoration):', error.message);
  }

  // Create requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NULL,
      creator_url TEXT NOT NULL,
      product_url TEXT NOT NULL,
      title VARCHAR(500),
      description TEXT,
      image_url TEXT,
      price VARCHAR(100),
      status ENUM('pending', 'completed', 'rejected') DEFAULT 'pending',
      thread_id VARCHAR(20),
      message_id VARCHAR(20),
      leak_message_id VARCHAR(20),
      leak_message_url TEXT,
      upvotes INT DEFAULT 0,
      views INT DEFAULT 0,
      comments_locked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_user_id (user_id),
      INDEX idx_product_url (product_url(255)),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  
  // Add new columns to existing requests table if they don't exist
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'requests' 
      AND COLUMN_NAME = 'price'
    `);
    if (columns.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN price VARCHAR(100) DEFAULT NULL`);
    }
  } catch (error) {
    console.log('Migration note (price):', error.message);
  }
  try {
    const [colsPriceNum] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'price_numeric'
    `);
    if (colsPriceNum.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN price_numeric DECIMAL(10,2) NULL DEFAULT NULL`);
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (name VARCHAR(100) PRIMARY KEY)
    `);
    const [done] = await pool.query(`SELECT 1 FROM _migrations WHERE name = 'price_numeric_usd' LIMIT 1`);
    if (done.length === 0) {
      const [rows] = await pool.query('SELECT id, price FROM requests WHERE price IS NOT NULL AND price != ""');
      for (const row of rows) {
        const eur = getPriceInEur(row.price);
        if (eur != null) {
          await pool.query('UPDATE requests SET price_numeric = ? WHERE id = ?', [eur, row.id]);
        }
      }
      await pool.query(`INSERT IGNORE INTO _migrations (name) VALUES ('price_numeric_usd')`);
    }
    const [doneEur] = await pool.query(`SELECT 1 FROM _migrations WHERE name = 'price_numeric_eur' LIMIT 1`);
    if (doneEur.length === 0) {
      const [rows] = await pool.query('SELECT id, price FROM requests WHERE price IS NOT NULL AND price != ""');
      for (const row of rows) {
        const eur = getPriceInEur(row.price);
        if (eur != null) {
          await pool.query('UPDATE requests SET price_numeric = ? WHERE id = ?', [eur, row.id]);
        }
      }
      await pool.query(`INSERT IGNORE INTO _migrations (name) VALUES ('price_numeric_eur')`);
    }
  } catch (error) {
    console.log('Migration note (price_numeric):', error.message);
  }
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'requests' 
      AND COLUMN_NAME = 'views'
    `);
    if (columns.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN views INT DEFAULT 0`);
    }
  } catch (error) {
    console.log('Migration note (views):', error.message);
  }
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'requests' 
      AND COLUMN_NAME = 'comments_locked'
    `);
    if (columns.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN comments_locked BOOLEAN DEFAULT FALSE`);
    }
  } catch (error) {
    console.log('Migration note (comments_locked):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'creator_name'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN creator_name VARCHAR(255) DEFAULT NULL`);
      await pool.query(`ALTER TABLE requests ADD COLUMN creator_avatar TEXT DEFAULT NULL`);
      await pool.query(`ALTER TABLE requests ADD COLUMN creator_platform VARCHAR(20) DEFAULT NULL`);
    }
  } catch (error) {
    console.log('Migration note (creator_name/avatar/platform):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'anonymous'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN anonymous BOOLEAN DEFAULT FALSE`);
    }
  } catch (error) {
    console.log('Migration note (anonymous):', error.message);
  }
  try {
    await pool.query(`
      ALTER TABLE requests MODIFY COLUMN status ENUM('pending', 'completed', 'rejected', 'cancelled') DEFAULT 'pending'
    `);
  } catch (error) {
    console.log('Migration note (status cancelled):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'cancel_requested_at'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN cancel_requested_at TIMESTAMP NULL`);
      await pool.query(`ALTER TABLE requests ADD COLUMN cancel_reason TEXT NULL`);
      await pool.query(`ALTER TABLE requests ADD COLUMN cancel_approved_by VARCHAR(20) NULL`);
      await pool.query(`ALTER TABLE requests ADD COLUMN cancel_approved_at TIMESTAMP NULL`);
    }
  } catch (error) {
    console.log('Migration note (cancel columns):', error.message);
  }
  try {
    const [colsRej] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'rejection_reason'
    `);
    if (colsRej.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN rejection_reason TEXT NULL`);
    }
  } catch (error) {
    console.log('Migration note (rejection_reason):', error.message);
  }
  try {
    const [colsRejAt] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'cancel_rejected_at'
    `);
    if (colsRejAt.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN cancel_rejected_at TIMESTAMP NULL`);
      await pool.query(`ALTER TABLE requests ADD COLUMN cancel_rejection_reason TEXT NULL`);
    }
  } catch (error) {
    console.log('Migration note (cancel_rejected_at):', error.message);
  }
  try {
    const [colsPub] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'public_message_id'
    `);
    if (colsPub.length === 0) {
      await pool.query(`ALTER TABLE requests ADD COLUMN public_message_id VARCHAR(20) NULL`);
    }
  } catch (error) {
    console.log('Migration note (public_message_id):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'protected_users' AND COLUMN_NAME = 'subscription_ends_at'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE protected_users ADD COLUMN subscription_ends_at DATE NULL`);
      await pool.query(`ALTER TABLE protected_users ADD COLUMN social_link VARCHAR(500) NULL`);
    }
  } catch (error) {
    console.log('Migration note (protected_users subscription):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'protected_users' AND COLUMN_NAME = 'display_name'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE protected_users ADD COLUMN display_name VARCHAR(255) NULL`);
      await pool.query(`ALTER TABLE protected_users ADD COLUMN avatar_url VARCHAR(500) NULL`);
    }
  } catch (error) {
    console.log('Migration note (protected_users display_name/avatar_url):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'protected_users' AND COLUMN_NAME = 'creator_name'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE protected_users ADD COLUMN creator_name VARCHAR(255) NULL`);
      await pool.query(`ALTER TABLE protected_users ADD COLUMN creator_avatar VARCHAR(500) NULL`);
      await pool.query(`ALTER TABLE protected_users ADD COLUMN creator_platform VARCHAR(20) NULL`);
    }
  } catch (error) {
    console.log('Migration note (protected_users creator):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'protected_users' AND COLUMN_NAME = 'follower_count'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE protected_users ADD COLUMN follower_count BIGINT UNSIGNED NULL DEFAULT 0`);
    }
  } catch (error) {
    console.log('Migration note (protected_users follower_count):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'protected_users' AND COLUMN_NAME = 'video_count'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE protected_users ADD COLUMN video_count INT UNSIGNED NULL`);
      await pool.query(`ALTER TABLE protected_users ADD COLUMN likes_count BIGINT UNSIGNED NULL`);
      await pool.query(`ALTER TABLE protected_users ADD COLUMN verified TINYINT(1) NULL`);
      await pool.query(`ALTER TABLE protected_users ADD COLUMN creator_bio TEXT NULL`);
    }
  } catch (error) {
    console.log('Migration note (protected_users video_count/likes_count/verified/creator_bio):', error.message);
  }
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'protected_users' AND COLUMN_NAME = 'creator_bio_link'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE protected_users ADD COLUMN creator_bio_link VARCHAR(500) NULL`);
    }
  } catch (error) {
    console.log('Migration note (protected_users creator_bio_link):', error.message);
  }
  try {
    const [fk] = await pool.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'protected_users' AND REFERENCED_TABLE_NAME = 'users'
    `);
    if (fk.length > 0) {
      await pool.query(`ALTER TABLE protected_users DROP FOREIGN KEY ${fk[0].CONSTRAINT_NAME}`);
    }
  } catch (error) {
    console.log('Migration note (protected_users FK drop):', error.message);
  }
  // Migrate existing table to allow NULL user_id
  try {
    await pool.query(`
      ALTER TABLE requests 
      MODIFY COLUMN user_id VARCHAR(20) NULL
    `);
  } catch (error) {
    console.log('Migration note (requests user_id NULL):', error.message);
  }
  try {
    const [fk] = await pool.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND REFERENCED_TABLE_NAME = 'users'
    `);
    if (fk.length > 0) {
      await pool.query(`ALTER TABLE requests DROP FOREIGN KEY ${fk[0].CONSTRAINT_NAME}`);
    }
  } catch (error) {
    console.log('Migration note (requests FK drop):', error.message);
  }
  
  // Check if foreign key already exists before adding
  try {
    const [constraints] = await pool.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'requests' 
      AND CONSTRAINT_NAME = 'requests_user_fk'
    `);
    
    if (constraints.length === 0) {
      await pool.query(`
        ALTER TABLE requests 
        ADD CONSTRAINT requests_user_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
    }
  } catch (error) {
    // Constraint might already exist or other error
    console.log('Foreign key constraint note:', error.message);
  }

  // Create upvotes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS upvotes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_upvote (request_id, user_id),
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Create comments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      parent_id INT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_request_id (request_id),
      INDEX idx_user_id (user_id),
      INDEX idx_parent_id (parent_id),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'parent_id'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE comments ADD COLUMN parent_id INT NULL AFTER user_id`);
      await pool.query(`CREATE INDEX idx_comments_parent_id ON comments (parent_id)`);
    }
  } catch (error) {
    console.log('Migration note (comments.parent_id):', error.message);
  }

  // Create comment_bans table (staff can ban users from commenting)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comment_bans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      reason TEXT,
      banned_by VARCHAR(20) NOT NULL,
      banned_until TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Create notifications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'leak',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      \`read\` TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_request_id (request_id),
      INDEX idx_notifications_user_id (user_id),
      INDEX idx_read (\`read\`),
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Migration: add user_id to notifications if missing (older DBs)
  try {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'user_id'
    `);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE notifications ADD COLUMN user_id VARCHAR(20) NULL AFTER request_id`);
      await pool.query(`CREATE INDEX idx_notifications_user_id ON notifications (user_id)`);
    }
  } catch (error) {
    console.log('Migration note (notifications.user_id):', error.message);
  }
  // Migration: allow request_id NULL and SET NULL on delete so delete notifications survive when request is deleted
  try {
    const [fkRows] = await pool.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND REFERENCED_TABLE_NAME = 'requests'
    `);
    if (fkRows.length > 0) {
      const fkName = fkRows[0].CONSTRAINT_NAME;
      await pool.query(`ALTER TABLE notifications DROP FOREIGN KEY \`${fkName}\``);
    }
    await pool.query(`ALTER TABLE notifications MODIFY COLUMN request_id INT NULL`);
    await pool.query(`
      ALTER TABLE notifications ADD CONSTRAINT notifications_request_fk
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL
    `);
  } catch (error) {
    console.log('Migration note (notifications request_id SET NULL):', error.message);
  }

  // Create request_views table for tracking views per session
  await pool.query(`
    CREATE TABLE IF NOT EXISTS request_views (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      session_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_view (request_id, user_id, session_id),
      INDEX idx_request_id (request_id),
      INDEX idx_user_id (user_id),
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Create protected_users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS protected_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(20),
      UNIQUE KEY unique_protected_user (user_id),
      INDEX idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Create protected_links table (dashboard-managed: URLs/keywords that block request submission)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS protected_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_name VARCHAR(100) NOT NULL DEFAULT 'default',
      link TEXT NOT NULL,
      type ENUM('link', 'keyword') NOT NULL DEFAULT 'link',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_group (group_name),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Create faqs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS faqs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order (order_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    await pool.query(`ALTER TABLE faqs ADD COLUMN category VARCHAR(64) DEFAULT 'general'`);
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await pool.query(`CREATE INDEX idx_faqs_category ON faqs (category)`);
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME' && e.code !== 'ER_DUP_INDEX') throw e;
  }

  // Create announcements table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      centered BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Add centered column if missing (legacy installs)
  try {
    await pool.query(`ALTER TABLE announcements ADD COLUMN centered BOOLEAN DEFAULT FALSE`);
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }

  // Create default_settings table (key-value for new user defaults)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS default_settings (
      \`key\` VARCHAR(64) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Create user_settings table (per-user settings)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id VARCHAR(20) NOT NULL,
      \`key\` VARCHAR(64) NOT NULL,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, \`key\`),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Site-wide settings (e.g. membership page content)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      \`key\` VARCHAR(128) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Seed default_settings if empty
  const [existing] = await pool.query(`SELECT 1 FROM default_settings LIMIT 1`);
  if (existing.length === 0) {
    await pool.query(
      `INSERT INTO default_settings (\`key\`, value) VALUES 
        ('theme', 'dark'),
        ('anonymous', 'false'),
        ('push', 'true'),
        ('discordDm', 'true'),
        ('discordDmCommentReplies', 'true'),
        ('timezone', 'auto'),
        ('dateFormat', 'relative')
      ON DUPLICATE KEY UPDATE value = VALUES(value)`
    );
  }
  try {
    await pool.query(
      `INSERT INTO default_settings (\`key\`, value) VALUES ('discordDmCommentReplies', 'true') ON DUPLICATE KEY UPDATE \`key\` = \`key\``
    );
  } catch (e) {
    // ignore
  }

  console.log('Database initialized successfully');
};

const storeUser = async (userData) => {
  const pool = getPool();
  const { 
    id, username, discriminator, global_name, display_name, avatar, banner, 
    accent_color, public_flags, premium_type, roles, patreon_premium,
    guild_nickname, guild_avatar, guild_tag, guild_badge, boost_level, premium_since
  } = userData;
  
  // Build dynamic query based on available fields
  const fields = ['id', 'username'];
  const values = [id, username];
  const updates = ['username = VALUES(username)'];
  
  if (discriminator !== undefined) {
    fields.push('discriminator');
    values.push(discriminator || null);
    updates.push('discriminator = VALUES(discriminator)');
  }
  if (global_name !== undefined) {
    fields.push('global_name');
    values.push(global_name || null);
    updates.push('global_name = VALUES(global_name)');
  }
  if (display_name !== undefined) {
    fields.push('display_name');
    values.push(display_name || null);
    updates.push('display_name = VALUES(display_name)');
  }
  if (avatar !== undefined) {
    fields.push('avatar');
    values.push(avatar);
    updates.push('avatar = VALUES(avatar)');
  }
  if (banner !== undefined) {
    fields.push('banner');
    values.push(banner || null);
    updates.push('banner = VALUES(banner)');
  }
  if (accent_color !== undefined) {
    fields.push('accent_color');
    values.push(accent_color || null);
    updates.push('accent_color = VALUES(accent_color)');
  }
  if (public_flags !== undefined) {
    fields.push('public_flags');
    values.push(public_flags || 0);
    updates.push('public_flags = VALUES(public_flags)');
  }
  if (premium_type !== undefined) {
    fields.push('premium_type');
    values.push(premium_type || 0);
    updates.push('premium_type = VALUES(premium_type)');
  }
  if (roles !== undefined) {
    fields.push('roles');
    values.push(JSON.stringify(roles || []));
    updates.push('roles = VALUES(roles)');
  }
  if (patreon_premium !== undefined) {
    fields.push('patreon_premium');
    values.push(patreon_premium || false);
    updates.push('patreon_premium = VALUES(patreon_premium)');
  }
  if (guild_nickname !== undefined) {
    fields.push('guild_nickname');
    values.push(guild_nickname || null);
    updates.push('guild_nickname = VALUES(guild_nickname)');
  }
  if (guild_avatar !== undefined) {
    fields.push('guild_avatar');
    values.push(guild_avatar || null);
    updates.push('guild_avatar = VALUES(guild_avatar)');
  }
  if (guild_tag !== undefined) {
    fields.push('guild_tag');
    values.push(guild_tag || null);
    updates.push('guild_tag = VALUES(guild_tag)');
  }
  if (guild_badge !== undefined) {
    fields.push('guild_badge');
    values.push(guild_badge || null);
    updates.push('guild_badge = VALUES(guild_badge)');
  }
  if (boost_level !== undefined) {
    fields.push('boost_level');
    values.push(boost_level || 0);
    updates.push('boost_level = VALUES(boost_level)');
  }
  if (premium_since !== undefined) {
    fields.push('premium_since');
    values.push(premium_since || null);
    updates.push('premium_since = VALUES(premium_since)');
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  const placeholders = fields.map(() => '?').join(', ');
  const updateClause = updates.join(', ');
  
  await pool.query(
    `INSERT INTO users (${fields.join(', ')})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE
       ${updateClause}`,
    values
  );
};

const getUser = async (userId) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) return null;
  
  const user = rows[0];
  if (user.roles != null && user.roles !== '') {
    try {
      user.roles = typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles;
      if (!Array.isArray(user.roles)) user.roles = [];
    } catch (e) {
      console.warn('[DB] Invalid roles JSON for user', userId, '- raw:', String(user.roles).slice(0, 50), '-', e.message);
      user.roles = [];
    }
  } else {
    user.roles = [];
  }
  // Convert MySQL boolean (0/1) to JavaScript boolean
  user.patreon_premium = Boolean(user.patreon_premium);
  return user;
};

/** Sync roles and patreon_premium for a user (e.g. when Discord roles change). Only updates if user exists. */
const updateUserRoles = async (userId, roles, patreonPremium) => {
  const pool = getPool();
  const rolesJson = Array.isArray(roles) ? JSON.stringify(roles) : JSON.stringify([]);
  const [result] = await pool.query(
    'UPDATE users SET roles = ?, patreon_premium = ? WHERE id = ?',
    [rolesJson, Boolean(patreonPremium), userId]
  );
  return result.affectedRows > 0;
};

const createRequest = async (userId, requestData) => {
  const pool = getPool();
  const { creator_url, product_url, title, description, image_url, price, creator_name, creator_avatar, creator_platform, anonymous } = requestData;
  const priceNum = price ? getPriceInEur(price) : null;
  const [result] = await pool.query(
    `INSERT INTO requests (user_id, creator_url, product_url, title, description, image_url, price, price_numeric, creator_name, creator_avatar, creator_platform, anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, creator_url, product_url, title || null, description || null, image_url || null, price || null, priceNum, creator_name || null, creator_avatar || null, creator_platform || null, Boolean(anonymous)]
  );
  return result.insertId;
};

const getRequests = async (status = null, page = 1, limit = 20, searchTerm = null, sortBy = 'recent', order = 'desc') => {
  const pool = getPool();
  const offset = (page - 1) * limit;
  const staffRoleIds = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

  const baseWhere = status ? 'r.status = ?' : "r.status != 'cancelled'";
  const params = [];
  if (status) params.push(status);
  let searchClause = '';
  if (searchTerm && searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    const termLower = `%${searchTerm.trim().toLowerCase()}%`;
    searchClause = ' AND (r.title LIKE ? OR r.title LIKE ? OR r.description LIKE ? OR r.description LIKE ? OR r.creator_name LIKE ? OR r.creator_name LIKE ?)';
    params.push(term, termLower, term, termLower, term, termLower);
  }
  const countParams = [...params];

  const dir = (order === 'asc') ? 'ASC' : 'DESC';
  let orderBy = 'r.created_at DESC, r.upvotes DESC';
  if (sortBy === 'oldest' || (sortBy === 'recent' && order === 'asc')) {
    orderBy = `r.created_at ASC, r.id ASC`;
  } else if (sortBy === 'recent') {
    orderBy = `r.created_at DESC, r.upvotes DESC`;
  } else if (sortBy === 'upvotes') {
    orderBy = `r.upvotes ${dir}, r.created_at DESC`;
  } else if (sortBy === 'price') {
    orderBy = `(r.price_numeric IS NULL), r.price_numeric ${dir}, r.created_at DESC`;
  } else if (sortBy === 'popular') {
    orderBy = `COALESCE(u.patreon_premium, 0) DESC, r.upvotes ${dir}, r.created_at DESC`;
  }

  const query = `
    SELECT r.*, 
           CASE WHEN r.anonymous = 1 THEN 'Anonymous' ELSE COALESCE(u.username, 'Anonymous') END as username,
           CASE WHEN r.anonymous = 1 THEN NULL ELSE u.avatar END as avatar,
           COALESCE(u.patreon_premium, 0) as patreon_premium,
           CASE WHEN u.patreon_premium = 1 THEN 1 ELSE 0 END as has_priority,
           u.roles as user_roles,
           (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) as comments_count
    FROM requests r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE ${baseWhere}${searchClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const countQuery = `
    SELECT COUNT(*) as total
    FROM requests r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE ${baseWhere}${searchClause}
  `;

  const [rows] = await pool.query(query, params);
  const [countRows] = await pool.query(countQuery, countParams);
  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    requests: rows.map(row => {
      let is_staff = false;
      if (row.user_roles && staffRoleIds.length > 0) {
        const roles = typeof row.user_roles === 'string' ? JSON.parse(row.user_roles || '[]') : (row.user_roles || []);
        is_staff = staffRoleIds.some(id => roles.includes(id));
      }
      const { user_roles: _ur, ...rest } = row;
      return { ...rest, patreon_premium: Boolean(row.patreon_premium), has_priority: Boolean(row.has_priority), is_staff };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};

/** Count requests that have no Discord message_id (for republish progress). */
const getCountRequestsWithoutMessageId = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) as n FROM requests WHERE status != 'cancelled' AND (message_id IS NULL OR message_id = '')`
  );
  return rows[0]?.n ?? 0;
};

/** Requests with TikTok/YouTube creator avatar for avatar refresh job. */
const getRequestsWithCreatorAvatar = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, creator_url, creator_avatar, creator_platform FROM requests
     WHERE creator_platform IN ('tiktok', 'youtube') AND creator_avatar IS NOT NULL AND creator_url IS NOT NULL AND TRIM(creator_url) != ''`
  );
  return rows;
};

/** Requests with TikTok/YouTube creator_url but missing creator_avatar or creator_name (scraper was offline at create). */
const getRequestsWithMissingCreatorInfo = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, creator_url, creator_name, creator_avatar, creator_platform FROM requests
     WHERE status != 'cancelled'
       AND creator_url IS NOT NULL AND TRIM(creator_url) != ''
       AND (creator_url LIKE '%tiktok.com%' OR creator_url LIKE '%youtube.com%' OR creator_url LIKE '%youtu.be%')
       AND (creator_avatar IS NULL OR TRIM(COALESCE(creator_avatar, '')) = '' OR creator_name IS NULL OR TRIM(COALESCE(creator_name, '')) = '')`
  );
  return rows;
};

/** Requests missing title, description or image_url (scraper was offline at create). */
const getRequestsWithMissingProductInfo = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, product_url, title, description, image_url, price FROM requests
     WHERE status != 'cancelled'
       AND product_url IS NOT NULL AND TRIM(product_url) != ''
       AND (
         (title IS NULL OR TRIM(COALESCE(title, '')) = '')
         OR (description IS NULL OR TRIM(COALESCE(description, '')) = '')
         OR (image_url IS NULL OR TRIM(COALESCE(image_url, '')) = '')
       )`
  );
  return rows;
};

const getRequest = async (requestId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT r.*, 
            CASE WHEN r.anonymous = 1 THEN 'Anonymous' ELSE COALESCE(u.username, 'Anonymous') END as username,
            CASE WHEN r.anonymous = 1 THEN NULL ELSE u.avatar END as avatar,
            COALESCE(u.patreon_premium, 0) as patreon_premium,
            CASE WHEN u.patreon_premium = 1 THEN 1 ELSE 0 END as has_priority,
            u.roles as user_roles,
            (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) as comments_count
     FROM requests r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.id = ?`,
    [requestId]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  const staffRoleIds = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  let is_staff = false;
  if (row.user_roles && staffRoleIds.length > 0) {
    const roles = typeof row.user_roles === 'string' ? JSON.parse(row.user_roles || '[]') : (row.user_roles || []);
    is_staff = staffRoleIds.some(id => roles.includes(id));
  }
  const { user_roles: _ur, ...rest } = row;
  return { ...rest, patreon_premium: Boolean(row.patreon_premium), has_priority: Boolean(row.has_priority), is_staff };
};

const updateRequest = async (requestId, updates) => {
  const pool = getPool();
  const allowedFields = ['status', 'thread_id', 'message_id', 'public_message_id', 'leak_message_id', 'leak_message_url', 'title', 'description', 'image_url', 'price', 'comments_locked', 'cancel_requested_at', 'cancel_reason', 'cancel_approved_by', 'cancel_approved_at', 'rejection_reason', 'cancel_rejected_at', 'cancel_rejection_reason', 'creator_avatar', 'creator_name', 'creator_platform'];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
      if (key === 'price') {
        fields.push('price_numeric = ?');
        values.push(value ? getPriceInEur(value) : null);
      }
    }
  }

  if (fields.length === 0) return false;

  values.push(requestId);
  
  // Use atomic update to prevent race conditions
  // Only update if thread_id is not already set (for thread_id updates)
  if (updates.thread_id) {
    const [result] = await pool.query(
      `UPDATE requests SET ${fields.join(', ')} WHERE id = ? AND (thread_id IS NULL OR thread_id = '')`,
      values
    );
    return result.affectedRows > 0;
  } else {
    await pool.query(
      `UPDATE requests SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return true;
  }
};

/** Count requests created by user in the last 24 hours (for daily limit). */
const getRequestCountByUserInLast24Hours = async (userId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM requests 
     WHERE user_id = ? AND created_at >= NOW() - INTERVAL 1 DAY`,
    [userId]
  );
  return rows[0]?.count ?? 0;
};

/** Stats for homepage: total requests (excl. cancelled), pending, completed, users count. */
const getRequestStats = async () => {
  const pool = getPool();
  const [totalRows] = await pool.query(
    `SELECT COUNT(*) as n FROM requests WHERE status != 'cancelled'`
  );
  const [pendingRows] = await pool.query(
    `SELECT COUNT(*) as n FROM requests WHERE status = 'pending'`
  );
  const [completedRows] = await pool.query(
    `SELECT COUNT(*) as n FROM requests WHERE status = 'completed'`
  );
  const [usersRows] = await pool.query(`SELECT COUNT(*) as n FROM users`);
  return {
    total: totalRows[0]?.n ?? 0,
    pending: pendingRows[0]?.n ?? 0,
    completed: completedRows[0]?.n ?? 0,
    users: usersRows[0]?.n ?? 0
  };
};

const { canonicalProductUrl } = require('./utils/canonicalProductUrl');

// Escape string for use in LIKE so % and _ are literal (canonical URL may contain %)
const escapeLike = (s) => (typeof s !== 'string' ? '' : s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_'));

const getRequestByProductUrl = async (productUrl) => {
  const pool = getPool();
  const canonical = canonicalProductUrl(productUrl);
  if (!canonical) return null;
  const escaped = escapeLike(canonical);
  const likeWithQuery = escaped + '?%';
  const likeWithHash = escaped + '#%';
  // BINARY so URL comparison is case-sensitive (path can differ by case). ORDER BY created_at ASC so oldest request wins if duplicate product_url exists.
  const [rows] = await pool.query(
    `SELECT * FROM requests WHERE status != 'cancelled' AND (
      BINARY product_url = ? OR product_url LIKE ? OR product_url LIKE ?
    ) ORDER BY created_at ASC LIMIT 1`,
    [canonical, likeWithQuery, likeWithHash]
  );
  return rows[0] || null;
};

/** All non-cancelled requests with id, product_url, creator_url (for protection re-enable archive). */
const getNonCancelledRequestUrlPairs = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, product_url, creator_url FROM requests WHERE status != 'cancelled'`
  );
  return rows;
};

// Search requests by title (for leak matching)
const searchRequestsByTitle = async (searchTerm) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM requests 
     WHERE status = 'pending' 
     AND (title LIKE ? OR title LIKE ?)
     ORDER BY created_at DESC`,
    [`%${searchTerm}%`, `%${searchTerm.toLowerCase()}%`]
  );
  return rows;
};

const createNotification = async (requestId, type, title, message, userId = null) => {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO notifications (request_id, user_id, type, title, message)
     VALUES (?, ?, ?, ?, ?)`,
    [requestId, userId || null, type, title, message]
  );
  return result.insertId;
};

/** Mark all notifications for a request and type as read (e.g. when staff approves/rejects from request page). */
const markNotificationsReadByRequestAndType = async (requestId, type) => {
  const pool = getPool();
  await pool.query(
    'UPDATE notifications SET `read` = 1 WHERE request_id = ? AND type = ?',
    [requestId, type]
  );
};

/** Update title and message of all notifications for a request and type (e.g. show outcome for all staff). */
const updateNotificationsByRequestAndType = async (requestId, type, { title, message }) => {
  const pool = getPool();
  if (!title && !message) return;
  if (title && message) {
    await pool.query(
      'UPDATE notifications SET title = ?, message = ? WHERE request_id = ? AND type = ?',
      [title, message, requestId, type]
    );
  } else if (title) {
    await pool.query('UPDATE notifications SET title = ? WHERE request_id = ? AND type = ?', [title, requestId, type]);
  } else {
    await pool.query('UPDATE notifications SET message = ? WHERE request_id = ? AND type = ?', [message, requestId, type]);
  }
};

const addUpvote = async (requestId, userId) => {
  const pool = getPool();
  try {
    await pool.query(
      'INSERT INTO upvotes (request_id, user_id) VALUES (?, ?)',
      [requestId, userId]
    );
    await pool.query(
      'UPDATE requests SET upvotes = upvotes + 1 WHERE id = ?',
      [requestId]
    );
    return true;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return false; // Already upvoted
    }
    throw error;
  }
};

const removeUpvote = async (requestId, userId) => {
  const pool = getPool();
  const [result] = await pool.query(
    'DELETE FROM upvotes WHERE request_id = ? AND user_id = ?',
    [requestId, userId]
  );
  
  if (result.affectedRows > 0) {
    await pool.query(
      'UPDATE requests SET upvotes = upvotes - 1 WHERE id = ?',
      [requestId]
    );
    return true;
  }
  return false;
};

const hasUpvoted = async (requestId, userId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT 1 FROM upvotes WHERE request_id = ? AND user_id = ? LIMIT 1',
    [requestId, userId]
  );
  return rows.length > 0;
};

/** Batch: which of the given request IDs has this user upvoted? Returns Set of request_id. */
const getUpvotedRequestIdsForUser = async (userId, requestIds) => {
  if (!requestIds || requestIds.length === 0) return new Set();
  const pool = getPool();
  const placeholders = requestIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT request_id FROM upvotes WHERE user_id = ? AND request_id IN (${placeholders})`,
    [userId, ...requestIds]
  );
  return new Set(rows.map((r) => r.request_id));
};

const getUpvoters = async (requestId, page = 1, limit = 20) => {
  const pool = getPool();
  const offset = (page - 1) * limit;
  
  // Get total count
  const [countRows] = await pool.query(
    'SELECT COUNT(*) as total FROM upvotes WHERE request_id = ?',
    [requestId]
  );
  const total = countRows[0].total;
  
  // Get paginated upvoters with user info (upvoted_at = when they upvoted)
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.global_name, u.avatar, up.created_at as upvoted_at
     FROM upvotes up
     JOIN users u ON up.user_id = u.id
     WHERE up.request_id = ?
     ORDER BY up.created_at DESC
     LIMIT ? OFFSET ?`,
    [requestId, limit, offset]
  );
  
  return {
    upvoters: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Get all upvoter IDs (for notifications)
const getUpvoterIds = async (requestId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT user_id FROM upvotes WHERE request_id = ?',
    [requestId]
  );
  return rows.map(row => row.user_id);
};

const getComments = async (requestId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT c.*, u.username, u.avatar, u.patreon_premium, u.roles
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.request_id = ?
     ORDER BY (c.parent_id IS NULL) DESC, COALESCE(c.parent_id, c.id), c.created_at ASC`,
    [requestId]
  );
  const staffRoleIds = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  return rows.map(row => {
    let isStaff = false;
    if (row.roles && staffRoleIds.length > 0) {
      const roles = typeof row.roles === 'string' ? JSON.parse(row.roles || '[]') : (row.roles || []);
      isStaff = staffRoleIds.some(id => roles.includes(id));
    }
    const { roles: _r, ...rest } = row;
    return { ...rest, patreon_premium: Boolean(row.patreon_premium), is_staff: isStaff };
  });
};

const getComment = async (commentId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT c.*, u.username, u.avatar, u.patreon_premium, u.roles
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [commentId]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  const staffRoleIds = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  let isStaff = false;
  if (row.roles && staffRoleIds.length > 0) {
    const roles = typeof row.roles === 'string' ? JSON.parse(row.roles || '[]') : (row.roles || []);
    isStaff = staffRoleIds.some(id => roles.includes(id));
  }
  const { roles: _r, ...rest } = row;
  return { ...rest, patreon_premium: Boolean(row.patreon_premium), is_staff: isStaff };
};

const createComment = async (requestId, userId, content, parentId = null) => {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO comments (request_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
    [requestId, userId, parentId, content]
  );
  return result.insertId;
};

/** Get the most recent comment by this user on this request (for cooldown check) */
const getLatestCommentByUserOnRequest = async (requestId, userId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT created_at FROM comments WHERE request_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
    [requestId, userId]
  );
  return rows[0] || null;
};

/** Get the most recent comment by this user on any request (global cooldown) */
const getLatestCommentByUser = async (userId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT created_at FROM comments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return rows[0] || null;
};

// Delete all replies to a comment (by parent_id), then the comment itself for accurate count
const deleteRepliesOfComment = async (parentId) => {
  const pool = getPool();
  await pool.query('DELETE FROM comments WHERE parent_id = ?', [parentId]);
};

const deleteComment = async (commentId, userId) => {
  const pool = getPool();
  await deleteRepliesOfComment(commentId);
  const [result] = await pool.query(
    'DELETE FROM comments WHERE id = ? AND user_id = ?',
    [commentId, userId]
  );
  return result.affectedRows > 0;
};

const deleteCommentById = async (commentId) => {
  const pool = getPool();
  await deleteRepliesOfComment(commentId);
  const [result] = await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);
  return result.affectedRows > 0;
};

// Comment bans (warn/ban from commenting)
const isUserBannedFromComments = async (userId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, reason, banned_until, created_at FROM comment_bans 
     WHERE user_id = ? AND (banned_until IS NULL OR banned_until > NOW())
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return { banned: false };
  return {
    banned: true,
    reason: rows[0].reason,
    expires_at: rows[0].banned_until,
    since: rows[0].created_at
  };
};

const addCommentBan = async (userId, reason, bannedBy, durationDays = null) => {
  const pool = getPool();
  let bannedUntil = null;
  if (durationDays && durationDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    bannedUntil = d.toISOString().slice(0, 19).replace('T', ' ');
  }
  await pool.query(
    'INSERT INTO comment_bans (user_id, reason, banned_by, banned_until) VALUES (?, ?, ?, ?)',
    [userId, reason || null, bannedBy, bannedUntil]
  );
  return true;
};

const removeCommentBan = async (userId) => {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM comment_bans WHERE user_id = ?', [userId]);
  return result.affectedRows > 0;
};

const getCommentBans = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT b.*, u.username as banned_username 
     FROM comment_bans b 
     LEFT JOIN users u ON b.user_id = u.id 
     WHERE b.banned_until IS NULL OR b.banned_until > NOW()
     ORDER BY b.created_at DESC`
  );
  return rows;
};

/** Get user IDs of all staff (users whose roles include any DISCORD_STAFF_ROLE_IDS) */
const getStaffUserIds = async () => {
  const pool = getPool();
  const staffRoleIds = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (staffRoleIds.length === 0) return [];
  const [rows] = await pool.query(`SELECT id, roles FROM users WHERE roles IS NOT NULL AND roles != ''`);
  const ids = [];
  for (const row of rows) {
    let roles = [];
    try {
      roles = typeof row.roles === 'string' ? JSON.parse(row.roles || '[]') : (row.roles || []);
    } catch (_) {}
    if (staffRoleIds.some(sid => roles.includes(sid))) ids.push(row.id);
  }
  return ids;
};

/** Delete a single request by ID (CASCADE removes upvotes, comments, notifications, request_views) */
const deleteRequest = async (requestId) => {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM requests WHERE id = ?', [requestId]);
  return result.affectedRows;
};

const deleteAllRequests = async () => {
  const pool = getPool();
  try {
    // Delete all related data first (due to foreign keys)
    await pool.query('DELETE FROM upvotes');
    await pool.query('DELETE FROM comments');
    await pool.query('DELETE FROM notifications');
    
    // Delete all requests
    const [result] = await pool.query('DELETE FROM requests');
    
    return result.affectedRows;
  } catch (error) {
    console.error('Error deleting all requests:', error);
    throw error;
  }
};

// Record a view for a request (only if user is logged in and hasn't viewed in this session).
// Returns { incremented: boolean, views?: number } so the route can avoid a second getRequest.
const recordView = async (requestId, userId, sessionId) => {
  const pool = getPool();
  if (!userId) return { incremented: false };
  
  try {
    const [existing] = await pool.query(
      `SELECT id FROM request_views 
       WHERE request_id = ? AND user_id = ? AND session_id = ?`,
      [requestId, userId, sessionId]
    );
    if (existing.length > 0) return { incremented: false };

    await pool.query(
      `INSERT INTO request_views (request_id, user_id, session_id) 
       VALUES (?, ?, ?)`,
      [requestId, userId, sessionId]
    );
    await pool.query(
      `UPDATE requests SET views = views + 1 WHERE id = ?`,
      [requestId]
    );
    const [[row]] = await pool.query('SELECT views FROM requests WHERE id = ?', [requestId]);
    return { incremented: true, views: row ? row.views : undefined };
  } catch (error) {
    console.error('Error recording view:', error);
    return { incremented: false };
  }
};

// Check if user is protected
const isProtectedUser = async (userId) => {
  const pool = getPool();
  if (!userId) return false;
  
  try {
    const [rows] = await pool.query(
      `SELECT id FROM protected_users WHERE user_id = ?`,
      [userId]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking protected user:', error);
    return false;
  }
};

/** List protected users with display info (public). Uses users table if present, else stored display_name/avatar_url from Discord – no registration required. */
const getProtectedUsersList = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id, p.user_id, p.subscription_ends_at, p.social_link, p.display_name, p.avatar_url, p.creator_name, p.creator_avatar, p.creator_platform, p.follower_count, p.video_count, p.likes_count, p.verified, p.creator_bio, p.creator_bio_link, p.created_at,
            u.global_name, u.display_name as u_display_name, u.username as u_username, u.avatar as u_avatar
     FROM protected_users p
     LEFT JOIN users u ON p.user_id = u.id
     ORDER BY COALESCE(p.follower_count, 0) DESC, p.created_at DESC`
  );
  return rows.map(r => {
    const username = r.global_name || r.u_display_name || r.u_username || r.display_name || 'Unknown';
    const avatarExt = r.u_avatar && String(r.u_avatar).startsWith('a_') ? 'gif' : 'png';
    const avatar = r.u_avatar
      ? `https://cdn.discordapp.com/avatars/${r.user_id}/${r.u_avatar}.${avatarExt}?size=128`
      : (r.avatar_url || null);
    return {
      id: r.id,
      user_id: r.user_id,
      username,
      avatar,
      subscription_ends_at: formatDateOnly(r.subscription_ends_at),
      social_link: r.social_link || null,
      creator_name: r.creator_name || null,
      creator_avatar: r.creator_avatar || null,
      creator_platform: r.creator_platform || null,
      follower_count: r.follower_count != null ? Number(r.follower_count) : 0,
      video_count: r.video_count != null ? Number(r.video_count) : null,
      likes_count: r.likes_count != null ? Number(r.likes_count) : null,
      verified: r.verified != null ? Boolean(r.verified) : null,
      creator_bio: r.creator_bio && String(r.creator_bio).trim() ? String(r.creator_bio).trim() : null,
      creator_bio_link: r.creator_bio_link && String(r.creator_bio_link).trim() ? String(r.creator_bio_link).trim() : null,
      created_at: r.created_at
    };
  });
};

/** Get protected users that have a social_link (TikTok/YouTube) for follower refresh job. */
const getProtectedUsersWithSocialLink = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT user_id, social_link FROM protected_users WHERE social_link IS NOT NULL AND TRIM(social_link) != ''`
  );
  return rows;
};

/** Protected users with TikTok/YouTube creator avatar for avatar refresh job. */
const getProtectedUsersWithCreatorAvatar = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT user_id, social_link, creator_avatar, creator_platform FROM protected_users
     WHERE creator_platform IN ('tiktok', 'youtube') AND creator_avatar IS NOT NULL AND social_link IS NOT NULL AND TRIM(social_link) != ''`
  );
  return rows;
};

const addProtectedUser = async (userId, subscriptionEndsAt = null, socialLink = null, createdBy = null, displayName = null, avatarUrl = null, creatorName = null, creatorAvatar = null, creatorPlatform = null, followerCount = null, videoCount = null, likesCount = null, verified = null, creatorBio = null, creatorBioLink = null) => {
  const pool = getPool();
  const fc = followerCount != null ? Math.max(0, parseInt(followerCount, 10) || 0) : 0;
  const vc = videoCount != null ? Math.max(0, parseInt(videoCount, 10) || 0) : null;
  const lc = likesCount != null ? Math.max(0, parseInt(likesCount, 10) || 0) : null;
  const ver = verified != null ? (verified ? 1 : 0) : null;
  const bio = creatorBio && typeof creatorBio === 'string' ? creatorBio.trim().slice(0, 2000) || null : null;
  const bioLink = creatorBioLink && typeof creatorBioLink === 'string' ? creatorBioLink.trim().slice(0, 500) || null : null;
  await pool.query(
    `INSERT INTO protected_users (user_id, subscription_ends_at, social_link, created_by, display_name, avatar_url, creator_name, creator_avatar, creator_platform, follower_count, video_count, likes_count, verified, creator_bio, creator_bio_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE subscription_ends_at = VALUES(subscription_ends_at), social_link = VALUES(social_link), created_by = VALUES(created_by), display_name = COALESCE(VALUES(display_name), display_name), avatar_url = COALESCE(VALUES(avatar_url), avatar_url), creator_name = VALUES(creator_name), creator_avatar = VALUES(creator_avatar), creator_platform = VALUES(creator_platform), follower_count = VALUES(follower_count), video_count = VALUES(video_count), likes_count = VALUES(likes_count), verified = VALUES(verified), creator_bio = VALUES(creator_bio), creator_bio_link = VALUES(creator_bio_link)`,
    [userId, subscriptionEndsAt || null, socialLink || null, createdBy || null, displayName || null, avatarUrl || null, creatorName || null, creatorAvatar || null, creatorPlatform || null, fc, vc, lc, ver, bio, bioLink]
  );
};

const updateProtectedUser = async (userId, updates) => {
  const pool = getPool();
  const parts = [];
  const values = [];
  if (updates.subscription_ends_at !== undefined) {
    parts.push('subscription_ends_at = ?');
    values.push(updates.subscription_ends_at && String(updates.subscription_ends_at).trim() ? String(updates.subscription_ends_at).trim().slice(0, 10) : null);
  }
  if (updates.social_link !== undefined) {
    parts.push('social_link = ?');
    values.push(updates.social_link && typeof updates.social_link === 'string' ? updates.social_link.trim() || null : null);
  }
  if (updates.display_name !== undefined) {
    parts.push('display_name = ?');
    values.push(updates.display_name && typeof updates.display_name === 'string' ? updates.display_name.trim() || null : null);
  }
  if (updates.avatar_url !== undefined) {
    parts.push('avatar_url = ?');
    values.push(updates.avatar_url && typeof updates.avatar_url === 'string' ? updates.avatar_url.trim() || null : null);
  }
  if (updates.creator_name !== undefined) {
    parts.push('creator_name = ?');
    values.push(updates.creator_name && typeof updates.creator_name === 'string' ? updates.creator_name.trim() || null : null);
  }
  if (updates.creator_avatar !== undefined) {
    parts.push('creator_avatar = ?');
    values.push(updates.creator_avatar && typeof updates.creator_avatar === 'string' ? updates.creator_avatar.trim() || null : null);
  }
  if (updates.creator_platform !== undefined) {
    parts.push('creator_platform = ?');
    values.push(updates.creator_platform && typeof updates.creator_platform === 'string' ? updates.creator_platform.trim() || null : null);
  }
  if (updates.follower_count !== undefined) {
    parts.push('follower_count = ?');
    values.push(Math.max(0, parseInt(updates.follower_count, 10) || 0));
  }
  if (updates.video_count !== undefined) {
    parts.push('video_count = ?');
    values.push(updates.video_count != null ? Math.max(0, parseInt(updates.video_count, 10) || 0) : null);
  }
  if (updates.likes_count !== undefined) {
    parts.push('likes_count = ?');
    values.push(updates.likes_count != null ? Math.max(0, parseInt(updates.likes_count, 10) || 0) : null);
  }
  if (updates.verified !== undefined) {
    parts.push('verified = ?');
    values.push(updates.verified != null ? (updates.verified ? 1 : 0) : null);
  }
  if (updates.creator_bio !== undefined) {
    parts.push('creator_bio = ?');
    values.push(updates.creator_bio && typeof updates.creator_bio === 'string' ? updates.creator_bio.trim().slice(0, 2000) || null : null);
  }
  if (updates.creator_bio_link !== undefined) {
    parts.push('creator_bio_link = ?');
    values.push(updates.creator_bio_link && typeof updates.creator_bio_link === 'string' ? updates.creator_bio_link.trim().slice(0, 500) || null : null);
  }
  if (parts.length === 0) return;
  values.push(userId);
  await pool.query(`UPDATE protected_users SET ${parts.join(', ')} WHERE user_id = ?`, values);
};

const deleteProtectedUser = async (userId) => {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM protected_users WHERE user_id = ?', [userId]);
  return result.affectedRows > 0;
};

// Protected links (dashboard-managed: block request submission for these URLs/keywords)
const getProtectedLinks = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, group_name, link, type, created_at FROM protected_links ORDER BY group_name, type, link'
  );
  return rows;
};

/** Build protection_groups structure for protection.js (group_name -> { links: [], keywords: [] }) */
const getProtectionGroupsForCheck = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT group_name, link, type FROM protected_links ORDER BY group_name'
  );
  const groups = {};
  for (const row of rows) {
    const name = row.group_name || 'default';
    if (!groups[name]) groups[name] = { links: [], keywords: [] };
    if (row.type === 'keyword') {
      groups[name].keywords.push(row.link);
    } else {
      groups[name].links.push(row.link);
    }
  }
  return { protection_groups: groups, enabled: Object.keys(groups).length > 0 };
};

const addProtectedLink = async (groupName, link, type = 'link') => {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO protected_links (group_name, link, type) VALUES (?, ?, ?)',
    [groupName || 'default', link.trim(), type === 'keyword' ? 'keyword' : 'link']
  );
  return result.insertId;
};

const deleteProtectedLink = async (id) => {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM protected_links WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

// Get user's requests (optional status filter and sort: recent | oldest | upvotes)
const getUserRequests = async (userId, page = 1, limit = 20, status = null, sortBy = 'recent') => {
  const pool = getPool();
  const offset = (page - 1) * limit;
  
  const statusFilter = status && ['pending', 'completed', 'rejected', 'cancelled'].includes(status) ? status : null;
  const orderBy = sortBy === 'oldest'
    ? 'r.created_at ASC'
    : sortBy === 'upvotes'
      ? 'r.upvotes DESC, r.created_at DESC'
      : 'r.created_at DESC';
  
  try {
    const whereClause = statusFilter ? 'r.user_id = ? AND r.status = ?' : 'r.user_id = ?';
    const queryParams = statusFilter ? [userId, statusFilter, limit, offset] : [userId, limit, offset];
    
    const [rows] = await pool.query(
      `SELECT r.*, 
              CASE WHEN r.anonymous = 1 THEN 'Anonymous' ELSE COALESCE(u.username, 'Anonymous') END as username,
              CASE WHEN r.anonymous = 1 THEN NULL ELSE u.avatar END as avatar,
              COALESCE(u.patreon_premium, 0) as patreon_premium,
              CASE WHEN u.patreon_premium = 1 THEN 1 ELSE 0 END as has_priority,
              (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) as comments_count
       FROM requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      queryParams
    );
    
    const countParams = statusFilter ? [userId, statusFilter] : [userId];
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM requests WHERE ${statusFilter ? 'user_id = ? AND status = ?' : 'user_id = ?'}`,
      countParams
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);
    
    return {
      requests: rows.map(row => ({
        ...row,
        patreon_premium: Boolean(row.patreon_premium),
        has_priority: Boolean(row.has_priority)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  } catch (error) {
    console.error('Error getting user requests:', error);
    throw error;
  }
};

// Lock/unlock comments
const setCommentsLocked = async (requestId, locked) => {
  const pool = getPool();
  try {
    await pool.query(
      `UPDATE requests SET comments_locked = ? WHERE id = ?`,
      [locked, requestId]
    );
    return true;
  } catch (error) {
    console.error('Error setting comments locked:', error);
    throw error;
  }
};

// FAQ functions
const getFAQs = async (category = null) => {
  const pool = getPool();
  try {
    if (category) {
      const [rows] = await pool.query(
        `SELECT * FROM faqs WHERE category = ? ORDER BY order_index ASC, id ASC`,
        [category]
      );
      return rows;
    }
    const [rows] = await pool.query(
      `SELECT * FROM faqs ORDER BY order_index ASC, id ASC`
    );
    return rows;
  } catch (error) {
    console.error('Error getting FAQs:', error);
    throw error;
  }
};

const createFAQ = async (question, answer, orderIndex = 0, category = 'general') => {
  const pool = getPool();
  try {
    const [result] = await pool.query(
      `INSERT INTO faqs (question, answer, order_index, category) VALUES (?, ?, ?, ?)`,
      [question, answer, orderIndex, category || 'general']
    );
    return result.insertId;
  } catch (error) {
    console.error('Error creating FAQ:', error);
    throw error;
  }
};

const updateFAQ = async (id, question, answer, orderIndex, category = null) => {
  const pool = getPool();
  try {
    if (category != null) {
      await pool.query(
        `UPDATE faqs SET question = ?, answer = ?, order_index = ?, category = ? WHERE id = ?`,
        [question, answer, orderIndex, category, id]
      );
    } else {
      await pool.query(
        `UPDATE faqs SET question = ?, answer = ?, order_index = ? WHERE id = ?`,
        [question, answer, orderIndex, id]
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating FAQ:', error);
    throw error;
  }
};

const deleteFAQ = async (id) => {
  const pool = getPool();
  try {
    await pool.query(`DELETE FROM faqs WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    throw error;
  }
};

// Announcement functions
const getActiveAnnouncement = async () => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      `SELECT * FROM announcements WHERE active = TRUE ORDER BY created_at DESC LIMIT 1`
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting announcement:', error);
    throw error;
  }
};

const getAllAnnouncements = async () => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      `SELECT * FROM announcements ORDER BY created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error('Error getting announcements:', error);
    throw error;
  }
};

const createAnnouncement = async (title, message, active = true, centered = false) => {
  const pool = getPool();
  try {
    const [result] = await pool.query(
      `INSERT INTO announcements (title, message, active, centered) VALUES (?, ?, ?, ?)`,
      [title, message, active, Boolean(centered)]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

const updateAnnouncement = async (id, title, message, active, centered = false) => {
  const pool = getPool();
  try {
    await pool.query(
      `UPDATE announcements SET title = ?, message = ?, active = ?, centered = ? WHERE id = ?`,
      [title, message, active, Boolean(centered), id]
    );
    return true;
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

const deleteAnnouncement = async (id) => {
  const pool = getPool();
  try {
    await pool.query(`DELETE FROM announcements WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};

// Default settings for new users (key-value store)
const getDefaultSettings = async () => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(`SELECT \`key\`, value FROM default_settings`);
    const obj = {};
    for (const row of rows) {
      obj[row.key] = row.value;
    }
    return obj;
  } catch (error) {
    console.error('Error getting default settings:', error);
    throw error;
  }
};

const setDefaultSettings = async (settings) => {
  const pool = getPool();
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && value !== null) {
        await pool.query(
          `INSERT INTO default_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
          [key, String(value)]
        );
      }
    }
    return true;
  } catch (error) {
    console.error('Error setting default settings:', error);
    throw error;
  }
};

/** Search users by username/global_name for staff dropdown. Returns id, username, global_name, avatar. */
const getUsersSearch = async (search, limit = 50) => {
  const pool = getPool();
  const term = search && typeof search === 'string' ? search.trim() : '';
  if (!term) {
    const [rows] = await pool.query(
      `SELECT id, username, global_name, avatar FROM users ORDER BY username ASC LIMIT ?`,
      [limit]
    );
    return rows;
  }
  const pattern = `%${term.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
  const [rows] = await pool.query(
    `SELECT id, username, global_name, avatar FROM users 
     WHERE username LIKE ? OR global_name LIKE ? OR id = ?
     ORDER BY username ASC LIMIT ?`,
    [pattern, pattern, term, limit]
  );
  return rows;
};

/** All user IDs (for "apply to all users"). */
const getAllUserIds = async () => {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT id FROM users`);
  return rows.map((r) => r.id);
};

// Site settings (key-value for pages like membership)
const getSiteSetting = async (key) => {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT value FROM site_settings WHERE \`key\` = ?`, [key]);
  return rows.length ? rows[0].value : null;
};

const setSiteSetting = async (key, value) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO site_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [key, value == null ? '' : String(value)]
  );
  return true;
};

const MEMBERSHIP_DEFAULTS = {
  hero_title: 'Choose your membership',
  hero_subtitle: 'Premium gets you access to leaks and perks. Leak Protection keeps your content safe and off the board.',
  discount_active: 'true',
  show_faq: 'true',
  premium_monthly: '2.40',
  premium_yearly: '28.80',
  premium_old_price: '3',
  premium_save_label: 'Save 20%',
  premium_old_price_monthly: '',
  premium_old_price_yearly: '',
  premium_save_label_monthly: '',
  premium_save_label_yearly: '',
  protection_monthly: '6',
  protection_yearly: '55',
  protection_save_label: '$17 off',
  protection_old_price_monthly: '',
  protection_old_price_yearly: '',
  protection_save_label_monthly: '',
  protection_save_label_yearly: '',
  premium_cta_text: 'Join Premium',
  protection_cta_text: 'Join Leak Protection',
  premium_note: 'To access all perks, connect your Discord account to Patreon after subscribing.',
  premium_warning: '',
  protection_warning: 'Must open a ticket in our Discord server before subscribing.',
  protection_legal_note: 'By subscribing, you agree that a refund will not be issued if you subscribed without first creating a ticket.',
  premium_badge_text: 'Most popular',
  protection_badge_text: '',
  premium_card_label: 'Access to leaks',
  premium_card_title: 'Premium',
  protection_card_label: 'Your stuff at all cost',
  protection_card_title: 'Leak Protection',
  premium_features: '["Instant Access to Leaks","Extra 2x entry to Giveaways","Exclusive Role","Premium Leaks","Priority Request","Discord access"]',
  protection_features: '["Complete Leak Removal","Content Request Block","Exclusive Role","Discord access"]',
  premium_join_url: '',
  protection_join_url: ''
};

const getMembershipSettings = async () => {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT \`key\`, value FROM site_settings WHERE \`key\` LIKE 'membership_%'`);
  const out = { ...MEMBERSHIP_DEFAULTS };
  for (const row of rows) {
    const key = row.key.replace(/^membership_/, '');
    if (MEMBERSHIP_DEFAULTS[key] !== undefined) out[key] = row.value;
  }
  return out;
};

const updateMembershipSettings = async (data) => {
  const pool = getPool();
  const allowed = Object.keys(MEMBERSHIP_DEFAULTS);
  for (const [key, value] of Object.entries(data)) {
    if (!allowed.includes(key)) continue;
    const dbKey = key.startsWith('membership_') ? key : `membership_${key}`;
    await pool.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [dbKey, value == null ? '' : String(value)]
    );
  }
  return true;
};

const POPUP_DEFAULTS = {
  // Discord join popup
  popup_discord_title_logged_in: 'Join our Discord server',
  popup_discord_title_not_logged_in: 'Log in & join our Discord',
  popup_discord_desc_logged_in: 'You need to be a member of our Discord server to submit requests. Join once and you\'re all set.',
  popup_discord_desc_not_logged_in: 'Log in with Discord and join our server to submit requests.',
  popup_discord_btn_login: 'Login with Discord',
  popup_discord_btn_join: 'Join Discord Server',
  popup_discord_btn_ive_joined: "I've joined",
  popup_discord_btn_not_you: 'Not you? Log in again',
  popup_discord_hint: 'After joining, click "I\'ve joined" to continue.',
  popup_discord_invite_url: 'https://discord.gg/6ure',
  // Already leaked modal
  popup_leaked_badge: 'Available',
  popup_leaked_message: 'This resource is already available on our Discord Server. Click the button below to check it out.',
  popup_leaked_btn_open: 'Open in Discord',
  popup_leaked_btn_close: 'Close',
  popup_leaked_no_link: 'Leak link not available.',
  // Protected content modal
  popup_protected_title: 'Request Not Allowed',
  popup_protected_explanation: 'Requests about this creator or content cannot be submitted. If you believe this is an error, please contact support.',
  popup_protected_btn: 'Understood',
  // Request preview modal (before submit)
  popup_preview_title: 'Review Your Request',
  popup_preview_title_hint: "You can edit the title if it's incorrect",
  popup_preview_anonymous: '🔒 This request will be submitted anonymously',
  popup_preview_login_required: 'Log in to submit this request.',
  popup_preview_title_placeholder: 'Enter request title',
  popup_preview_btn_cancel: 'Cancel',
  popup_preview_btn_confirm: 'Confirm & Submit',
  popup_preview_creating: 'Creating...',
  popup_preview_no_image: 'No image found for this page (OG/twitter:image)',
  // Premium upsell modal (when non-premium user hits random chance)
  popup_upsell_title: '⭐ Upgrade to Premium',
  popup_upsell_message: 'Get priority requests and extra features!',
  popup_upsell_bullet1: '✨ Priority highlighting for your requests',
  popup_upsell_bullet2: '🚀 Faster processing',
  popup_upsell_bullet3: '🎨 Exclusive features',
  popup_upsell_btn_skip: 'Maybe Later',
  popup_upsell_btn_upgrade: 'Upgrade Now',
  popup_upsell_url: 'https://www.patreon.com/cw/6ure',
  // Cancel request modal (RequestDetail)
  popup_cancel_title: 'Request cancellation',
  popup_cancel_note: 'Staff must approve your cancellation. A reason is required.',
  popup_cancel_placeholder: 'Reason for cancellation...',
  popup_cancel_btn_cancel: 'Cancel',
  popup_cancel_btn_submit: 'Submit cancellation request',
  popup_cancel_submitting: 'Submitting...'
};

const getPopupSettings = async () => {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT \`key\`, value FROM site_settings WHERE \`key\` LIKE 'popup_%'`);
  const out = { ...POPUP_DEFAULTS };
  for (const row of rows) {
    if (POPUP_DEFAULTS[row.key] !== undefined) out[row.key] = row.value;
  }
  return out;
};

const updatePopupSettings = async (data) => {
  const pool = getPool();
  const allowed = Object.keys(POPUP_DEFAULTS);
  for (const [key, value] of Object.entries(data)) {
    const k = key.startsWith('popup_') ? key : `popup_${key}`;
    if (!allowed.includes(k)) continue;
    await pool.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [k, value == null ? '' : String(value)]
    );
  }
  return true;
};

// Embed settings for Discord bot – all customizable fields per embed type
const EMBED_DEFAULTS = {
  // New request (staff channel)
  embed_new_request_title: 'A new request has been created!',
  embed_new_request_description: '[View on Website]({requestUrl})',
  embed_new_request_color: '0x5865F2',
  embed_new_request_footer: 'Request Monitor',
  embed_new_request_footer_icon: '',
  embed_new_request_author_name: 'Request Monitor',
  embed_new_request_author_icon: '',
  embed_new_request_image_enabled: 'true',
  embed_new_request_thumbnail_enabled: 'false',
  embed_new_request_field_1_name: 'Product URL',
  embed_new_request_field_2_name: 'Creator',
  embed_new_request_field_3_name: 'Status',
  embed_new_request_field_4_name: 'Upvotes',
  embed_new_request_field_5_name: 'Request ID',
  embed_new_request_field_6_name: 'User',
  embed_new_request_field_views_name: 'Views',
  // Comment reply DM
  embed_comment_reply_title: '💬 Someone replied to your comment',
  embed_comment_reply_description: 'You received a reply on the request **{requestTitle}**.',
  embed_comment_reply_color: '0x5865F2',
  embed_comment_reply_footer: '6ure Requests · Comment reply',
  embed_comment_reply_footer_icon: '',
  embed_comment_reply_author_name: '',
  embed_comment_reply_author_icon: '',
  embed_comment_reply_field_1_name: 'Reply',
  embed_comment_reply_field_2_name: 'From',
  embed_comment_reply_field_3_name: 'View comment',
  // Completed DM
  embed_completed_dm_title: 'Request Completed!',
  embed_completed_dm_description: 'Your request has been marked as completed.',
  embed_completed_dm_color: '0x57F287',
  embed_completed_dm_footer: '',
  embed_completed_dm_footer_icon: '',
  embed_completed_dm_author_name: '',
  embed_completed_dm_author_icon: '',
  embed_completed_dm_thumbnail_enabled: 'true',
  embed_completed_dm_field_1_name: 'Request Details',
  embed_completed_dm_field_2_name: 'Request Author',
  embed_completed_dm_field_3_name: 'Quick Links',
  // Rejected DM
  embed_rejected_dm_title: 'Request Rejected',
  embed_rejected_dm_description: 'Your request has been rejected.',
  embed_rejected_dm_color: '0xED4245',
  embed_rejected_dm_footer: '',
  embed_rejected_dm_footer_icon: '',
  embed_rejected_dm_author_name: '',
  embed_rejected_dm_author_icon: '',
  embed_rejected_dm_thumbnail_enabled: 'true',
  embed_rejected_dm_field_1_name: 'Request Details',
  embed_rejected_dm_field_2_name: 'Request Author',
  embed_rejected_dm_field_3_name: 'Quick Links',
  // Leak DM
  embed_leak_dm_title: '🎉 Request Leaked!',
  embed_leak_dm_description: 'Your requested product has been leaked!',
  embed_leak_dm_color: '0x57F287',
  embed_leak_dm_footer: '',
  embed_leak_dm_footer_icon: '',
  embed_leak_dm_author_name: '',
  embed_leak_dm_author_icon: '',
  embed_leak_dm_thumbnail_enabled: 'true',
  embed_leak_dm_field_1_name: 'Request Details',
  embed_leak_dm_field_2_name: 'Request Author',
  embed_leak_dm_field_3_name: 'Links',
  // Request deleted DM
  embed_deleted_dm_title: 'Request Deleted',
  embed_deleted_dm_description: 'Your request was deleted by staff.',
  embed_deleted_dm_color: '0xED4245',
  embed_deleted_dm_footer: '',
  embed_deleted_dm_footer_icon: '',
  embed_deleted_dm_author_name: '',
  embed_deleted_dm_author_icon: '',
  embed_deleted_dm_thumbnail_enabled: 'true',
  embed_deleted_dm_field_1_name: 'Request title',
  embed_deleted_dm_field_2_name: 'Reason',
  embed_deleted_dm_field_3_name: 'Request ID',
  // Cancel requested
  embed_cancel_requested_title: 'Cancellation requested',
  embed_cancel_requested_description: 'Requester requested cancellation for request **#{requestId}**.',
  embed_cancel_requested_color: '0xFEE75C',
  embed_cancel_requested_footer: 'Request #',
  embed_cancel_requested_footer_icon: '',
  embed_cancel_requested_author_name: '',
  embed_cancel_requested_author_icon: '',
  embed_cancel_requested_field_1_name: 'Requester',
  embed_cancel_requested_field_2_name: 'Reason',
  embed_cancel_requested_field_3_name: 'Request title',
  embed_cancel_requested_field_4_name: 'Product URL',
  // Cancel approved
  embed_cancel_approved_title: 'Cancellation approved',
  embed_cancel_approved_description: 'Request **#{requestId}** was cancelled by staff.',
  embed_cancel_approved_color: '0xED4245',
  embed_cancel_approved_footer: 'Request #',
  embed_cancel_approved_footer_icon: '',
  embed_cancel_approved_author_name: '',
  embed_cancel_approved_author_icon: '',
  embed_cancel_approved_field_1_name: 'Requester',
  embed_cancel_approved_field_2_name: 'Approved by',
  embed_cancel_approved_field_3_name: 'Reason',
  embed_cancel_approved_field_4_name: 'Request title',
  embed_cancel_approved_field_5_name: 'Product URL',
  // Cancel rejected
  embed_cancel_rejected_title: 'Cancellation rejected',
  embed_cancel_rejected_description: 'Cancellation request for **#{requestId}** was rejected by staff.',
  embed_cancel_rejected_color: '0x57F287',
  embed_cancel_rejected_footer: 'Request #',
  embed_cancel_rejected_footer_icon: '',
  embed_cancel_rejected_author_name: '',
  embed_cancel_rejected_author_icon: '',
  embed_cancel_rejected_field_1_name: 'Requester',
  embed_cancel_rejected_field_2_name: 'Rejected by',
  embed_cancel_rejected_field_reason_name: "Requester's reason",
  embed_cancel_rejected_field_staff_reason_name: "Staff's reason",
  embed_cancel_rejected_field_3_name: 'Request title',
  embed_cancel_rejected_field_4_name: 'Product URL',
  // Cancel approved DM (to requester)
  embed_cancel_approved_dm_title: 'Cancellation approved',
  embed_cancel_approved_dm_description: 'Your cancellation request was approved. The request has been removed.',
  embed_cancel_approved_dm_color: '0x57F287',
  embed_cancel_approved_dm_footer: 'Request #',
  // Cancel rejected DM (to requester). Placeholders: {requestId}, {title}, {reason} = staff reason
  embed_cancel_rejected_dm_title: 'Cancellation rejected',
  embed_cancel_rejected_dm_description: 'Your cancellation request was rejected. You can request cancellation again after 24 hours.',
  embed_cancel_rejected_dm_color: '0xED4245',
  embed_cancel_rejected_dm_footer: 'Request #',
  embed_cancel_rejected_dm_field_staff_reason_name: "Staff's reason",
  // Cancel / staff delete log (request deleted by staff)
  embed_cancel_deleted_title: 'Request deleted by staff',
  embed_cancel_deleted_description: '**{title}** was permanently deleted.',
  embed_cancel_deleted_color: '0xED4245',
  embed_cancel_deleted_footer: 'Request #',
  embed_cancel_deleted_footer_icon: '',
  embed_cancel_deleted_author_name: '',
  embed_cancel_deleted_author_icon: '',
  embed_cancel_deleted_field_1_name: 'Deleted by',
  embed_cancel_deleted_field_2_name: 'Requester',
  embed_cancel_deleted_field_3_name: 'Request title',
  embed_cancel_deleted_field_4_name: 'Reason',
  embed_cancel_deleted_field_5_name: 'Product URL',
  // Staff request (alias / legacy)
  embed_staff_request_title: 'New request',
  embed_staff_request_color: '0x5865F2',
  embed_staff_request_footer: 'Request #',
};

const getEmbedSettings = async () => {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT \`key\`, value FROM site_settings WHERE \`key\` LIKE 'embed_%'`);
  const out = { ...EMBED_DEFAULTS };
  for (const row of rows) {
    if (EMBED_DEFAULTS[row.key] !== undefined) out[row.key] = row.value;
  }
  return out;
};

const updateEmbedSettings = async (data) => {
  const pool = getPool();
  const allowed = Object.keys(EMBED_DEFAULTS);
  for (const [key, value] of Object.entries(data)) {
    const k = key.startsWith('embed_') ? key : `embed_${key}`;
    if (!allowed.includes(k)) continue;
    await pool.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [k, value == null ? '' : String(value)]
    );
  }
  return true;
};

// ---- Site theme settings (staff-controlled, site-wide) ----
const THEME_DEFAULTS = {
  theme_active: 'default',
  // Winter theme options
  theme_winter_snow_enabled: 'true',
  theme_winter_snow_intensity: '50',
  theme_winter_frost_borders: 'true',
  theme_winter_blue_tint: 'true',
  theme_winter_snowflake_cursor: 'false',
  theme_winter_aurora_bg: 'true',
};

const getThemeSettings = async () => {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT \`key\`, value FROM site_settings WHERE \`key\` LIKE 'theme_%'`);
  const out = { ...THEME_DEFAULTS };
  for (const row of rows) {
    if (THEME_DEFAULTS[row.key] !== undefined) out[row.key] = row.value;
  }
  return out;
};

const updateThemeSettings = async (data) => {
  const pool = getPool();
  const allowed = Object.keys(THEME_DEFAULTS);
  for (const [key, value] of Object.entries(data)) {
    if (!allowed.includes(key)) continue;
    await pool.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [key, value == null ? '' : String(value)]
    );
  }
  return true;
};

// User settings (per-user; defaults merged when missing)
const getUserSettings = async (userId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT \`key\`, value FROM user_settings WHERE user_id = ?`,
    [userId]
  );
  const obj = {};
  for (const row of rows) {
    obj[row.key] = row.value;
  }
  return obj;
};

const setUserSettings = async (userId, settings) => {
  const pool = getPool();
  const allowed = ['theme', 'anonymous', 'push', 'discordDm', 'discordDmCommentReplies', 'timezone', 'dateFormat'];
  for (const [key, value] of Object.entries(settings)) {
    if (allowed.includes(key) && value !== undefined) {
      await pool.query(
        `INSERT INTO user_settings (user_id, \`key\`, value) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [userId, key, String(value)]
      );
    }
  }
};

// Merged settings: user overrides + defaults
const getMergedUserSettings = async (userId) => {
  const [defaults, user] = await Promise.all([
    getDefaultSettings(),
    getUserSettings(userId)
  ]);
  const merged = { ...defaults };
  for (const [k, v] of Object.entries(user)) {
    if (v !== undefined && v !== null) merged[k] = v;
  }
  return merged;
};

module.exports = {
  initialize,
  storeUser,
  getUser,
  updateUserRoles,
  createRequest,
  getRequest,
  getRequests,
  getCountRequestsWithoutMessageId,
  getRequestsWithCreatorAvatar,
  getRequestsWithMissingCreatorInfo,
  getRequestsWithMissingProductInfo,
  getRequestStats,
  updateRequest,
  getRequestCountByUserInLast24Hours,
  getRequestByProductUrl,
  getNonCancelledRequestUrlPairs,
  searchRequestsByTitle,
  addUpvote,
  removeUpvote,
  hasUpvoted,
  getUpvotedRequestIdsForUser,
  getUpvoters,
  getUpvoterIds,
  getComments,
  getComment,
  createComment,
  getLatestCommentByUserOnRequest,
  getLatestCommentByUser,
  deleteComment,
  deleteCommentById,
  isUserBannedFromComments,
  addCommentBan,
  removeCommentBan,
  getCommentBans,
  createNotification,
  markNotificationsReadByRequestAndType,
  updateNotificationsByRequestAndType,
  getStaffUserIds,
  deleteRequest,
  deleteAllRequests,
  recordView,
  isProtectedUser,
  getProtectedUsersList,
  getProtectedUsersWithSocialLink,
  getProtectedUsersWithCreatorAvatar,
  addProtectedUser,
  updateProtectedUser,
  deleteProtectedUser,
  getProtectedLinks,
  getProtectionGroupsForCheck,
  addProtectedLink,
  deleteProtectedLink,
  getUserRequests,
  setCommentsLocked,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getActiveAnnouncement,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getDefaultSettings,
  setDefaultSettings,
  getUsersSearch,
  getAllUserIds,
  getSiteSetting,
  setSiteSetting,
  getMembershipSettings,
  updateMembershipSettings,
  getPopupSettings,
  updatePopupSettings,
  getEmbedSettings,
  updateEmbedSettings,
  getUserSettings,
  setUserSettings,
  getMergedUserSettings,
  getThemeSettings,
  updateThemeSettings,
  getPool
};
