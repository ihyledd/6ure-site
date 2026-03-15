import { query, queryOne, execute } from "@/lib/db";

export type AnnouncementRow = {
  id: number;
  title: string;
  message: string;
  active: boolean;
  centered: boolean;
  createdAt: Date | string;
  discountPercent: number | null;
  endsAt: string | null;
};

type AnnouncementDbRow = {
  id: number;
  title: string;
  message: string;
  active: boolean;
  centered: boolean;
  created_at: Date | string;
  discount_percent?: number | null;
  ends_at?: string | Date | null;
};

export async function getAllAnnouncements(): Promise<AnnouncementRow[]> {
  const rows = await query<AnnouncementDbRow>(
    "SELECT id, title, message, active, centered, created_at, discount_percent, ends_at FROM announcements ORDER BY created_at DESC",
    []
  );
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    active: a.active,
    centered: a.centered,
    createdAt: a.created_at,
    discountPercent: a.discount_percent ?? null,
    endsAt: a.ends_at != null ? String(a.ends_at).slice(0, 10) : null,
  }));
}

export async function getActiveAnnouncements(): Promise<{
  id: number;
  title: string;
  message: string;
  active: boolean;
  centered: boolean;
  created_at: string;
  discount_percent: number | null;
  ends_at: string | null;
}[]> {
  const rows = await query<AnnouncementDbRow>(
    "SELECT id, title, message, active, centered, created_at, discount_percent, ends_at FROM announcements WHERE active = true ORDER BY created_at DESC",
    []
  );
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    active: a.active,
    centered: a.centered,
    created_at: String(a.created_at),
    discount_percent: a.discount_percent ?? null,
    ends_at: a.ends_at != null ? String(a.ends_at).slice(0, 10) : null,
  }));
}

export async function createAnnouncement(params: {
  title: string;
  message: string;
  active?: boolean;
  centered?: boolean;
  discountPercent?: number | null;
  endsAt?: string | null;
}): Promise<number> {
  const result = await execute(
    "INSERT INTO announcements (title, message, active, centered, discount_percent, ends_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      params.title,
      params.message,
      params.active !== false ? 1 : 0,
      params.centered === true ? 1 : 0,
      params.discountPercent != null ? params.discountPercent : null,
      params.endsAt && params.endsAt.trim() ? params.endsAt.trim().slice(0, 10) : null,
    ]
  );
  return result.insertId ?? 0;
}

export async function updateAnnouncement(
  id: number,
  params: {
    title?: string;
    message?: string;
    active?: boolean;
    centered?: boolean;
    discountPercent?: number | null;
    endsAt?: string | null;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const values: unknown[] = [];
  if (params.title !== undefined) {
    updates.push("title = ?");
    values.push(params.title);
  }
  if (params.message !== undefined) {
    updates.push("message = ?");
    values.push(params.message);
  }
  if (params.active !== undefined) {
    updates.push("active = ?");
    values.push(params.active ? 1 : 0);
  }
  if (params.centered !== undefined) {
    updates.push("centered = ?");
    values.push(params.centered ? 1 : 0);
  }
  if (params.discountPercent !== undefined) {
    updates.push("discount_percent = ?");
    values.push(params.discountPercent != null ? params.discountPercent : null);
  }
  if (params.endsAt !== undefined) {
    updates.push("ends_at = ?");
    values.push(params.endsAt && params.endsAt.trim() ? params.endsAt.trim().slice(0, 10) : null);
  }
  if (updates.length === 0) return false;
  values.push(id);
  const result = await execute(
    `UPDATE announcements SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
    values
  );
  return (result.affectedRows ?? 0) > 0;
}

export async function deleteAnnouncement(id: number): Promise<boolean> {
  const result = await execute("DELETE FROM announcements WHERE id = ?", [id]);
  return (result.affectedRows ?? 0) > 0;
}
