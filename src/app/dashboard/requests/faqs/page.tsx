import { requireAdmin } from "@/lib/require-admin";
import { FaqsManageClient } from "@/components/requests/FaqsManageClient";

export const dynamic = "force-dynamic";

export default async function DashboardRequestsFaqsPage() {
  await requireAdmin();

  return <FaqsManageClient />;
}
