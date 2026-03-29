import type { Metadata } from "next";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your subscriptions and payment history.",
};

export default function AccountPage() {
  return <AccountClient />;
}
