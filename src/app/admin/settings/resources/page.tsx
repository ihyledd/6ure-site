import { requireAdmin } from "@/lib/require-admin";
import { ResourcesSettingsClient } from "@/components/admin/ResourcesSettingsClient";

export default async function ResourcesSettingsPage() {
  await requireAdmin();

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Resources &amp; Downloads</h2>
        <p>Manage download password, link expiry, and bypass settings. Changes apply instantly to both the website and the Discord bot.</p>
      </div>
      <ResourcesSettingsClient />
    </div>
  );
}
