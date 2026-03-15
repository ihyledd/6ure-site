import { requireAdmin } from "@/lib/require-admin";
import { DashboardRequestsClient } from "@/components/requests/DashboardRequestsClient";

export const dynamic = "force-dynamic";

export default async function DashboardRequestsPage() {
  await requireAdmin();

  return <DashboardRequestsClient />;
}
