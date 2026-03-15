import { requireAdmin } from "@/lib/require-admin";
import { RequestsSettingsClient } from "./RequestsSettingsClient";

export const dynamic = "force-dynamic";

export default async function DashboardRequestsSettingsPage() {
  await requireAdmin();

  return <RequestsSettingsClient />;
}
