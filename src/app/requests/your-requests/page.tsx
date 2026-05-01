import type { Metadata } from "next";
import { getDiscordLoginHref } from "@/lib/discord-login-href";
import { YourRequestsClient } from "@/components/requests/YourRequestsClient";
import "@/styles/protected-page.css";
import "../YourRequests.css";

export const metadata: Metadata = {
  title: "Your requests",
  description: "View your submitted requests.",
};

export const dynamic = "force-dynamic";

export default async function YourRequestsPage() {
  const discordLoginUrl = getDiscordLoginHref("/requests/your-requests");
  return (
    <div className="your-requests-container">
      <YourRequestsClient discordLoginUrl={discordLoginUrl} />
    </div>
  );
}
