import type { Metadata } from "next";
import { DiscordAccessClient } from "./DiscordAccessClient";
import "../DiscordAccess.css";

export const metadata: Metadata = {
  title: "Discord access",
  description: "How to get Discord access.",
};

export default function DiscordAccessPage() {
  return <DiscordAccessClient />;
}
