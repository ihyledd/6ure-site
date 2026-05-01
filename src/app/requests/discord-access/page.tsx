import type { Metadata } from "next";
import { DiscordAccessClient } from "./DiscordAccessClient";
import "../DiscordAccess.css";

export const metadata: Metadata = {
  title: "Discord access",
  description: "How to get Discord access.",
};

import { getSiteSetting } from "@/lib/site-settings";

export default async function DiscordAccessPage() {
  const discordUrl = await getSiteSetting("discord_url");
  return <DiscordAccessClient discordUrl={discordUrl || undefined} />;
}
