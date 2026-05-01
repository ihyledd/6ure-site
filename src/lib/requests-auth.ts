import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export type RequestsUser = {
  id: string;
  username: string;
  discord_handle?: string | null;
  avatar?: string;
  guild_nickname?: string | null;
  guild_avatar?: string | null;
  isStaff?: boolean;
};

export type WikiSession = {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    role: "USER" | "ADMIN" | "LEAKER";
  };
};

export async function getRequestsSession(): Promise<WikiSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
      username: session.user.username ?? null,
      image: session.user.image ?? null,
      role: session.user.role ?? "USER",
    },
  };
}
