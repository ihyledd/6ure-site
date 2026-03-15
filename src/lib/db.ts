/**
 * MySQL connection pool using DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT only.
 * No DATABASE_URL; server-side only.
 */

import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

function getPoolConfig(): mysql.PoolOptions {
  const host = process.env.DB_HOST ?? "localhost";
  const port = parseInt(process.env.DB_PORT ?? "3306", 10);
  const user = process.env.DB_USER ?? "root";
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME ?? "6ure_requests";
  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
  };
}

export function getPool(): mysql.Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = mysql.createPool(getPoolConfig());
  }
  return globalForDb.pool;
}

export type Row = Record<string, unknown>;

/**
 * Sanitize params for MySQL 8.0.22+ prepared statements.
 * MySQL 8.0.22+ rejects some numeric types in execute(); converting numbers to strings
 * avoids "Incorrect arguments to mysqld_stmt_execute" (see mysql2#1239, #1521).
 */
function sanitizeParams(params: unknown[]): (string | number | null | Date)[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (p === null) return null;
    if (typeof p === "bigint") return String(p);
    if (typeof p === "number") {
      if (!Number.isFinite(p)) return "0";
      return String(p);
    }
    if (p instanceof Date) return p;
    if (typeof p === "boolean") return p ? "1" : "0";
    return String(p);
  });
}

/**
 * Execute a query with optional params (uses ? placeholders).
 * Returns rows as array of plain objects.
 */
export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = getPool();
  const safe = sanitizeParams(params);
  const [rows] = await pool.execute(sql, safe);
  return (rows as T[]) || [];
}

/**
 * Execute a query and return the first row or undefined.
 */
export async function queryOne<T = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

/**
 * Execute an insert/update/delete and return the result (affectedRows, insertId, etc.).
 */
export async function execute(sql: string, params: unknown[] = []): Promise<mysql.ResultSetHeader> {
  const pool = getPool();
  const safe = sanitizeParams(params);
  const [result] = await pool.execute(sql, safe);
  return result as mysql.ResultSetHeader;
}
