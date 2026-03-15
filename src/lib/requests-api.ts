/**
 * Requests API - database operations for the requests site.
 * Uses MySQL via @/lib/db. Maps DB snake_case to camelCase for RequestData.
 */

import { query, queryOne, execute } from "@/lib/db";
import { canonicalProductUrl } from "@/lib/canonical-product-url";
import type { RequestData, RequestStatus, LeakInfo } from "@/lib/db-types";
import { checkRequestProtectionFromFile, isUrlProtected } from "@/lib/protection-links-file";
import { getProtectedLinks } from "@/lib/dal/protection";

const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function escapeLike(s: string): string {
  if (typeof s !== "string") return "";
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function toIso(date: Date | string | null): string {
  if (date == null) return "";
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function rowToRequestData(row: Record<string, unknown>): RequestData {
  const roles = row.user_roles;
  let isStaff = false;
  if (roles && STAFF_ROLE_IDS.length > 0) {
    let arr: unknown[] = [];
    try {
      arr = typeof roles === "string" ? JSON.parse(roles || "[]") : Array.isArray(roles) ? roles : [];
    } catch {
      arr = [];
    }
    isStaff = Array.isArray(arr) && STAFF_ROLE_IDS.some((id) => arr.includes(id));
  }
  const username =
    row.anonymous === 1 || row.anonymous === true
      ? "Anonymous"
      : (row.username as string) || "Anonymous";
  const avatar =
    row.anonymous === 1 || row.anonymous === true ? null : (row.avatar as string | null) ?? null;

  return {
    id: Number(row.id),
    user_id: (row.user_id as string) ?? null,
    creator_url: String(row.creator_url ?? ""),
    product_url: String(row.product_url ?? ""),
    title: (row.title as string) ?? null,
    description: (row.description as string) ?? null,
    image_url: (row.image_url as string) ?? null,
    price: (row.price as string) ?? null,
    status: (row.status as RequestStatus) ?? "pending",
    upvotes: Number(row.upvotes ?? 0),
    views: Number(row.views ?? 0),
    comments_locked: Boolean(row.comments_locked),
    anonymous: Boolean(row.anonymous),
    created_at: toIso(row.created_at as Date | string),
    updated_at: toIso(row.updated_at as Date | string),
    username,
    avatar,
    avatar_decoration: (row.avatar_decoration as string) ?? undefined,
    patreon_premium: Boolean(row.patreon_premium),
    has_priority: Boolean(row.has_priority),
    is_staff: isStaff,
    comments_count: Number(row.comments_count ?? 0),
    creator_name: (row.creator_name as string) ?? undefined,
    creator_avatar: (row.creator_avatar as string) ?? undefined,
    creator_platform: (row.creator_platform as string) ?? undefined,
    leak_message_url: (row.leak_message_url as string) ?? undefined,
    cancel_requested_at: (row.cancel_requested_at as string) ?? undefined,
    cancel_reason: (row.cancel_reason as string) ?? undefined,
    cancel_approved_at: (row.cancel_approved_at as string) ?? undefined,
    cancel_rejected_at: (row.cancel_rejected_at as string) ?? undefined,
    cancel_rejection_reason: (row.cancel_rejection_reason as string) ?? undefined,
  };
}

export async function getRequestById(id: number): Promise<RequestData | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT r.*,
            CASE WHEN r.anonymous = 1 THEN 'Anonymous' ELSE COALESCE(u.username, 'Anonymous') END as username,
            CASE WHEN r.anonymous = 1 THEN NULL ELSE u.avatar END as avatar,
            u.avatar_decoration,
            COALESCE(u.patreon_premium, 0) as patreon_premium,
            CASE WHEN u.patreon_premium = 1 THEN 1 ELSE 0 END as has_priority,
            u.roles as user_roles,
            (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) as comments_count
     FROM requests r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.id = ?`,
    [id]
  );
  if (!row) return null;
  return rowToRequestData(row);
}

export async function getRequestByIdForBot(
  id: number
): Promise<{ user_id?: string; title?: string; product_url?: string; message_id?: string; public_message_id?: string } | null> {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT user_id, title, product_url, message_id, public_message_id FROM requests WHERE id = ?",
    [id]
  );
  if (!row) return null;
  return {
    user_id: row.user_id as string | undefined,
    title: row.title as string | undefined,
    product_url: row.product_url as string | undefined,
    message_id: row.message_id as string | undefined,
    public_message_id: row.public_message_id as string | undefined,
  };
}

export async function getRequestsList(opts: {
  status?: string;
  page: number;
  limit: number;
  search?: string | null;
  sortBy: string;
  order: "asc" | "desc";
}): Promise<{ requests: RequestData[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  let { status, page, limit, search, sortBy, order } = opts;
  // Validate and clamp page/limit to prevent division by zero and invalid queries
  page = Math.max(1, Math.floor(Number(page)) || 1);
  limit = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 20));
  const offset = (page - 1) * limit;
  const baseWhere = status ? "r.status = ?" : "r.status != 'cancelled'";
  const params: unknown[] = [];
  if (status) params.push(status);

  let searchClause = "";
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    const termLower = `%${search.trim().toLowerCase()}%`;
    searchClause =
      " AND (r.title LIKE ? OR r.title LIKE ? OR r.description LIKE ? OR r.description LIKE ? OR r.creator_name LIKE ? OR r.creator_name LIKE ?)";
    params.push(term, termLower, term, termLower, term, termLower);
  }
  const countParams = [...params];

  const dir = order === "asc" ? "ASC" : "DESC";
  let orderBy = "r.created_at DESC, r.upvotes DESC";
  if (sortBy === "oldest" || (sortBy === "recent" && order === "asc")) {
    orderBy = "r.created_at ASC, r.id ASC";
  } else if (sortBy === "recent") {
    orderBy = "r.created_at DESC, r.upvotes DESC";
  } else if (sortBy === "upvotes") {
    orderBy = `r.upvotes ${dir}, r.created_at DESC`;
  } else if (sortBy === "price") {
    orderBy = `(r.price_numeric IS NULL), r.price_numeric ${dir}, r.created_at DESC`;
  } else if (sortBy === "popular") {
    orderBy = `COALESCE(u.patreon_premium, 0) DESC, r.upvotes ${dir}, r.created_at DESC`;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT r.*,
            CASE WHEN r.anonymous = 1 THEN 'Anonymous' ELSE COALESCE(u.username, 'Anonymous') END as username,
            CASE WHEN r.anonymous = 1 THEN NULL ELSE u.avatar END as avatar,
            u.avatar_decoration,
            COALESCE(u.patreon_premium, 0) as patreon_premium,
            CASE WHEN u.patreon_premium = 1 THEN 1 ELSE 0 END as has_priority,
            u.roles as user_roles,
            (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) as comments_count
     FROM requests r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE ${baseWhere}${searchClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM requests r LEFT JOIN users u ON r.user_id = u.id WHERE ${baseWhere}${searchClause}`,
    countParams
  );
  // Ensure Number (MySQL may return BigInt; JSON.stringify cannot serialize BigInt)
  const total = Number(countRow?.total ?? 0);
  const totalPages = Math.ceil(total / limit);

  return {
    requests: rows.map(rowToRequestData),
    pagination: { page, limit, total, totalPages },
  };
}

