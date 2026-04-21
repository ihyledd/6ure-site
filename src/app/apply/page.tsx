import { auth } from "@/auth";
import { ApplyPageClient } from "./ApplyPageClient";
import { getDiscordLoginHref } from "@/lib/discord-login-href";

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
      ? getDiscordLoginHref(`${BASE.replace(/\/$/, "")}/apply?form=${formId}`)
      : undefined;
  return (
    <ApplyPageClient
      formId={formId ?? null}
      session={session}
      discordLoginUrl={discordLoginUrl}
    />
  );
}
