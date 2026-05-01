import { getDataExportRequests } from "@/lib/dal/data-export";
import { ExportRequestsClient } from "./ExportRequestsClient";

export const dynamic = "force-dynamic";

export default async function ExportRequestsPage() {
  const requests = await getDataExportRequests(100);
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">Data Export Requests</h1>
      <p className="dashboard-description">
        GDPR data portability requests. Process manually and notify users when their export is ready.
        {pendingCount > 0 && (
          <span style={{ display: "block", marginTop: 8, color: "var(--discord-blurple)" }}>
            {pendingCount} pending request{pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </p>

      {requests.length === 0 ? (
        <div className="dashboard-card">
          <p className="dashboard-empty">No export requests yet.</p>
        </div>
      ) : (
        <ExportRequestsClient requests={requests} />
      )}
    </div>
  );
}
