import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ResourceRestoreClient } from "@/components/admin/ResourceRestoreClient";

export const metadata = {
  title: "Restore Resources | Admin Dashboard",
};

export default async function AdminResourceRestorePage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return <ResourceRestoreClient />;
}
