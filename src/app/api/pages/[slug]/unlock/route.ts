import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPageBySlug } from "@/lib/dal/pages";
import { getCookiePrefsFromRequest } from "@/lib/cookie-prefs-server";
import {
  UNLOCK_COOKIE,
  MAX_AGE,
  createSignedCookie,
  verifySignedCookie,
} from "@/lib/wiki-unlock-cookie";
import { sensitiveLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Rate limit: 3 per 5 minutes per IP (prevents password brute-forcing)
  const ip = getClientIp(req);
  const { success, reset } = sensitiveLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const { slug } = await params;
  const { password } = await req.json();

  const page = await getPageBySlug(slug);

  if (!page || !page.password) {
    return NextResponse.json({ ok: true });
  }

  if (password !== page.password) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const prefs = await getCookiePrefsFromRequest();

  const cookieStore = await cookies();
  const raw = cookieStore.get(UNLOCK_COOKIE)?.value;
  let slugs: string[] = verifySignedCookie(raw) ?? [];
  if (!slugs.includes(slug)) {
    slugs = [...slugs.filter((s) => s !== slug).slice(-48), slug];
  }

  const res = NextResponse.json({ ok: true });
  if (prefs.functional) {
    res.cookies.set(UNLOCK_COOKIE, createSignedCookie(slugs), {
      path: "/",
      maxAge: MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
