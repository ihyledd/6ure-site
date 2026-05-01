import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { execute } from "@/lib/db";
import { cookies } from "next/headers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  
  // Use a cookie-based session ID to ensure "one view per session"
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("view_session_id")?.value;
  
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // Set a session cookie (expires when browser closes)
    cookieStore.set("view_session_id", sessionId, { httpOnly: true, path: "/" });
  }

  try {
    // Attempt to insert into resource_views. 
    // The UNIQUE KEY (resource_id, session_id) prevents multiple counts in the same session.
    const res = await execute(
      "INSERT IGNORE INTO resource_views (resource_id, session_id) VALUES (?, ?)",
      [id, sessionId]
    );

    // If a new row was inserted (affectedRows > 0), increment the view_count in resources_items
    if (res.affectedRows > 0) {
      await execute(
        "UPDATE resources_items SET view_count = view_count + 1 WHERE id = ?",
        [id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[view/POST] Error:", err);
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
  }
}
