/**
 * POST /api/download/[slug]/download — validate token, track download, return actual URL
 *
 * Body: { token: string }
 * Server validates HMAC token + expiry, then:
 *   - If link has sftpgoPath → auto-generate a fresh SFTPGo share (time-limited, single-use)
 *   - Otherwise → return the static downloadUrl
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAdDownloadLink,
  validateDownloadToken,
  trackAdEvent,
} from "@/lib/ad-download";
import { createSftpgoShare } from "@/lib/sftpgo-client";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const link = await getAdDownloadLink(slug);
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Validate HMAC token
  const valid = validateDownloadToken(token, link.id);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid or expired download token. Please watch the video again." },
      { status: 403 }
    );
  }

  // Track download
  await trackAdEvent(link.id, "download", request);

  // If sftpgoPath is set, generate a fresh SFTPGo share on-the-fly
  if (link.sftpgo_path) {
    try {
      const share = await createSftpgoShare(link.sftpgo_path, {
        maxTokens: 1,       // single-use
        expiryHours: 24,    // 24 hour expiry
      });
      return NextResponse.json({ url: share.url });
    } catch (err) {
      console.error("[ad-download] SFTPGo share creation failed:", err);
      // Fall back to static URL if SFTPGo fails
      if (link.download_url) {
        return NextResponse.json({ url: link.download_url });
      }
      return NextResponse.json(
        { error: "Failed to generate download link. Please try again." },
        { status: 500 }
      );
    }
  }

  // Otherwise use the static download URL
  return NextResponse.json({ url: link.download_url });
}
