/**
 * POST /api/resources/[id]/download
 *
 * Creates a temporary SFTPGo download share for the resource.
 * - Staff/Premium/Booster users get a direct link (no password)
 * - Free users get a password-protected link (password from bot settings.yml)
 * - Increments download_count in MySQL
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { queryOne, execute } from "@/lib/db";
import { readFileSync } from "fs";
import { parse as yamlParse } from "yaml";
import { getSiteSetting } from "@/lib/site-settings";

const SFTPGO_API_BASE = process.env.SFTPGO_API_BASE || "http://127.0.0.1:8080";
const SFTPGO_USERNAME = process.env.SFTPGO_USERNAME || "ihyledd";
const SFTPGO_PASSWORD = process.env.SFTPGO_PASSWORD || "";
const SFTPGO_FILES_DOMAIN = process.env.SFTPGO_FILES_DOMAIN || "https://files.6ureleaks.com";
const SFTPGO_SHARE_EXPIRY_HOURS = parseInt(process.env.SFTPGO_SHARE_EXPIRY_HOURS || "24", 10);
const SETTINGS_YAML_PATH = "/home/6ure/plugins/Skript/scripts/Data/settings.yml";

// In-process cache to avoid hitting disk / DB on every request.
const CACHE_TTL_MS = 60_000; // 60s
const cache: { token: { value: string | null; until: number }; password: { value: string | null; until: number } } = {
  token: { value: null, until: 0 },
  password: { value: null, until: 0 },
};

// Role IDs for bypass check
const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DEVELOPER_ROLE_ID = process.env.DISCORD_DEVELOPER_ROLE_ID || "1499246437056385228";
const PREMIUM_ROLE_ID = process.env.DISCORD_PREMIUM_ROLE_ID || "1499246484426723448";

/**
 * Get the SFTPGo user token. Resolution order (cached for 60s):
 *   1. site_settings key "sftpgo_token"
 *   2. /home/6ure/plugins/Skript/scripts/Data/sftpgo.yml (legacy YAML, untouched)
 */
async function getSftpgoToken(): Promise<string | null> {
  if (cache.token.value && cache.token.until > Date.now()) return cache.token.value;
  // 1) DB
  try {
    const dbVal = await getSiteSetting("sftpgo_token");
    if (dbVal && dbVal.trim()) {
      cache.token = { value: dbVal.trim(), until: Date.now() + CACHE_TTL_MS };
      return cache.token.value;
    }
  } catch { /* ignore, fall through */ }
  // 2) YAML fallback (do NOT modify existing YAML data per project policy)
  try {
    const raw = readFileSync("/home/6ure/plugins/Skript/scripts/Data/sftpgo.yml", "utf8");
    const parsed = yamlParse(raw) as { SFTPGO?: { Token?: string } };
    const token = parsed?.SFTPGO?.Token || null;
    cache.token = { value: token, until: Date.now() + CACHE_TTL_MS };
    return token;
  } catch (err) {
    console.error("[SFTPGo] Failed to read token from sftpgo.yml:", err);
    cache.token = { value: null, until: Date.now() + 5_000 }; // short negative cache
    return null;
  }
}

/**
 * Get the current download password. Resolution order (cached 60s):
 *   1. site_settings key "download_password"
 *   2. /home/6ure/plugins/Skript/scripts/Data/settings.yml (legacy YAML, untouched)
 */
function getDownloadPasswordFromYaml(): string | null {
  try {
    const raw = readFileSync(SETTINGS_YAML_PATH, "utf8");
    const parsed = yamlParse(raw) as { Settings?: { Password?: string } };
    const pw = parsed?.Settings?.Password;
    return pw ? String(pw) : null;
  } catch (err) {
    console.error("[Download] Failed to read password from settings.yml:", err);
    return null;
  }
}

async function getDownloadPassword(): Promise<string | null> {
  if (cache.password.value && cache.password.until > Date.now()) return cache.password.value;
  try {
    const dbVal = await getSiteSetting("download_password");
    if (dbVal && dbVal.trim()) {
      cache.password = { value: dbVal.trim(), until: Date.now() + CACHE_TTL_MS };
      return cache.password.value;
    }
  } catch { /* ignore */ }
  const yamlVal = getDownloadPasswordFromYaml();
  cache.password = { value: yamlVal, until: Date.now() + CACHE_TTL_MS };
  return yamlVal;
}

/** Check if user has roles that bypass the download password */
function hasPasswordBypass(rolesJson: string | null, boostLevel: number): boolean {
  if (!rolesJson) return false;
  try {
    const roles: string[] = JSON.parse(rolesJson);
    if (!Array.isArray(roles)) return false;

    // Staff bypass
    const allStaff = [...STAFF_ROLE_IDS];
    if (DEVELOPER_ROLE_ID) allStaff.push(DEVELOPER_ROLE_ID);
    if (allStaff.some((id) => roles.includes(id))) return true;

    // Premium bypass
    if (roles.includes(PREMIUM_ROLE_ID)) return true;

    // Booster bypass
    if (boostLevel > 0) return true;

    return false;
  } catch {
    return false;
  }
}