export async function createRequest(params: {
  userId: string;
  creatorUrl: string;
  productUrl: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  creatorPlatform?: string | null;
  anonymous?: boolean;
}): Promise<{ id: number }> {
  const result = await execute(
    `INSERT INTO requests (user_id, creator_url, product_url, title, description, image_url, price, creator_name, creator_avatar, creator_platform, anonymous, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      params.userId,
      params.creatorUrl,
      params.productUrl,
      params.title ?? null,
      params.description ?? null,
      params.imageUrl ?? null,
      params.price ?? null,
      params.creatorName ?? null,
      params.creatorAvatar ?? null,
      params.creatorPlatform ?? null,
      Boolean(params.anonymous),
    ]
  );
  return { id: result.insertId ?? 0 };
}


export async function updateRequest(
  id: number,
  updates: {
    status?: RequestStatus;
    commentsLocked?: boolean;
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    price?: string | null;
    creatorName?: string | null;
    creatorAvatar?: string | null;
    creatorPlatform?: string | null;
  }
): Promise<boolean> {
  const allowed: Record<string, string> = {
    status: "status",
    commentsLocked: "comments_locked",
    title: "title",
    description: "description",
    imageUrl: "image_url",
    price: "price",
    creatorName: "creator_name",
    creatorAvatar: "creator_avatar",
    creatorPlatform: "creator_platform",
  };
  const parts: string[] = [];
  const values: unknown[] = [];

  for (const [k, dbCol] of Object.entries(allowed)) {
    const v = (updates as Record<string, unknown>)[k];
    if (v !== undefined) {
      parts.push(`${dbCol} = ?`);
      values.push(v);
    }
  }
  if (parts.length === 0) return false;
  values.push(id);
  const result = await execute(
    `UPDATE requests SET ${parts.join(", ")} WHERE id = ?`,
    values
  );
  return (result.affectedRows ?? 0) > 0;
}

/** Requester requests cancellation of their request. Only pending, not already cancel-requested. */
export async function requestCancellation(
  id: number,
  userId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = reason?.trim();
  if (!trimmed) return { ok: false, error: "Reason required" };
  const result = await execute(
    `UPDATE requests SET cancel_requested_at = NOW(), cancel_reason = ? WHERE id = ? AND user_id = ? AND status = 'pending' AND cancel_requested_at IS NULL`,
    [trimmed.slice(0, 2048), id, userId]
  );
  return { ok: (result.affectedRows ?? 0) > 0 };
}

export async function getRequestStats(): Promise<{
  total: number;
  pending: number;
  completed: number;
  users: number;
}> {
  const [totalRow] = await query<{ n: number }>(
    "SELECT COUNT(*) as n FROM requests WHERE status != 'cancelled'"
  );
  const [pendingRow] = await query<{ n: number }>(
    "SELECT COUNT(*) as n FROM requests WHERE status = 'pending'"
  );
  const [completedRow] = await query<{ n: number }>(
    "SELECT COUNT(*) as n FROM requests WHERE status = 'completed'"
  );
  const [usersRow] = await query<{ n: number }>("SELECT COUNT(*) as n FROM users");
  return {
    total: Number(totalRow?.n ?? 0),
    pending: Number(pendingRow?.n ?? 0),
    completed: Number(completedRow?.n ?? 0),
    users: Number(usersRow?.n ?? 0),
  };
}

export async function getRequestByCanonicalProductUrl(
  productUrl: string
): Promise<RequestData | null> {
  const canonical = canonicalProductUrl(productUrl);
  if (!canonical) return null;
  const escaped = escapeLike(canonical);
  const likeWithQuery = escaped + "?%";
  const likeWithHash = escaped + "#%";

  const row = await queryOne<Record<string, unknown>>(
    `SELECT r.*,
            CASE WHEN r.anonymous = 1 THEN 'Anonymous' ELSE COALESCE(u.username, 'Anonymous') END as username,
            CASE WHEN r.anonymous = 1 THEN NULL ELSE u.avatar END as avatar,
            u.avatar_decoration,
            COALESCE(u.patreon_premium, 0) as patreon_premium,
            CASE WHEN u.patreon_premium = 1 THEN 1 ELSE 0 END as has_priority,
            u.roles as user_roles,
            (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) as comments_count
     FROM requests r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.status != 'cancelled' AND (
       BINARY r.product_url = ? OR r.product_url LIKE ? OR r.product_url LIKE ?
     )
     ORDER BY r.created_at ASC LIMIT 1`,
    [canonical, likeWithQuery, likeWithHash]
  );
  if (!row) return null;
  return rowToRequestData(row);
}

/** Stub: leaks from YAML/files. Returns null for now. */
export async function getLeakByProductUrl(
  _productUrl: string
): Promise<LeakInfo | null> {
  return null;
}

export async function checkRequestProtection(
  creatorUrl: string,
  productUrl: string
): Promise<{ protected: boolean; error?: string }> {
  const result = await checkRequestProtectionFromFile(creatorUrl, productUrl);
  if (!result.protected) return { protected: false };
  const reason = result.reason ?? "link_match";
  const msg =
    result.reason === "keyword_match"
      ? "This request matches a protected keyword."
      : "This URL is protected and cannot be requested.";
  return { protected: true, error: msg };
}

export async function getUpvotedRequestIdsForUser(
  userId: string,
  requestIds: number[]
): Promise<Set<number>> {
  if (!requestIds || requestIds.length === 0) return new Set();
  const placeholders = requestIds.map(() => "?").join(",");
  const rows = await query<{ request_id: number }>(
    `SELECT request_id FROM upvotes WHERE user_id = ? AND request_id IN (${placeholders})`,
    [userId, ...requestIds]
  );
  return new Set(rows.map((r) => r.request_id));
}

export async function recordView(
  requestId: number,
  userId: string,
  sessionId: string
): Promise<{ incremented: boolean; views?: number }> {
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM request_views WHERE request_id = ? AND user_id = ? AND session_id = ?`,
    [requestId, userId, sessionId]
  );
  if (existing) return { incremented: false };

  try {
    await execute(
      `INSERT INTO request_views (request_id, user_id, session_id) VALUES (?, ?, ?)`,
      [requestId, userId, sessionId]
    );
    await execute(`UPDATE requests SET views = views + 1 WHERE id = ?`, [
      requestId,
    ]);
    const [row] = await query<{ views: number }>(
      "SELECT views FROM requests WHERE id = ?",
      [requestId]
    );
    return { incremented: true, views: row?.views };
  } catch {
    return { incremented: false };
  }
}

