import { requireAdmin } from "@/lib/require-admin";
import { getSiteSetting } from "@/lib/site-settings";
import { SettingsForm } from "@/components/SettingsForm";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const discordUrl = await getSiteSetting("discord_url");

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Site settings</h2>
        <p>Configure header links. Discord URL appears as an icon in the header.</p>
      </div>

      <div className="dashboard-card" style={{ maxWidth: 520 }}>
        <SettingsForm discordUrl={discordUrl ?? ""} />
      </div>
    </div>
  );
}
