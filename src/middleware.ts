import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  // Reduce stale page serving after deploy (Server Action mismatch)
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
