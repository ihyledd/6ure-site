import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CommentsManageClient } from "@/components/admin/CommentsManageClient";

export const metadata = {
  title: "Moderate Comments | Admin Dashboard",
};

export default async function AdminCommentsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return <CommentsManageClient />;
}
