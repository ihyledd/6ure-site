import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminSidebar } from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="dash-page">
      <AdminSidebar />
      <main className="dash-main">
        <div className="dash-main-inner">{children}</div>
      </main>
    </div>
  );
}
