import { redirect } from "next/navigation";

import { auth } from "@/auth";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth>>>;
export type AdminSession = AuthSession & {
  user: AuthSession["user"] & { role: "ADMIN" };
};

export async function requireAdmin(): Promise<AdminSession> {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard");
  if (session.user.role !== "ADMIN") redirect("/");
  return session as AdminSession;
}

