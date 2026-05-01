import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function GET() {
  const results: string[] = [];
  try {
    await execute("ALTER TABLE resources_items ADD COLUMN view_count INT DEFAULT 0");
    results.push("view_count column added");
  } catch (e: any) {
    results.push("view_count error: " + e.message);
  }

  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS resource_views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resource_id INT NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_view (resource_id, session_id)
      )
    `);
    results.push("resource_views table created");
  } catch (e: any) {
    results.push("resource_views error: " + e.message);
  }

  return NextResponse.json({ results });
}
