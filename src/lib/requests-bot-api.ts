/**
 * Discord Requests Bot API – fire-and-forget helpers for bot notifications.
 * Uses REQUESTS_BOT_API_URL or BOT_API_URL. All calls are non-blocking.
 * Errors are logged to console for visibility in screen/terminal.
 */

const BOT_API_URL =
  process.env.REQUESTS_BOT_API_URL || process.env.BOT_API_URL || "http://localhost:3002";

function getBaseUrl(): string {
  return process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";
}

function logBotError(endpoint: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
  const causeCode = err instanceof Error && err.cause && typeof err.cause === "object" && "code" in err.cause
    ? (err.cause as { code?: string }).code
    : undefined;
  const status = err && typeof err === "object" && "response" in err
    ? (err as { response?: { status?: number } }).response?.status
    : undefined;
  const data = err && typeof err === "object" && "response" in err
    ? (err as { response?: { data?: unknown } }).response?.data
    : undefined;
  const stack = err instanceof Error ? err.stack : undefined;
  const isConnectionRefused = code === "ECONNREFUSED" || causeCode === "ECONNREFUSED" || msg.includes("fetch failed");
  console.error(
    "\n[Bot ERROR]",
    endpoint,
    "|",
    msg,
    code ? `| code=${code}` : "",
    causeCode ? `| cause=${causeCode}` : "",
    status != null ? `| HTTP ${status}` : "",
    data ? `| response=${JSON.stringify(data)}` : ""
  );
  console.error("[Bot ERROR] URL:", `${BOT_API_URL}${endpoint}`);
  if (isConnectionRefused) {
    console.error("[Bot ERROR] Hint: Is the requests bot running? Start it (e.g. in another screen) and ensure REQUESTS_BOT_API_URL points to it.");
  }
  if (stack) {
    console.error("[Bot ERROR] Stack:", stack);
  }
}

let loggedBotUrl = false;
function logBotUrlOnce(): void {
  if (!loggedBotUrl) {
    loggedBotUrl = true;
    console.log("[Bot] API URL:", BOT_API_URL);
  }
}

async function post(path: string, body: unknown, timeoutMs = 8000): Promise<void> {
  logBotUrlOnce();
  const url = `${BOT_API_URL.replace(/\/$/, "")}${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
  } finally {
    clearTimeout(t);
  }
}

async function get(path: string, timeoutMs = 5000): Promise<Response> {
  const url = `${BOT_API_URL.replace(/\/$/, "")}${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    return res;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

/** Sync roles for user before creating a request (staff/premium limits, etc.). */
export function syncRoles(userId: string): void {
  post("/sync-roles", { userId })
    .catch((err) => logBotError("/sync-roles", err));
}

/** Sync registered users' roles on startup (cache roles). Server responds immediately, sync runs in background. */
export function syncAllRolesOnStartup(): void {
  post("/sync-all-roles", {}, 10000)
    .then(() => console.log("[Bot] sync-all-roles queued (runs in background)"))
    .catch((err) => logBotError("/sync-all-roles", err));
}

/** Ensure URL is absolute for Discord embeds (Discord requires publicly fetchable URLs). */
function toAbsoluteUrl(url: string | null | undefined, baseUrl: string): string | null {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) {
    const base = baseUrl.replace(/\/$/, "");
    return `${base}${u}`;
  }
  return u;
}

/** Notify bot of new request so it can create Discord embed. */
export function notifyNewRequest(
  request: Record<string, unknown>,
  channelId: string,
  websiteUrl: string,
  viewUrl: string
): void {
  const baseUrl = getBaseUrl();
  const payload = { ...request };
  const imageUrl = toAbsoluteUrl(
    (payload.image_url as string) ?? (payload.imageUrl as string),
    baseUrl
  );
  if (imageUrl) payload.image_url = imageUrl;
  const avatar = toAbsoluteUrl(payload.avatar as string, baseUrl);
  if (avatar) payload.avatar = avatar;
  post("/new-request", {
    channelId,
    request: payload,
    websiteUrl,
    viewUrl,
  }).catch((err) => logBotError("/new-request", err));
}

/** Tell bot to refresh embed (views/upvotes changed). */
export function embedUpdate(requestId: number): void {
  post("/embed-update", { requestId }, 5000).catch((err) =>
    logBotError("/embed-update", err)
  );
}

/** Notify bot of upvote toggle. */
export function upvote(requestId: number): void {
  post("/upvote", { requestId }, 5000).catch((err) =>
    logBotError("/upvote", err)
  );
}

/** Notify bot of new comment. */
export function comment(requestId: number, commentId: number): void {
  post("/comment", { requestId, commentId }).catch((err) =>
    logBotError("/comment", err)
  );
}

/** Notify bot of comment reply (for DM). */
export function commentReply(params: {
  requestId: number;
  commentId: number;
  parentAuthorId: string;
  sendDm: boolean;
  requestTitle: string;
  requestUrl: string;
  replyContent: string;
  replierUsername: string | null;
  replierId: string;
}): void {
  post("/comment-reply", params).catch((err) =>
    logBotError("/comment-reply", err)
  );
}

/** Log cancellation event (requested, approved, rejected, deleted). */
export function cancelLog(payload: Record<string, unknown>): void {
  post("/cancel-log", payload).catch((err) =>
    logBotError("/cancel-log", err)
  );
}

/** Send cancel DM to requester (approved or rejected). */
export function sendCancelDm(params: {
  type: "approved" | "rejected";
  userId: string;
  requestId: string;
  requestTitle: string | null;
  product_url?: string | null;
  staffReason?: string | null;
}): void {
  post("/send-cancel-dm", params).catch((err) =>
    logBotError("[Bot] send-cancel-dm failed:", err)
  );
}

/** Send deletion DM to requester. */
export function sendDeletionDm(
  userId: string,
  requestTitle: string,
  reason?: string,
  requestId?: number
): void {
  post("/send-deletion-dm", {
    userId,
    requestTitle,
    reason: reason || undefined,
    requestId,
  }).catch((err) => logBotError("/send-deletion-dm", err));
}

/** Notify bot that request was deleted (remove Discord message). */
export function requestDeleted(
  requestId: number,
  messageId?: string | null,
  publicMessageId?: string | null
): void {
  post("/request-deleted", {
    requestId,
    messageId: messageId || undefined,
    publicMessageId: publicMessageId || undefined,
  }).catch((err) => logBotError("/request-deleted", err));
}

/** Refresh all embeds (dashboard action). */
export function refreshAllEmbeds(): void {
  post("/refresh-all-embeds", {}, 60000).catch((err) =>
    logBotError("/refresh-all-embeds", err)
  );
}

/** Get refresh-all-embeds status (polling). */
export async function refreshAllEmbedsStatus(): Promise<{
  status?: string;
  progress?: number;
  total?: number;
  error?: string;
}> {
  try {
    const res = await get("/refresh-all-embeds-status", 5000);
    if (!res.ok) return {};
    return (await res.json()) as { status?: string; progress?: number; total?: number; error?: string };
  } catch (e) {
    logBotError("/refresh-all-embeds-status", e);
    return {};
  }
}

/** Cancel refresh-all-embeds. */
export function refreshAllEmbedsCancel(): void {
  post("/refresh-all-embeds-cancel", {}).catch((err) =>
    logBotError("/refresh-all-embeds-cancel", err)
  );
}

export { getBaseUrl };
