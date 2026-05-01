const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '6ure_requests',
  });

  try { await pool.execute('ALTER TABLE resources_items ADD COLUMN description TEXT;'); } catch(e) { console.log('description exists'); }
  try { await pool.execute("ALTER TABLE resources_items ADD COLUMN status VARCHAR(50) DEFAULT 'Completed';"); } catch(e) { console.log('status exists'); }
  try { await pool.execute('ALTER TABLE resources_items ADD COLUMN counts_for_payout BOOLEAN DEFAULT true;'); } catch(e) { console.log('counts_for_payout exists'); }
  try { await pool.execute('ALTER TABLE resources_items ADD COLUMN is_featured BOOLEAN DEFAULT false;'); } catch(e) { console.log('is_featured exists'); }
  
  console.log('Done altering table');
  process.exit(0);
}

main();