export async function deleteRequest(id: number): Promise<boolean> {
  const result = await execute("DELETE FROM requests WHERE id = ?", [id]);
  return (result.affectedRows ?? 0) > 0;
}

export async function getRequesterUsername(requestId: number): Promise<string | null> {
  const row = await queryOne<{ username: string }>(
    `SELECT u.username FROM requests r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = ?`,
    [requestId]
  );
  return row?.username ?? null;
}

export async function getUpvoters(
  requestId: number,
  limit = 100,
  offset = 0
): Promise<{
  upvoters: Array<{ user_id: string; username: string; avatar: string | null }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const [countRow] = await query<{ total: number }>(
    "SELECT COUNT(*) as total FROM upvotes WHERE request_id = ?",
    [requestId]
  );
  const total = Number(countRow?.total ?? 0);
  const page = Math.floor(offset / limit) + 1;

  const rows = await query<{
    id: string;
    username: string | null;
    global_name: string | null;
    avatar: string | null;
  }>(
    `SELECT u.id, u.username, u.global_name, u.avatar
     FROM upvotes up
     JOIN users u ON up.user_id = u.id
     WHERE up.request_id = ?
     ORDER BY up.created_at DESC
     LIMIT ? OFFSET ?`,
    [requestId, limit, offset]
  );

  const upvoters = rows.map((r) => {
    const username = r.global_name || r.username || "Unknown";
    const avatar =
      r.avatar && r.id
        ? `https://cdn.discordapp.com/avatars/${r.id}/${r.avatar}.${String(r.avatar).startsWith("a_") ? "gif" : "png"}?size=128`
        : null;
    return {
      user_id: r.id,
      username,
      avatar,
    };
  });

  return {
    upvoters,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRequestsByUserId(
  userId: string,
  opts: {
    page: number;
    limit: number;
    status?: string;
    sort?: string;
    order?: "asc" | "desc";
  }
): Promise<{
  requests: RequestData[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, status, sort = "recent", order = "desc" } = opts;
  const offset = (page - 1) * limit;
  const statusFilter =
    status && ["pending", "completed", "rejected", "cancelled"].includes(status)
      ? status
      : null;
  const whereClause = statusFilter
    ? "r.user_id = ? AND r.status = ?"
    : "r.user_id = ?";
  const queryParams = statusFilter
    ? [userId, statusFilter, limit, offset]
    : [userId, limit, offset];
  const countParams = statusFilter ? [userId, statusFilter] : [userId];

  const orderBy =
    sort === "oldest"
      ? "r.created_at ASC"
      : sort === "upvotes"
        ? `r.upvotes ${order === "asc" ? "ASC" : "DESC"}, r.created_at DESC`
        : "r.created_at DESC";

  const rows = await query<Record<string, unknown>>(
    `SELECT r.*,
            CASE WHEN r.anonymous = 1 THEN 'Anonymous' ELSE COALESCE(u.username, 'Anonymous') END as username,
            CASE WHEN r.anonymous = 1 THEN NULL ELSE u.avatar END as avatar,
            u.avatar_decoration,
            COALESCE(u.patreon_premium, 0) as patreon_premium,
            CASE WHEN u.patreon_premium = 1 THEN 1 ELSE 0 END as has_priority,
            u.roles as user_roles,
            (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) as comments_count
     FROM requests r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    queryParams
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM requests WHERE ${statusFilter ? "user_id = ? AND status = ?" : "user_id = ?"}`,
    countParams
  );
  const total = Number(countRow?.total ?? 0);

  return {
    requests: rows.map(rowToRequestData),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// --- Comments ---

export type CommentRow = {
  id: number;
  request_id: number;
  user_id: string;
  /** Alias for user_id for convenience */
  userId: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  updated_at?: string;
  username: string;
  avatar: string | null;
  avatar_decoration?: string | null;
  patreon_premium: boolean;
  is_staff: boolean;
};

export async function getComments(requestId: number): Promise<CommentRow[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT c.*, u.username, u.avatar, u.avatar_decoration, u.patreon_premium, u.roles
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.request_id = ?
     ORDER BY (c.parent_id IS NULL) DESC, COALESCE(c.parent_id, c.id), c.created_at ASC`,
    [requestId]
  );
  return rows.map((r) => {
    let isStaff = false;
    if (r.roles && STAFF_ROLE_IDS.length > 0) {
      const arr =
        typeof r.roles === "string" ? JSON.parse((r.roles as string) || "[]") : r.roles || [];
      isStaff = Array.isArray(arr) && STAFF_ROLE_IDS.some((id: string) => arr.includes(id));
    }
    const userId = String(r.user_id);
    return {
      id: Number(r.id),
      request_id: Number(r.request_id),
      user_id: userId,
      userId,
      parent_id: r.parent_id != null ? Number(r.parent_id) : null,
      content: String(r.content),
      created_at: toIso(r.created_at as Date | string),
      updated_at: r.updated_at ? toIso(r.updated_at as Date | string) : undefined,
      username: String(r.username ?? "Unknown"),
      avatar: (r.avatar as string) ?? null,
      avatar_decoration: (r.avatar_decoration as string) ?? undefined,
      patreon_premium: Boolean(r.patreon_premium),
      is_staff: isStaff,
    };
  });
}

export async function createComment(
  requestId: number,
  userId: string,
  content: string,
  parentId: number | null
): Promise<number> {
  const result = await execute(
    "INSERT INTO comments (request_id, user_id, parent_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
    [requestId, userId, parentId, content]
  );
  return result.insertId ?? 0;
}


export async function getCommentById(commentId: number): Promise<CommentRow | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT c.*, u.username, u.avatar, u.avatar_decoration, u.patreon_premium, u.roles
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [commentId]
  );
  if (!row) return null;
  let isStaff = false;
  if (row.roles && STAFF_ROLE_IDS.length > 0) {
    const arr =
      typeof row.roles === "string" ? JSON.parse((row.roles as string) || "[]") : row.roles || [];
    isStaff = Array.isArray(arr) && STAFF_ROLE_IDS.some((id: string) => arr.includes(id));
  }
  const userId = String(row.user_id);
  return {
    id: Number(row.id),
    request_id: Number(row.request_id),
    user_id: userId,
    userId,
    parent_id: row.parent_id != null ? Number(row.parent_id) : null,
    content: String(row.content),
    created_at: toIso(row.created_at as Date | string),
    updated_at: row.updated_at ? toIso(row.updated_at as Date | string) : undefined,
    username: String(row.username ?? "Unknown"),
    avatar: (row.avatar as string) ?? null,
    avatar_decoration: (row.avatar_decoration as string) ?? undefined,
    patreon_premium: Boolean(row.patreon_premium),
    is_staff: isStaff,
  };
}

export async function getLatestCommentByUser(userId: string): Promise<{ createdAt: Date } | null> {
  const row = await queryOne<{ created_at: Date | string }>(
    "SELECT created_at FROM comments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  if (!row) return null;
  const d = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  return { createdAt: d };
}

export async function deleteCommentById(commentId: number): Promise<boolean> {
  await execute("DELETE FROM comments WHERE parent_id = ?", [commentId]);
  const result = await execute("DELETE FROM comments WHERE id = ?", [commentId]);
  return (result.affectedRows ?? 0) > 0;
}

// --- Comment bans ---

export async function isUserBannedFromComments(userId: string): Promise<{
  banned: boolean;
  reason?: string | null;
  expires_at?: string | null;
}> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, reason, banned_until, created_at FROM comment_bans
     WHERE user_id = ? AND (banned_until IS NULL OR banned_until > NOW())
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (!row) return { banned: false };
  return {
    banned: true,
    reason: row.reason as string | null,
    expires_at: row.banned_until ? toIso(row.banned_until as Date | string) : null,
  };
}

export async function addCommentBan(
  userId: string,
  reason: string | null,
  bannedBy: string,
  durationDays: number | null
): Promise<void> {
  let bannedUntil: string | null = null;
  if (durationDays != null && durationDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    bannedUntil = d.toISOString().slice(0, 19).replace("T", " ");
  }
  await execute(
    "INSERT INTO comment_bans (user_id, reason, banned_by, banned_until) VALUES (?, ?, ?, ?)",
    [userId, reason ?? null, bannedBy, bannedUntil]
  );
}

// --- Notifications ---

export type NotificationRow = {
  id: number;
  request_id: number | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export async function getNotifications(userId: string): Promise<NotificationRow[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, request_id, type, title, message, \`read\`, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    request_id: r.request_id != null ? Number(r.request_id) : null,
    type: String(r.type),
    title: String(r.title),
    message: String(r.message),
    read: Boolean(r.read),
    created_at: toIso(r.created_at as Date | string),
  }));
}

export async function markNotificationRead(
  notificationId: number,
  userId: string
): Promise<void> {
  await execute(
    "UPDATE notifications SET `read` = 1 WHERE id = ? AND user_id = ?",
    [notificationId, userId]
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await execute("UPDATE notifications SET `read` = 1 WHERE user_id = ?", [
    userId,
  ]);
}

// --- Upvotes ---

export async function hasUpvoted(
  requestId: number,
  userId: string
): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    "SELECT 1 as n FROM upvotes WHERE request_id = ? AND user_id = ? LIMIT 1",
    [requestId, userId]
  );
  return !!row;
}

export async function addUpvote(requestId: number, userId: string): Promise<boolean> {
  try {
    await execute("INSERT INTO upvotes (request_id, user_id) VALUES (?, ?)", [
      requestId,
      userId,
    ]);
    await execute("UPDATE requests SET upvotes = upvotes + 1 WHERE id = ?", [
      requestId,
    ]);
    return true;
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
    if (code === "ER_DUP_ENTRY") return false;
    throw err;
  }
}

export async function removeUpvote(requestId: number, userId: string): Promise<boolean> {
  const result = await execute(
    "DELETE FROM upvotes WHERE request_id = ? AND user_id = ?",
    [requestId, userId]
  );
  if ((result.affectedRows ?? 0) > 0) {
    await execute("UPDATE requests SET upvotes = upvotes - 1 WHERE id = ?", [
      requestId,
    ]);
    return true;
  }
  return false;
}

// --- Cleanup for protection group ---

export async function cleanupRequestsForProtectionGroup(
  groupName: string
): Promise<{ deletedCount: number }> {
  const links = await getProtectedLinks();
  const groupLinks = links.filter(
    (l) => l.groupName === groupName && l.type === "link"
  );
  const groupKeywords = links.filter(
    (l) => l.groupName === groupName && l.type === "keyword"
  );

  const groups: Record<string, { links: string[]; keywords: string[] }> = {};
  groups[groupName] = {
    links: groupLinks.map((l) => l.link),
    keywords: groupKeywords.map((l) => l.link),
  };

  const allRequests = await query<{ id: number; creator_url: string; product_url: string }>(
    "SELECT id, creator_url, product_url FROM requests WHERE status != 'cancelled'"
  );

  const toDelete: number[] = [];
  for (const r of allRequests) {
    if (r.product_url) {
      const check = isUrlProtected(r.product_url, groups);
      if (check.protected) {
        toDelete.push(r.id);
        continue;
      }
    }
    if (r.creator_url) {
      const check = isUrlProtected(r.creator_url, groups);
      if (check.protected) toDelete.push(r.id);
    }
  }

  let deletedCount = 0;
  for (const id of toDelete) {
    const ok = await deleteRequest(id);
    if (ok) deletedCount++;
  }
  return { deletedCount };
}
