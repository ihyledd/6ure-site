/**
 * POST /api/promotions/upload-video — upload ad video file (admin only)
 * Accepts multipart FormData, saves to public/uploads/ad-videos/
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "ad-videos");
const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export async function POST(request: NextRequest) {
  await requireAdmin();

  const formData = await request.formData();
  const file = formData.get("video") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No video file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 100MB` },
      { status: 400 }
    );
  }

  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Generate unique filename
  const ext = file.name.split(".").pop() || "mp4";
  const uniqueName = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const filePath = join(UPLOAD_DIR, uniqueName);

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const publicUrl = `/uploads/ad-videos/${uniqueName}`;

  return NextResponse.json({ url: publicUrl, filename: uniqueName }, { status: 201 });
}
