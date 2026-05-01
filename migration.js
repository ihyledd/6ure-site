const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'B)E6Nid3%V',
    database: '6ure_requests',
    port: 3306
  });

  try {
    console.log('Adding view_count column...');
    await pool.query("ALTER TABLE resources_items ADD COLUMN view_count INT DEFAULT 0");
    console.log('view_count column added.');
  } catch (e) {
    console.log('view_count column error:', e.message);
  }

  try {
    console.log('Creating resource_views table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resource_views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resource_id INT NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_view (resource_id, session_id)
      )
    `);
    console.log('resource_views table created.');
  } catch (e) {
    console.log('resource_views table error:', e.message);
  }

  await pool.end();
}

migrate();
