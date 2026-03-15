import { query, execute } from "@/lib/db";

export interface DataExportRequestRow {
  id: string;
  userId: string;
  username: string | null;
  status: string;
  createdAt: Date | string;
  completedAt: Date | string | null;
  downloadUrl: string | null;
}

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 15)}`;
}

export async function createDataExportRequest(userId: string, username: string | null): Promise<string> {
  const id = cuid();
  await execute(
    "INSERT INTO DataExportRequest (id, userId, username, status, createdAt) VALUES (?, ?, ?, 'PENDING', NOW())",
    [id, userId, username]
  );
  return id;
}

export async function getDataExportRequests(limit: number): Promise<DataExportRequestRow[]> {
  const limitNum = Math.max(1, Math.min(500, Number(limit) || 50));
  const rows = await query<DataExportRequestRow>(
    `SELECT id, userId, username, status, createdAt, completedAt, downloadUrl FROM DataExportRequest ORDER BY createdAt DESC LIMIT ${limitNum}`,
    []
  );
  return rows;
}

export async function completeDataExportRequest(
  id: string,
  downloadUrl?: string | null
): Promise<void> {
  await execute(
    "UPDATE DataExportRequest SET status = 'COMPLETED', completedAt = NOW(), downloadUrl = ? WHERE id = ?",
    [downloadUrl ?? null, id]
  );
}
