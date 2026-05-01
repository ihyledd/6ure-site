import { requireAdmin } from "@/lib/require-admin";
import { getThemeSettings } from "@/lib/site-settings";
import { ThemeForm } from "@/components/ThemeForm";

export const metadata = {
  title: "Theme",
  description: "Site-wide theme settings",
};

export default async function DashboardThemePage() {
  await requireAdmin();
  const initial = await getThemeSettings();

  return <ThemeForm initial={initial} />;
}
