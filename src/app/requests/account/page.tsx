import type { Metadata } from "next";
import Link from "next/link";
import { getDiscordLoginHref } from "@/lib/discord-login-href";
import { UserAccountClient } from "./UserAccountClient";
import "@/styles/protected-page.css";
import "@/styles/account-page.css";

export const metadata: Metadata = {
  title: "Account & Subscriptions",
  description: "Manage your subscriptions and account settings.",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const discordLoginUrl = getDiscordLoginHref("/requests/account");
  return (
    <div className="account-page-shell">
      <Link href="/requests" className="account-back-link">
        ← Back to requests
      </Link>
      <UserAccountClient discordLoginUrl={discordLoginUrl} />
    </div>
  );
}
