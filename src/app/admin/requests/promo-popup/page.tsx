import { requireAdmin } from "@/lib/require-admin";
import { PromoPopupManageClient } from "@/components/requests/PromoPopupManageClient";

export const dynamic = "force-dynamic";

export default async function PromoPopupDashboardPage() {
  await requireAdmin();
  return <PromoPopupManageClient />;
}
