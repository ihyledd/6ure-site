/**
 * NextAuth database adapter using raw MySQL (mysql2).
 * Tables: User, Account, Session, VerificationToken (Prisma default names).
 */

import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from "next-auth/adapters";
import { queryOne, execute } from "./db";

function cuid(): string {
  const prefix = "c";
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 15);
  return `${prefix}${timestamp}${randomPart}`.slice(0, 25);
}

function toDate(val: Date | string | null): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val;
  return new Date(val);
}

async function getUserId(id: string): Promise<AdapterUser | null> {
  const row = await queryOne<{ id: string; name: string | null; email: string | null; emailVerified: Date | string | null; image: string | null }>(
    `SELECT id, name, email, emailVerified, image FROM \`User\` WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: toDate(row.emailVerified),
    image: row.image,
  } as AdapterUser;
}

export function MysqlAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const id = cuid();
      const now = new Date();
      await execute(
        `INSERT INTO \`User\` (id, name, email, emailVerified, image, passwordHash, role, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          user.name ?? null,
          user.email ?? null,
          user.emailVerified ? toDate(user.emailVerified) : null,
          user.image ?? null,
          null,
          "USER",
          now,
          now,
        ]
      );
      return {
        id,
        name: user.name ?? null,
        email: user.email ?? null,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      } as AdapterUser;
    },

    async getUser(id) {
      return getUserId(id);
    },

    async getUserByEmail(email) {
      const row = await queryOne<{ id: string; name: string | null; email: string | null; emailVerified: Date | string | null; image: string | null }>(
        `SELECT id, name, email, emailVerified, image FROM \`User\` WHERE email = ?`,
        [email]
      );
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: toDate(row.emailVerified),
        image: row.image,
      } as AdapterUser;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const row = await queryOne<{ userId: string }>(
        `SELECT userId FROM \`Account\` WHERE provider = ? AND providerAccountId = ?`,
        [provider, providerAccountId]
      );
      if (!row) return null;
      return getUserId(row.userId);
    },

    async updateUser(user: Partial<AdapterUser> & { id: string }) {
      const updates: string[] = [];
      const params: unknown[] = [];
      if (user.name !== undefined) {
        updates.push("name = ?");
        params.push(user.name);
      }
      if (user.email !== undefined) {
        updates.push("email = ?");
        params.push(user.email);
      }
      if (user.emailVerified !== undefined) {
        updates.push("emailVerified = ?");
        params.push(user.emailVerified);
      }
      if (user.image !== undefined) {
        updates.push("image = ?");
        params.push(user.image);
      }
      if (updates.length === 0) return getUserId(user.id) as Promise<AdapterUser>;
      params.push(user.id);
      await execute(`UPDATE \`User\` SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`, params);
      return getUserId(user.id) as Promise<AdapterUser>;
    },

    async linkAccount(account: AdapterAccount) {
      const id = cuid();
      await execute(
        `INSERT INTO \`Account\` (id, userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
        ]
      );
    },

    async createSession(session: AdapterSession) {
      const id = cuid();
      await execute(
        `INSERT INTO \`Session\` (id, sessionToken, userId, expires) VALUES (?, ?, ?, ?)`,
        [id, session.sessionToken, session.userId, session.expires]
      );
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      };
    },

    async getSessionAndUser(sessionToken) {
      const sessionRow = await queryOne<{ sessionToken: string; userId: string; expires: Date }>(
        `SELECT sessionToken, userId, expires FROM \`Session\` WHERE sessionToken = ?`,
        [sessionToken]
      );
      if (!sessionRow) return null;
      const user = await getUserId(sessionRow.userId);
      if (!user) return null;
      return {
        session: {
          sessionToken: sessionRow.sessionToken,
          userId: sessionRow.userId,
          expires: toDate(sessionRow.expires)!,
        },
        user,
      };
    },

    async updateSession({ sessionToken, expires }) {
      if (expires !== undefined) {
        await execute(`UPDATE \`Session\` SET expires = ? WHERE sessionToken = ?`, [expires, sessionToken]);
      }
      const row = await queryOne<{ sessionToken: string; userId: string; expires: Date }>(
        `SELECT sessionToken, userId, expires FROM \`Session\` WHERE sessionToken = ?`,
        [sessionToken]
      );
      if (!row) return null;
      return {
        sessionToken: row.sessionToken,
        userId: row.userId,
        expires: toDate(row.expires)!,
      };
    },

    async deleteSession(sessionToken) {
      const row = await queryOne<{ sessionToken: string; userId: string; expires: Date }>(
        `SELECT sessionToken, userId, expires FROM \`Session\` WHERE sessionToken = ?`,
        [sessionToken]
      );
      await execute(`DELETE FROM \`Session\` WHERE sessionToken = ?`, [sessionToken]);
      if (!row) return null;
      return {
        sessionToken: row.sessionToken,
        userId: row.userId,
        expires: toDate(row.expires)!,
      };
    },

    async createVerificationToken(token: { identifier: string; token: string; expires: Date }) {
      await execute(
        `INSERT INTO \`VerificationToken\` (identifier, token, expires) VALUES (?, ?, ?)`,
        [token.identifier, token.token, token.expires]
      );
      return token;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const row = await queryOne<{ identifier: string; token: string; expires: Date }>(
        `SELECT identifier, token, expires FROM \`VerificationToken\` WHERE identifier = ? AND token = ?`,
        [identifier, token]
      );
      if (!row) return null;
      await execute(`DELETE FROM \`VerificationToken\` WHERE identifier = ? AND token = ?`, [identifier, token]);
      return {
        identifier: row.identifier,
        token: row.token,
        expires: toDate(row.expires)!,
      };
    },
  };
}
