import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      role: "USER" | "ADMIN" | "LEAKER";
      name?: string | null;
      username?: string | null;
      email?: string | null;
      image?: string | null;
      patreon_premium?: boolean;
      leak_protection?: boolean;
      boost_level?: number;
      /** Discord avatar decoration asset for Nitro profile frames */
      avatar_decoration?: string | null;
      verified?: boolean;
      tags?: string[];
    };
  }

  interface User {
    role: "USER" | "ADMIN" | "LEAKER";
  }
}

