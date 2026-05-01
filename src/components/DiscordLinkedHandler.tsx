"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Redirects to callbackUrl when landing on / after OAuth (or when callbackUrl is present). */
export function DiscordLinkedHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== "/") return;
    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      window.history.replaceState({}, "", "/");
      window.location.href = callbackUrl;
    }
  }, [pathname, searchParams]);

  return null;
}
