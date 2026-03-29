import type { Metadata } from "next";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "My Account — 6URE",
  description: "Manage your subscriptions, view payment history, and update your settings.",
};

export default function AccountPage() {
  return <AccountClient />;
}
