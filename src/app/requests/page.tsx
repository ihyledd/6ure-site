import type { Metadata } from "next";
import { getRequestStats } from "@/lib/requests-api";
import { getRequestsDisplaySettings } from "@/lib/site-settings";
import { RequestsPageClient } from "@/components/requests/RequestsPageClient";
import { getDiscordOAuthUrl } from "@/lib/discord-oauth-state";
import { getDiscordLoginUrl } from "@/lib/auth-urls";

export const metadata: Metadata = {
  title: "Requests",
  description: "Request and discover content.",
};

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";

type QuickLinksPosition = "sidebar" | "footer" | "hidden";

function normalizeQuickLinksPosition(pos: string | undefined | null): QuickLinksPosition {
  if (pos === "footer" || pos === "hidden") return pos;
  return "sidebar";
}

export default async function RequestsPage() {
  let stats = { total: 0, pending: 0, completed: 0, users: 0 };
  try {
    stats = await getRequestStats();
  } catch {
    // use defaults
  }

  let initialQuickLinksPosition: QuickLinksPosition = "sidebar";
  let initialShowStaffBadge = false;
  try {
    const display = await getRequestsDisplaySettings();
    initialQuickLinksPosition = normalizeQuickLinksPosition(display?.quick_links_position);
    initialShowStaffBadge = (display?.staff_badge_visible ?? "false") === "true";
  } catch {
    // use defaults
  }

  const callbackUrl = `${BASE.replace(/\/$/, "")}/requests`;
  const discordLoginUrl = getDiscordOAuthUrl(callbackUrl) || getDiscordLoginUrl("/requests");

  return (
    <div className="requests-page-wrapper">
      <RequestsPageClient
        initialStats={stats}
        discordLoginUrl={discordLoginUrl}
        initialQuickLinksPosition={initialQuickLinksPosition}
        initialShowStaffBadge={initialShowStaffBadge}
      />
    </div>
  );
}
