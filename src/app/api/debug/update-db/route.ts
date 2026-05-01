import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function GET() {
  try {
    console.log("Adding avatar_url column to resources_editors...");
    await execute("ALTER TABLE resources_editors ADD COLUMN avatar_url VARCHAR(2048) DEFAULT NULL AFTER social_url;");
    return NextResponse.json({ success: true, message: "Column added successfully" });
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      return NextResponse.json({ success: true, message: "Column already exists" });
    }
    return NextResponse.json({ success: false, error: err.message });
  }
}
