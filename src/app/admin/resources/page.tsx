import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ResourcesManageClient } from "@/components/admin/ResourcesManageClient";

export const metadata = {
  title: "Manage Resources | Admin Dashboard",
};

export default async function AdminResourcesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return <ResourcesManageClient />;
}
