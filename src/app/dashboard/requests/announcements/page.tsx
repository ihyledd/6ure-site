import { requireAdmin } from "@/lib/require-admin";
import { AnnouncementsManageClient } from "@/components/requests/AnnouncementsManageClient";

export const dynamic = "force-dynamic";

export default async function DashboardRequestsAnnouncementsPage() {
  await requireAdmin();

  return <AnnouncementsManageClient />;
}
