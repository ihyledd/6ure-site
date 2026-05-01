import { getContactMessages } from "@/lib/dal/contact";

export const dynamic = "force-dynamic";

export default async function DashboardMessagesPage() {
  const messages = await getContactMessages(100);
  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">Contact messages</h1>
      <p className="dashboard-description">Messages submitted via the contact form.</p>
      {messages.length === 0 ? (
        <p className="dashboard-empty">No messages yet.</p>
      ) : (
        <ul className="dashboard-list-plain">
          {messages.map((m) => (
            <li key={m.id} className="dashboard-card dashboard-card-app" style={{ marginBottom: 12 }}>
              <strong style={{ display: "block", marginBottom: 4 }}>{m.name}</strong>
              <span className="dashboard-card-desc">({m.email})</span>
              <p className="dashboard-card-desc" style={{ marginTop: 8 }}>{m.message}</p>
              <p className="dashboard-card-desc" style={{ marginTop: 4 }} suppressHydrationWarning>
                {toDate(m.createdAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
