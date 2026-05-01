const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '6ure_requests',
  });

  try {
    console.log('Adding avatar_url column...');
    await pool.execute('ALTER TABLE resources_editors ADD COLUMN avatar_url VARCHAR(2048) DEFAULT NULL AFTER social_url');
    console.log('Success!');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error:', err);
    }
  } finally {
    await pool.end();
  }
}

main();
