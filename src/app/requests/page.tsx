import type { Metadata } from "next";
import { getRequestStats, getRequestsList, getUpvotedRequestIdsForUser } from "@/lib/requests-api";
import { getRequestsDisplaySettings } from "@/lib/site-settings";
import { RequestsPageClient } from "@/components/requests/RequestsPageClient";
import { getDiscordLoginHref } from "@/lib/discord-login-href";
import { auth } from "@/auth";

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
  // Fetch stats, display settings, first page of requests, AND session in parallel
  const [statsResult, displayResult, requestsResult, session] = await Promise.allSettled([
    getRequestStats(),
    getRequestsDisplaySettings(),
    getRequestsList({ page: 1, limit: 21, sortBy: "recent", order: "desc" }),
    auth(),
  ]);

  const stats = statsResult.status === "fulfilled" ? statsResult.value : { total: 0, pending: 0, completed: 0, users: 0 };

  let initialQuickLinksPosition: QuickLinksPosition = "sidebar";
  let initialShowStaffBadge = false;
  if (displayResult.status === "fulfilled" && displayResult.value) {
    initialQuickLinksPosition = normalizeQuickLinksPosition(displayResult.value.quick_links_position);
    initialShowStaffBadge = (displayResult.value.staff_badge_visible ?? "false") === "true";
  }

  let initialRequests: unknown[] = [];
  let initialPagination = { page: 1, limit: 21, total: 0, totalPages: 0 };
  if (requestsResult.status === "fulfilled") {
    initialRequests = requestsResult.value.requests;
    initialPagination = requestsResult.value.pagination;

    // Mark upvoted requests if user is logged in
    const userSession = session.status === "fulfilled" ? session.value : null;
    if (userSession?.user?.id && initialRequests.length > 0) {
      try {
        const ids = initialRequests.map((r: any) => r.id);
        const upvotedIds = await getUpvotedRequestIdsForUser(userSession.user.id, ids);
        for (const r of initialRequests as any[]) {
          r.hasUpvoted = upvotedIds.has(r.id);
        }
      } catch {
        // Upvote status is non-critical
      }
    }
  }

  const callbackUrl = `${BASE.replace(/\/$/, "")}/requests`;
  const discordLoginUrl = getDiscordLoginHref(callbackUrl);

  return (
    <div className="requests-page-wrapper">
      <RequestsPageClient
        initialStats={stats}
        discordLoginUrl={discordLoginUrl}
        initialQuickLinksPosition={initialQuickLinksPosition}
        initialShowStaffBadge={initialShowStaffBadge}
        initialRequests={initialRequests as any}
        initialPagination={initialPagination}
      />
    </div>
  );
}