type Props = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  { params }: Props
) {
  const { id } = await params;

  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Get resource
  const resource = await queryOne<{
    id: number;
    file_path: string | null;
    is_premium: number;
    download_count: number;
    editor_name: string;
    hidden: number | null;
    status: string | null;
  }>(
    "SELECT id, file_path, is_premium, download_count, editor_name, hidden, status FROM resources_items WHERE id = ?",
    [id]
  );

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  if (!resource.file_path) {
    return NextResponse.json({ error: "File path not available for this resource" }, { status: 404 });
  }

  // Block downloads for hidden resources unless requester is admin.
  const isHidden = Number(resource.hidden) === 1 || resource.status === "Hidden";
  if (isHidden && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // 3. Server Membership Check (must have Verified role)
  const isStaff = session.user.role === "ADMIN";
  const isVerified = !!(session as any)?.user?.verified;

  if (!isStaff && !isVerified) {
    return NextResponse.json(
      { error: "guild" }, // Special status for frontend to show join modal
      { status: 403 }
    );
  }


  // 4. Check premium access
  const isPremium = resource.is_premium === 1;
  const userIsPremium = !!(session as any)?.user?.patreon_premium;
  const boostLevel = (session as any)?.user?.boost_level ?? 0;

  if (isPremium && !isStaff && !userIsPremium && boostLevel <= 0) {
    return NextResponse.json(
      { error: "This is a premium resource. You need Premium, Staff, or Booster role." },
      { status: 403 }
    );
  }

  // 4. Determine if user bypasses password
  let bypassPassword = isStaff || userIsPremium || boostLevel > 0;

  if (!bypassPassword) {
    // Double-check from DB roles
    const userRow = await queryOne<{ roles: string | null; boost_level: number }>(
      "SELECT roles, COALESCE(boost_level, 0) as boost_level FROM users WHERE id = ?",
      [session.user.id]
    );
    if (userRow) {
      bypassPassword = hasPasswordBypass(userRow.roles, userRow.boost_level);
    }
  }

  // 5. Get SFTPGo token
  const token = await getSftpgoToken();
  if (!token) {
    return NextResponse.json(
      { error: "Cloud storage is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  // 6. Create SFTPGo share
  const expiryMs = Date.now() + SFTPGO_SHARE_EXPIRY_HOURS * 60 * 60 * 1000;
  const shareName = resource.file_path.split("/").pop() || `resource-${resource.id}`;

  // Build share body
  const shareBody: Record<string, unknown> = {
    name: shareName,
    scope: 1, // read-only
    paths: [`/${resource.file_path}`],
    expires_at: expiryMs,
    max_tokens: 1,
  };

  // Add password unless user has bypass
  if (!bypassPassword) {
    const password = await getDownloadPassword();
    if (password) {
      shareBody.password = password;
    }
  }

  try {
    const shareRes = await fetch(`${SFTPGO_API_BASE}/api/v2/user/shares`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shareBody),
      signal: AbortSignal.timeout(15000),
    });

    if (!shareRes.ok) {
      const errBody = await shareRes.text();
      console.error("[SFTPGo] Share creation failed:", shareRes.status, errBody);

      if (shareRes.status === 404 || errBody.includes("does not exist")) {
        return NextResponse.json(
          { error: "The file path for this resource is invalid or the file doesn't exist on the cloud." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Failed to generate download link. Please try again." },
        { status: 502 }
      );
    }

    // Get the share ID from response headers
    const objectId = shareRes.headers.get("x-object-id") || shareRes.headers.get("X-Object-Id");

    let downloadUrl: string;

    if (objectId) {
      downloadUrl = `${SFTPGO_FILES_DOMAIN}/web/client/pubshares/${objectId}/download`;
    } else {
      // Try from response body
      const shareData = (await shareRes.json()) as { id?: string };
      if (!shareData.id) {
        console.error("[SFTPGo] No object ID in share response");
        return NextResponse.json(
          { error: "Failed to generate download link." },
          { status: 502 }
        );
      }
      downloadUrl = `${SFTPGO_FILES_DOMAIN}/web/client/pubshares/${shareData.id}/download`;
    }

    // 7. Increment download count
    await execute(
      "UPDATE resources_items SET download_count = download_count + 1 WHERE id = ?",
      [resource.id]
    );

    // Also update editor stats
    await execute(
      `UPDATE resources_editors SET total_downloads = (
        SELECT COALESCE(SUM(download_count), 0) FROM resources_items WHERE editor_id = (
          SELECT editor_id FROM resources_items WHERE id = ?
        )
      ) WHERE id = (SELECT editor_id FROM resources_items WHERE id = ?)`,
      [resource.id, resource.id]
    );

    // Ensure log table exists
    await execute(`
      CREATE TABLE IF NOT EXISTS resource_downloads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resource_id INT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        ip_address VARCHAR(45),
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Fix collation if table already exists with default collation
    await execute(`ALTER TABLE resource_downloads CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).catch(() => { });

    // Log the download
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    await execute(
      "INSERT INTO resource_downloads (resource_id, user_id, user_name, ip_address, downloaded_at) VALUES (?, ?, ?, ?, NOW())",
      [resource.id, session.user.id, session.user.name || "Unknown", ip]
    );

    const passwordRequired = !bypassPassword && !!(await getDownloadPassword());

    return NextResponse.json({
      url: downloadUrl,
      password_required: passwordRequired,
    });
  } catch (err) {
    console.error("[Download] SFTPGo share error:", err);
    return NextResponse.json(
      { error: "Failed to generate download link. Please try again." },
      { status: 502 }
    );
  }
}
