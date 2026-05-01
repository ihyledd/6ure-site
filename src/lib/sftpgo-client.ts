/**
 * SFTPGo API client for generating time-limited download shares.
 * Replicates the auth + share creation flow from sftpgo.sk.
 *
 * Env vars required (add to .env):
 *   SFTPGO_API_BASE=http://127.0.0.1:8080
 *   SFTPGO_USERNAME=ihyledd
 *   SFTPGO_PASSWORD=Danish0820##
 *   SFTPGO_FILES_DOMAIN=https://files.6ureleaks.com
 *   SFTPGO_SHARE_EXPIRY_HOURS=24
 *   SFTPGO_SHARE_PASSWORD=          (optional, leave empty for no password)
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getConfig() {
  return {
    apiBase: process.env.SFTPGO_API_BASE ?? "http://127.0.0.1:8080",
    username: process.env.SFTPGO_USERNAME ?? "",
    password: process.env.SFTPGO_PASSWORD ?? "",
    filesDomain: process.env.SFTPGO_FILES_DOMAIN ?? "https://files.6ureleaks.com",
    shareExpiryHours: parseInt(process.env.SFTPGO_SHARE_EXPIRY_HOURS ?? "24", 10),
    sharePassword: process.env.SFTPGO_SHARE_PASSWORD ?? "",
  };
}

// ---------------------------------------------------------------------------
// Token cache (in-memory, same pattern as sftpgo.sk)
// ---------------------------------------------------------------------------

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Get a valid SFTPGo user API token.
 * Uses Basic auth to fetch a JWT, caches it for 4 minutes (tokens last ~1h).
 */
async function getSftpgoToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && tokenExpiry > now + 60) {
    return cachedToken;
  }

  const cfg = getConfig();
  const basicAuth = Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");

  const res = await fetch(`${cfg.apiBase}/api/v2/user/token`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SFTPGo auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("SFTPGo auth response missing access_token");
  }

  cachedToken = data.access_token;
  tokenExpiry = now + 4 * 60; // Cache for 4 minutes (same as sftpgo.sk)

  return cachedToken as string;
}

// ---------------------------------------------------------------------------
// Share creation
// ---------------------------------------------------------------------------

export interface SftpgoShareResult {
  url: string;
  objectId: string;
  expiresAt: number; // unix ms
}

/**
 * Create a time-limited, single-use SFTPGo download share for a file path.
 * Replicates the "create sftpgo share for path" effect from sftpgo.sk.
 *
 * @param filePath - The path relative to the SFTPGo user root (e.g. "leaks/presets/pack.zip")
 * @param options  - Optional overrides for expiry, password, max tokens
 */
export async function createSftpgoShare(
  filePath: string,
  options?: {
    expiryHours?: number;
    password?: string;
    maxTokens?: number;
  }
): Promise<SftpgoShareResult> {
  const cfg = getConfig();
  const token = await getSftpgoToken();

  // Normalize path: ensure leading slash, no double slashes
  const normalizedPath = "/" + filePath.replace(/^\/+/, "").replace(/\/+/g, "/");
  const fileName = normalizedPath.split("/").pop() ?? "download";

  const expiryHours = options?.expiryHours ?? cfg.shareExpiryHours;
  const expiresAtMs = Date.now() + expiryHours * 60 * 60 * 1000;
  const password = options?.password ?? cfg.sharePassword;
  const maxTokens = options?.maxTokens ?? 1;

  // Build request body (same structure as sftpgo.sk)
  const body: Record<string, unknown> = {
    name: fileName,
    scope: 1, // download scope
    paths: [normalizedPath],
    expires_at: expiresAtMs,
    max_tokens: maxTokens,
  };

  if (password) {
    body.password = password;
  }

  const res = await fetch(`${cfg.apiBase}/api/v2/user/shares`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`SFTPGo share creation failed (${res.status}): ${errBody}`);
  }

  // Extract object ID from response header (same as sftpgo.sk)
  const objectId = res.headers.get("x-object-id");
  if (!objectId) {
    // Fallback: try parsing from response body
    const resBody = await res.json().catch(() => ({}));
    const fallbackId = resBody?.id;
    if (!fallbackId) {
      throw new Error("SFTPGo share created but no object ID returned");
    }
    return {
      url: `${cfg.filesDomain}/web/client/pubshares/${fallbackId}/download`,
      objectId: fallbackId,
      expiresAt: expiresAtMs,
    };
  }

  return {
    url: `${cfg.filesDomain}/web/client/pubshares/${objectId}/download`,
    objectId,
    expiresAt: expiresAtMs,
  };
}
