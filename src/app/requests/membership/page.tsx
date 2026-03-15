import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { getFaqsList } from "@/lib/dal/faqs";
import { getMembershipSettings, getSiteSetting } from "@/lib/site-settings";
import { authOptions } from "@/lib/auth-options";
import { fetchGuildMemberForSync, fetchDiscordUser, syncRequestsUser } from "@/lib/sync-requests-user";
import { queryOne } from "@/lib/db";
import { RequestsMembershipContent } from "./RequestsMembershipContent";
import { SubscriptionPlansBlock } from "./SubscriptionPlansBlock";
import "@/styles/protected-page.css";
import "../FAQ.css";
import "./Membership.css";

export const metadata: Metadata = {
  title: "Membership",
  description: "Frequently asked questions about membership.",
};

export const dynamic = "force-dynamic";

export default async function RequestsMembershipPage() {
  const [faqs, settings, session, discordUrl] = await Promise.all([
    getFaqsList({ category: "membership" }).catch((e) => {
      console.error("[requests/membership] getFaqsList failed:", e);
      return [];
    }),
    getMembershipSettings().catch((e) => {
      console.error("[requests/membership] getMembershipSettings failed:", e);
      return {} as Record<string, string>;
    }),
    getServerSession(authOptions),
    getSiteSetting("discord_url").catch(() => null),
  ]);

  const showFaq = settings.show_faq === "true";

  // Refresh Discord roles when viewing membership so "Your current plan" is up to date
  // (sync normally only runs on sign-in; if they got Leak Protection role after that, we show it here)
  let isPremium = (session?.user as { patreon_premium?: boolean } | undefined)?.patreon_premium ?? false;
  let isLeakProtection = (session?.user as { leak_protection?: boolean } | undefined)?.leak_protection ?? false;
  const discordId = (session?.user as { id?: string } | undefined)?.id;
  if (discordId) {
    try {
      const [guildMember, profile] = await Promise.all([
        fetchGuildMemberForSync(discordId),
        fetchDiscordUser(discordId),
      ]);
      if (profile) {
        await syncRequestsUser(profile, guildMember);
      }
      let row: { patreon_premium: boolean; leak_protection?: boolean | number } | null = null;
      try {
        row = await queryOne<{ patreon_premium: boolean; leak_protection?: boolean | number }>(
          "SELECT patreon_premium, COALESCE(leak_protection, 0) as leak_protection FROM users WHERE id = ?",
          [discordId]
        );
      } catch {
        row = await queryOne<{ patreon_premium: boolean }>(
          "SELECT patreon_premium FROM users WHERE id = ?",
          [discordId]
        );
      }
      if (row) {
        isPremium = Boolean(row.patreon_premium);
        isLeakProtection = "leak_protection" in row ? Boolean(row.leak_protection) : false;
      }
    } catch (e) {
      console.warn("[requests/membership] Refresh roles failed, using session:", (e as Error).message);
    }
  }

  return (
    <div className="faq-container faq-container-protected">
      <Link href="/requests" className="requests-back-link">
        ← Back to requests
      </Link>
      <SubscriptionPlansBlock
        settings={settings}
        isPremium={isPremium}
        isLeakProtection={isLeakProtection}
        discordUrl={discordUrl ?? ""}
      />
      {showFaq && (
        <RequestsMembershipContent
          faqs={faqs.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
          }))}
        />
      )}
    </div>
  );
}
