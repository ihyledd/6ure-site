"use client";

import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/requests/AnnouncementBar";

/** Renders AnnouncementBar only on /requests routes. */
export function AnnouncementBarGate() {
  const pathname = usePathname();
  if (!pathname?.startsWith("/requests")) return null;
  return <AnnouncementBar />;
}
