import { AboutPage } from "@/components/AboutPage";
import { getSiteSetting } from "@/lib/site-settings";
import { countActiveApplicationForms } from "@/lib/dal/application-forms";

export default async function Home() {
  const [discordUrl, activeFormsCount] = await Promise.all([
    getSiteSetting("discord_url"),
    countActiveApplicationForms(),
  ]);
  return (
    <div className="about-wrapper">
      <AboutPage discordUrl={discordUrl} hasActiveForms={activeFormsCount > 0} />
    </div>
  );
}
