import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { getFaqsList } from "@/lib/dal/faqs";
import { getMembershipSettings, getSiteSetting } from "@/lib/site-settings";
import { authOptions } from "@/lib/auth-options";
import { fetchGuildMemberForSync, fetchDiscordUser, syncRequestsUser } from "@/lib/sync-requests-user";
import { queryOne, query } from "@/lib/db";
import { getDiscordLoginHref } from "@/lib/discord-login-href";
import { RequestsMembershipContent } from "./RequestsMembershipContent";
import { SubscriptionPlansBlock } from "./SubscriptionPlansBlock";
import "@/styles/protected-page.css";
import "../requests/FAQ.css";
import "./Membership.css";

export const metadata: Metadata = {
  title: "Membership",
  description: "Frequently asked questions about membership.",
};

export const dynamic = "force-dynamic";

export default async function RequestsMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const messageParam = typeof params.message === "string" ? params.message : undefined;
  const planParam = typeof params.plan === "string" ? params.plan : undefined;
  const intervalParam = typeof params.interval === "string" ? params.interval : undefined;

  const [faqs, settings, session, discordUrl] = await Promise.all([
    getFaqsList({ category: "membership" }).catch((e) => {
      console.error("[membership] getFaqsList failed:", e);
      return [];
    }),
    getMembershipSettings().catch((e) => {
      console.error("[membership] getMembershipSettings failed:", e);
      return {} as Record<string, string>;
    }),
    getServerSession(authOptions),
    getSiteSetting("discord_url").catch(() => null),
  ]);

  const showFaq = settings.show_faq === "true";

  // Refresh Discord roles when viewing membership so "Your current plan" is up to date
  let isPremium = (session?.user as { patreon_premium?: boolean } | undefined)?.patreon_premium ?? false;
  let isLeakProtection = (session?.user as { leak_protection?: boolean } | undefined)?.leak_protection ?? false;
  let rolePremium = false;
  let roleLP = false;
  let premiumSub: { id: string; category: string; interval: string } | null = null;
  let lpSub: { id: string; category: string; interval: string } | null = null;
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
        row = (await queryOne<{ patreon_premium: boolean; leak_protection?: boolean | number }>(
          "SELECT patreon_premium, COALESCE(leak_protection, 0) as leak_protection FROM users WHERE id = ?",
          [discordId]
        )) ?? null;
      } catch {
        row = (await queryOne<{ patreon_premium: boolean }>(
          "SELECT patreon_premium FROM users WHERE id = ?",
          [discordId]
        )) ?? null;
      }

      // Check PayPal subscriptions too — keep granular info for the UI
      let hasPaypalPremium = false;
      let hasPaypalLP = false;
      try {
        const paypalSubs = await query<{ id: string; plan_category: string; plan_interval: string }>(
          "SELECT id, plan_category, plan_interval FROM subscriptions WHERE user_id = ? AND (status = 'ACTIVE' OR (status IN ('CANCELLED', 'SUSPENDED') AND current_period_end > NOW()))",
          [discordId]
        );
        for (const sub of paypalSubs) {
          if (sub.plan_category === "PREMIUM") {
            hasPaypalPremium = true;
            premiumSub = { id: sub.id, category: sub.plan_category, interval: sub.plan_interval };
          }
          if (sub.plan_category === "LEAK_PROTECTION") {
            hasPaypalLP = true;
            lpSub = { id: sub.id, category: sub.plan_category, interval: sub.plan_interval };
          }
        }
      } catch {
        // ignore
      }

      if (row) {
        rolePremium = Boolean(row.patreon_premium);
        roleLP = "leak_protection" in row ? Boolean(row.leak_protection) : false;
        isPremium = rolePremium || hasPaypalPremium;
        isLeakProtection = roleLP || hasPaypalLP;
      } else {
        isPremium = hasPaypalPremium;
        isLeakProtection = hasPaypalLP;
      }
    } catch (e) {
      console.warn("[membership] Refresh roles failed, using session:", (e as Error).message);
    }
  }

  const discordLoginUrl = getDiscordLoginHref("/membership");

  return (
    <div className="faq-container faq-container-protected">
      <Link href="/requests" className="requests-back-link">
        ← Back to requests
      </Link>
      <SubscriptionPlansBlock
        discordLoginUrl={discordLoginUrl}
        settings={settings}
        isPremium={isPremium}
        isLeakProtection={isLeakProtection}
        rolePremium={rolePremium}
        roleLP={roleLP}
        premiumSub={premiumSub}
        lpSub={lpSub}
        discordUrl={discordUrl ?? ""}
        isAuthenticated={!!discordId}
        statusParam={statusParam}
        messageParam={messageParam}
        planParam={planParam as "PREMIUM" | "LEAK_PROTECTION" | undefined}
        intervalParam={intervalParam as "MONTHLY" | "YEARLY" | "LIFETIME" | undefined}
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
