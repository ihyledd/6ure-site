"use client";

import { usePathname } from "next/navigation";
import { ScrollToTop } from "@/components/ScrollToTop";
import { WikiFloatingSearch } from "@/components/WikiFloatingSearch";
import { FloatingNotifications } from "@/components/FloatingNotifications";
import { FloatingAnnouncements } from "@/components/FloatingAnnouncements";

/** Groups floating search (wiki only) + notifications (requests) + announcements (gift icon) + scroll-to-top. */
export function FloatingActions() {
  const pathname = usePathname();
  const isWiki = pathname?.startsWith("/wiki") ?? false;
  const isRequests = pathname?.startsWith("/requests") ?? false;

  return (
    <div className="wiki-floating-actions">
      {isWiki && <WikiFloatingSearch />}
      {isRequests && <FloatingNotifications />}
      <FloatingAnnouncements />
      <ScrollToTop />
    </div>
  );
}
