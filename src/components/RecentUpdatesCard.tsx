import Link from "next/link";

export type UpdateEntry = {
  type: "manual" | "auto";
  id: string;
  title: string;
  body: string | null;
  date: Date;
  slug: string | null;
};

export function RecentUpdatesCard({ updates }: { updates: UpdateEntry[] }) {
  if (updates.length === 0) return null;
  return (
    <div className="wiki-updates-card wiki-card">
      <div className="wiki-updates-card-header">
        <h2 className="wiki-updates-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--discord-blurple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Recent updates
        </h2>
      </div>
      <ul className="wiki-updates-list">
        {updates.map((u) => (
          <li key={u.type === "manual" ? `m-${u.id}` : `p-${u.id}`} className="wiki-updates-item">
            {u.slug ? (
              <Link href={`/wiki/p/${u.slug}`} className="wiki-updates-row">
                <span className="wiki-updates-row-title">{u.title}</span>
                {u.type === "auto" ? (
                  <span className="wiki-updates-badge">Updated</span>
                ) : (
                  <span className="wiki-updates-badge wiki-updates-badge-manual">Announcement</span>
                )}
                <span className="wiki-updates-row-date">
                  {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(u.date)}
                </span>
              </Link>
            ) : (
              <div className="wiki-updates-row wiki-updates-row-static">
                <span className="wiki-updates-row-title">{u.title}</span>
                <span className="wiki-updates-badge wiki-updates-badge-manual">Announcement</span>
                <span className="wiki-updates-row-date">
                  {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(u.date)}
                </span>
                {u.body && <p className="wiki-updates-body">{u.body}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
