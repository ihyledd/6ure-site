import { execute, query } from "@/lib/db";

export async function getContactMessages(limit: number): Promise<{ id: string; name: string; email: string; message: string; createdAt: Date | string }[]> {
  const limitNum = Math.max(1, Math.min(500, Number(limit) || 50));
  return query<{ id: string; name: string; email: string; message: string; createdAt: Date | string }>(
    `SELECT id, name, email, message, createdAt FROM ContactMessage ORDER BY createdAt DESC LIMIT ${limitNum}`,
    []
  );
}

export async function createContactMessage(data: { name: string; email: string; message: string }): Promise<void> {
  const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  await execute(
    "INSERT INTO ContactMessage (id, name, email, message, createdAt) VALUES (?, ?, ?, ?, NOW())",
    [id, data.name, data.email, data.message]
  );
}
