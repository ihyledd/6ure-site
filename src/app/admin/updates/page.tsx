import { getManualUpdates } from "@/lib/dal/wiki-home";
import { ManualUpdateForm } from "@/components/ManualUpdateForm";
import { DeleteUpdateButton } from "@/components/DeleteUpdateButton";

export const dynamic = "force-dynamic";

export default async function DashboardUpdatesPage() {
  const updates = await getManualUpdates(50);
  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">Recent updates</h1>
      <p className="dashboard-description">Manual &quot;what&apos;s new&quot; entries and recent page changes.</p>
      <ManualUpdateForm />
      {updates.length === 0 ? (
        <p className="dashboard-empty">No updates yet.</p>
      ) : (
        <ul className="dashboard-list-plain">
          {updates.map((u) => (
            <li key={u.id} className="dashboard-card dashboard-card-app" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <strong style={{ display: "block", marginBottom: 4 }}>{u.title}</strong>
                  {u.body && <p className="dashboard-card-desc" style={{ marginTop: 8 }}>{u.body.slice(0, 200)}…</p>}
                  <p className="dashboard-card-desc" style={{ marginTop: 4 }} suppressHydrationWarning>
                    {toDate(u.createdAt).toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "short" })}
                  </p>
                </div>
                <DeleteUpdateButton id={u.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
