/**
 * Debug script for GET /api/requests 500 error.
 * Run: node tmp/debug-api-requests.js
 * Output: tmp/debug-output.txt
 *
 * Requires: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (or .env)
 */

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const OUTPUT_PATH = path.join(__dirname, "debug-output.txt");

function log(msg) {
  const line = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
  console.log(line);
  return line + "\n";
}

async function run() {
  const lines = [];
  const append = (msg) => lines.push(log(msg));

  append("=== Debug API Requests - " + new Date().toISOString() + " ===\n");

  // 1. Env check
  const host = process.env.DB_HOST ?? "localhost";
  const port = parseInt(process.env.DB_PORT ?? "3306", 10);
  const user = process.env.DB_USER ?? "root";
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME ?? "6ure_requests";

  append("DB config (passwords masked):");
  append({ host, port, user, password: password ? "***" : "(empty)", database });

  let pool;
  try {
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 2,
    });
    append("\n1. DB connection: OK");
  } catch (err) {
    append("\n1. DB connection: FAILED - " + (err?.message || err));
    fs.writeFileSync(OUTPUT_PATH, lines.join(""));
    process.exit(1);
  }

  const query = async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  };

  // 2. Tables existence
  append("\n2. Tables:");
  const tablesToCheck = [
    "requests",
    "users",
    "comments",
    "upvotes",
    "User",
    "Account",
    "Session",
  ];
  for (const t of tablesToCheck) {
    try {
      const rows = await query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
        [database, t]
      );
      append(`  ${t}: ${rows.length > 0 ? "EXISTS" : "MISSING"}`);
    } catch (e) {
      append(`  ${t}: ERROR - ${e.message}`);
    }
  }

  // 3. Columns in users
  append("\n3. users columns (avatar_decoration, patreon_premium, roles):");
  const userCols = ["avatar_decoration", "patreon_premium", "roles"];
  for (const col of userCols) {
    try {
      const rows = await query(
        `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'users' AND column_name = ?`,
        [database, col]
      );
      append(`  users.${col}: ${rows.length > 0 ? "EXISTS" : "MISSING"}`);
    } catch (e) {
      append(`  users.${col}: ERROR - ${e.message}`);
    }
  }

  // 4. Columns in requests
  append("\n4. requests columns (price_numeric, anonymous):");
  const reqCols = ["price_numeric", "anonymous"];
  for (const col of reqCols) {
    try {
      const rows = await query(
        `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'requests' AND column_name = ?`,
        [database, col]
      );
      append(`  requests.${col}: ${rows.length > 0 ? "EXISTS" : "MISSING"}`);
    } catch (e) {
      append(`  requests.${col}: ERROR - ${e.message}`);
    }
  }

  // 5. Test query (same as getRequestsList)
  append("\n5. Test query (getRequestsList equivalent):");
  try {
    const rows = await query(
      `SELECT r.*,
        CASE WHEN r.anonymous = 1 THEN 'Anonymous' ELSE COALESCE(u.username, 'Anonymous') END as username,
        CASE WHEN r.anonymous = 1 THEN NULL ELSE u.avatar END as avatar,
        u.avatar_decoration,
        COALESCE(u.patreon_premium, 0) as patreon_premium,
        u.roles as user_roles,
        (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) as comments_count
       FROM requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.status != 'cancelled'
       ORDER BY r.created_at DESC, r.upvotes DESC
       LIMIT 5 OFFSET 0`,
      []
    );
    append(`  Rows returned: ${rows.length}`);
    if (rows.length > 0) {
      const sample = rows[0];
      append("  Sample row keys: " + Object.keys(sample).join(", "));
      append("  user_roles type: " + typeof sample.user_roles);
    }
  } catch (e) {
    append(`  ERROR: ${e.message}`);
    append("  Stack: " + (e.stack || ""));
  }

  // 6. Count query
  append("\n6. Count query:");
  try {
    const [countRow] = await query(
      `SELECT COUNT(*) as total FROM requests r LEFT JOIN users u ON r.user_id = u.id WHERE r.status != 'cancelled'`,
      []
    );
    append(`  Total requests: ${countRow?.total ?? "N/A"}`);
  } catch (e) {
    append(`  ERROR: ${e.message}`);
  }

  await pool.end();
  append("\n=== Done ===");

  fs.writeFileSync(OUTPUT_PATH, lines.join(""));
  console.log("\nOutput written to:", OUTPUT_PATH);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
