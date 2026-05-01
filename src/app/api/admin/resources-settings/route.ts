/**
 * GET  /api/admin/resources-settings — read current resource/download settings
 * POST /api/admin/resources-settings — update settings
 *
 * Reads/writes the SAME settings.yml the Discord bot uses,
 * so changes here are instantly reflected in downloads and vice-versa.
 *
 * IMPORTANT: We use targeted line replacements instead of full YAML
 * parse+stringify to preserve Skript-specific tags like !skripttimespan.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { readFileSync, writeFileSync } from "fs";
import { parse as yamlParse } from "yaml";

const SETTINGS_YAML_PATH = "/home/6ure/plugins/Skript/scripts/Data/settings.yml";

/** Read and parse settings (read-only, safe even with custom tags) */
function readSettings() {
  const raw = readFileSync(SETTINGS_YAML_PATH, "utf8");
  // yaml package handles unknown tags gracefully (warns but still parses)
  const parsed = yamlParse(raw) as {
    Settings: {
      Password?: string;
      "Link-Expiry"?: string;
      Bypass?: { Staff?: boolean; Booster?: boolean };
    };
  };
  return parsed;
}

/**
 * Write a single setting value back to settings.yml using targeted line replacement.
 * This preserves all Skript custom tags and formatting.
 */
function updateSettingInFile(key: string, value: string | boolean | null) {
  let raw = readFileSync(SETTINGS_YAML_PATH, "utf8");

  if (value === null) {
    // Remove the line entirely
    const regex = new RegExp(`^(\\s+)${escapeRegex(key)}:.*$`, "m");
    raw = raw.replace(regex, "");
    // Clean up double newlines
    raw = raw.replace(/\n\n\n+/g, "\n\n");
  } else if (typeof value === "boolean") {
    const regex = new RegExp(`^(\\s+${escapeRegex(key)}:)\\s*.*$`, "m");
    if (regex.test(raw)) {
      raw = raw.replace(regex, `$1 ${value}`);
    }
  } else {
    // String value
    const regex = new RegExp(`^(\\s+${escapeRegex(key)}:)\\s*.*$`, "m");
    if (regex.test(raw)) {
      // For Link-Expiry, preserve the !skripttimespan tag
      if (key === "Link-Expiry") {
        raw = raw.replace(regex, `$1 !skripttimespan '${value}'`);
      } else {
        raw = raw.replace(regex, `$1 ${value}`);
      }
    } else {
      // Key doesn't exist yet, add it under Settings:
      const settingsIdx = raw.indexOf("Settings:");
      if (settingsIdx !== -1) {
        // Find end of Settings block and insert
        const lines = raw.split("\n");
        let insertIdx = -1;
        let inSettings = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() === "Settings:") {
            inSettings = true;
            continue;
          }
          if (inSettings && lines[i].match(/^\S/) && lines[i].trim()) {
            insertIdx = i;
            break;
          }
        }
        if (insertIdx === -1) insertIdx = lines.length;
        if (key === "Link-Expiry") {
          lines.splice(insertIdx, 0, `    ${key}: !skripttimespan '${value}'`);
        } else {
          lines.splice(insertIdx, 0, `    ${key}: ${value}`);
        }
        raw = lines.join("\n");
      }
    }
  }

  writeFileSync(SETTINGS_YAML_PATH, raw, "utf8");
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const settings = readSettings();
    const s = settings.Settings;

    return NextResponse.json({
      password: s.Password ?? null,
      link_expiry: s["Link-Expiry"] ?? "1 hour",
      bypass_staff: s.Bypass?.Staff ?? true,
      bypass_booster: s.Bypass?.Booster ?? true,
      share_expiry_hours: parseInt(process.env.SFTPGO_SHARE_EXPIRY_HOURS || "24", 10),
    });
  } catch (err) {
    console.error("[resources-settings] GET error:", err);
    return NextResponse.json({ error: "Failed to read settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Password
    if ("password" in body) {
      const pw = body.password;
      if (pw === null || pw === "" || pw === "X" || pw === "x") {
        updateSettingInFile("Password", null);
      } else {
        updateSettingInFile("Password", String(pw).trim());
      }
    }

    // Bypass settings
    if ("bypass_staff" in body) {
      updateSettingInFile("Staff", !!body.bypass_staff);
    }
    if ("bypass_booster" in body) {
      updateSettingInFile("Booster", !!body.bypass_booster);
    }

    // Link expiry
    if ("link_expiry" in body && body.link_expiry) {
      updateSettingInFile("Link-Expiry", String(body.link_expiry).trim());
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[resources-settings] POST error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
