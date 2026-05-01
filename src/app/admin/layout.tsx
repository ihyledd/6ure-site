import { redirect } from "next/navigation";

import "@/styles/dashboard.css";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="dashboard-page">
      <AdminSidebar />
      <main className="dashboard-main">
        <div className="dashboard-main-inner">{children}</div>
      </main>
    </div>
  );
}
