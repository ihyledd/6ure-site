import { auth } from "@/auth";
import { ApplyPageClient } from "./ApplyPageClient";
import { getDiscordOAuthUrl } from "@/lib/discord-oauth-state";
import { getDiscordLoginUrl } from "@/lib/auth-urls";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Apply",
  description: "Submit your application",
};

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";

type Props = { searchParams: Promise<{ form?: string }> };

export default async function ApplyPage({ searchParams }: Props) {
  const { form: formId } = await searchParams;
  const session = await auth();
  const discordLoginUrl =
    formId != null
      ? getDiscordOAuthUrl(`${BASE.replace(/\/$/, "")}/apply?form=${formId}`) ||
        getDiscordLoginUrl(`/apply?form=${formId}`)
      : undefined;
  return (
    <ApplyPageClient
      formId={formId ?? null}
      session={session}
      discordLoginUrl={discordLoginUrl}
    />
  );
}
