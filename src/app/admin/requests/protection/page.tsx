import { requireAdmin } from "@/lib/require-admin";
import { ProtectionManageClient } from "@/components/requests/ProtectionManageClient";

export const dynamic = "force-dynamic";

export default async function DashboardRequestsProtectionPage() {
  await requireAdmin();
  return <ProtectionManageClient />;
}
