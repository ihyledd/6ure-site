import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DownloadsLogClient } from "@/components/admin/DownloadsLogClient";

export const metadata = {
  title: "Download Logs | Admin Dashboard",
};

export default async function AdminDownloadsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return <DownloadsLogClient />;
}
