import Link from "next/link";

import { getPagesForAdmin } from "@/lib/dal/pages";
import { ImportWikiButton } from "@/components/ImportWikiButton";
import { AdminPageList } from "@/components/AdminPageList";

export default async function AdminHome() {
  const pages = await getPagesForAdmin(100);

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Pages</h2>
        <p>Manage wiki pages. Import markdown from GitHub 6ure-wiki (excludes privacy &amp; TOS).</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <ImportWikiButton />
        <Link href="/dashboard/pages/new" className="dashboard-btn dashboard-btn-primary">
          New page
        </Link>
      </div>

      <AdminPageList
        pages={pages.map((p) => ({
          ...p,
          updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt as string),
        }))}
      />
    </div>
  );
}
