import type { Metadata } from "next";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Subscription management dashboard.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
