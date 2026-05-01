import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LeakerSidebar } from "@/components/LeakerSidebar";
import "@/styles/dashboard.css"; // Ensure leaker dashboard gets the dashboard styles

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaker Dashboard",
  robots: "noindex, nofollow",
};

export default async function LeakerDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard");
  
  if ((session.user.role as string) !== "LEAKER" && (session.user.role as string) !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="dash-page">
      <LeakerSidebar />
      <main className="dash-main">
        <div className="dash-main-inner">{children}</div>
      </main>
    </div>
  );
}
