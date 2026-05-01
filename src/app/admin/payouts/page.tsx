import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PayoutsManageClient } from "@/components/admin/PayoutsManageClient";

export const metadata = {
  title: "Leaker Payouts | Admin Dashboard",
};

export default async function AdminPayoutsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return <PayoutsManageClient />;
}
