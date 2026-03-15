import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { getFaqsList } from "@/lib/dal/faqs";
import { getMembershipSettings, getSiteSetting } from "@/lib/site-settings";
import { authOptions } from "@/lib/auth-options";
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
  const user = session?.user as { patreon_premium?: boolean; leak_protection?: boolean } | undefined;

  return (
    <div className="faq-container faq-container-protected">
      <Link href="/requests" className="requests-back-link">
        ← Back to requests
      </Link>
      <SubscriptionPlansBlock
        settings={settings}
        isPremium={user?.patreon_premium ?? false}
        isLeakProtection={user?.leak_protection ?? false}
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
