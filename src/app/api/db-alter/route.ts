import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function GET() {
  const results: any[] = [];
  try { await execute("ALTER TABLE resources_items ADD COLUMN description TEXT;"); results.push("description added"); } catch(e: any) { results.push("description err: " + e.message); }
  try { await execute("ALTER TABLE resources_items ADD COLUMN status VARCHAR(50) DEFAULT 'Completed';"); results.push("status added"); } catch(e: any) { results.push("status err: " + e.message); }
  try { await execute("ALTER TABLE resources_items ADD COLUMN counts_for_payout BOOLEAN DEFAULT true;"); results.push("counts_for_payout added"); } catch(e: any) { results.push("counts_for_payout err: " + e.message); }
  try { await execute("ALTER TABLE resources_items ADD COLUMN is_featured BOOLEAN DEFAULT false;"); results.push("is_featured added"); } catch(e: any) { results.push("is_featured err: " + e.message); }
  try { await execute("ALTER TABLE resources_items ADD COLUMN view_count INT DEFAULT 0;"); results.push("view_count added"); } catch(e: any) { results.push("view_count err: " + e.message); }
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
  } catch(e: any) {
    results.push("resource_views err: " + e.message);
  }
  
  return NextResponse.json({ results });
}
