import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/** After logout, stay on current page. Use canonical site URL from env when behind proxy (avoids localhost redirect). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("callbackUrl") ?? searchParams.get("redirect");
  const siteUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.FRONTEND_URL;
  const origin = siteUrl ? new URL(siteUrl).origin : request.nextUrl.origin;

  let target = "/";
  if (typeof raw === "string") {
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      target = raw;
    } else if (raw.startsWith("http")) {
      try {
        const u = new URL(raw);
        target = u.pathname + u.search || "/";
      } catch {
        // ignore invalid URL
      }
    }
  }

  // If target requires auth (dashboard/admin), redirect to home after logout
  if (target.startsWith("/dashboard") || target.startsWith("/admin")) {
    target = "/";
  }

  const session = await getServerSession(authOptions);
  if (session) {
    const signOutUrl = new URL("/api/auth/signout", origin + "/");
    signOutUrl.searchParams.set("callbackUrl", `${origin}${target}`);
    return NextResponse.redirect(signOutUrl.toString());
  }

  return NextResponse.redirect(`${origin}${target}`);
}
