import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";
import { getCookiePrefsFromRequest } from "@/lib/cookie-prefs-server";

const KEY = "password_view_count";
const COOKIE = "pw_viewed_at";
const SEEN_DURATION = 60 * 60 * 24; // 24 hours

export async function GET() {
  const value = await getSiteSetting(KEY);
  const count = value ? parseInt(value, 10) || 0 : 0;
  return NextResponse.json({ count });
}

export async function POST(req: NextRequest) {
  const prefs = await getCookiePrefsFromRequest();
  const getCount = async () => {
    const value = await getSiteSetting(KEY);
    return value ? parseInt(value, 10) || 0 : 0;
  };

  if (!prefs.analytics) {
    const count = await getCount();
    return NextResponse.json({ count });
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE)?.value;
  const now = Math.floor(Date.now() / 1000);
  const lastCounted = raw ? parseInt(raw, 10) : 0;
  const shouldIncrement = now - lastCounted >= SEEN_DURATION;

  if (!shouldIncrement) {
    const count = await getCount();
    return NextResponse.json({ count });
  }

  const current = await getCount();
  const next = current + 1;
  await setSiteSetting(KEY, String(next));

  const res = NextResponse.json({ count: next });
  res.cookies.set(COOKIE, String(now), {
    path: "/",
    maxAge: SEEN_DURATION,
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}
