import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { ResourceUploadClient } from "@/components/resources/ResourceUploadClient";

export const metadata: Metadata = {
  title: "Upload Resource | Leaker Dashboard",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

const LEAKER_ROLE_ID = process.env.DISCORD_LEAKER_ROLE_ID || "0000000000000000000";

function hasLeakerRole(rolesJson: string | null): boolean {
  if (!rolesJson) return false;
  try {
    const roles: string[] = JSON.parse(rolesJson);
    return Array.isArray(roles) && roles.includes(LEAKER_ROLE_ID);
  } catch {
    return false;
  }
}

export default async function DashboardUploadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard/upload");

  const isAdmin = session.user.role === "ADMIN";
  let isLeaker = false;
  if (!isAdmin) {
    const row = await queryOne<{ roles: string | null }>(
      "SELECT roles FROM users WHERE id = ?",
      [session.user.id]
    );
    isLeaker = hasLeakerRole(row?.roles ?? null);
  }
  if (!isAdmin && !isLeaker) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>
          <i className="bi bi-shield-lock" />
        </div>
        <h2 style={{ fontSize: 18, color: "#fff" }}>Access Denied</h2>
        <p style={{ color: "#aaa" }}>You need the <strong>Leaker</strong> role to upload resources.</p>
      </div>
    );
  }

  return (
    <ResourceUploadClient
      userName={session.user.name ?? "Unknown"}
      userAvatar={session.user.image ?? null}
    />
  );
}
