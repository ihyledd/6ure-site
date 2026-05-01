import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  getPageIdViewCountBySlug,
  incrementPageViewCount,
  getPageViewCountAfterIncrement,
} from "@/lib/dal/pages";
import { getCookiePrefsFromRequest } from "@/lib/cookie-prefs-server";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

const VIEW_COOKIE = "wiki_viewed";
const MAX_AGE = 60 * 60 * 24; // 1 day

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(_req);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const { slug } = await params;
  const page = await getPageIdViewCountBySlug(slug);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prefs = await getCookiePrefsFromRequest();
  if (!prefs.analytics) {
    return NextResponse.json({ viewCount: page.viewCount });
  }

  const cookieStore = await cookies();
  const viewed = cookieStore.get(VIEW_COOKIE)?.value ?? "[]";
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(viewed);
    ids = Array.isArray(parsed) ? parsed : [];
  } catch {
    ids = [];
  }
  if (ids.includes(page.id)) {
    return NextResponse.json({ viewCount: page.viewCount });
  }

  await incrementPageViewCount(page.id);
  const updatedCount = await getPageViewCountAfterIncrement(page.id);

  const next = JSON.stringify([...ids.slice(-99), page.id]);
  const res = NextResponse.json({ viewCount: updatedCount });
  res.cookies.set(VIEW_COOKIE, next, { path: "/", maxAge: MAX_AGE, httpOnly: true, sameSite: "lax" });
  return res;
}
