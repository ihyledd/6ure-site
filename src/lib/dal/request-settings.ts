import { query, queryOne, execute } from "@/lib/db";

export async function getDefaultSettings(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string | null }>(
    "SELECT `key`, value FROM default_settings",
    []
  );
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.value != null) out[r.key] = r.value;
  }
  return out;
}

export async function getUserSettings(userId: string): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string | null }>(
    "SELECT `key`, value FROM user_settings WHERE user_id = ?",
    [userId]
  );
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.value != null) out[r.key] = r.value;
  }
  return out;
}

export async function getMergedUserSettings(userId: string): Promise<Record<string, string>> {
  const [defaults, userSettings] = await Promise.all([
    getDefaultSettings(),
    getUserSettings(userId),
  ]);
  return { ...defaults, ...userSettings };
}

export async function setUserSetting(userId: string, key: string, value: string): Promise<void> {
  await execute(
    `INSERT INTO user_settings (user_id, \`key\`, value, updated_at) VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
    [userId, key, value]
  );
}

const DEFAULT_SETTINGS_KEYS = [
  "theme",
  "anonymous",
  "push",
  "discordDm",
  "discordDmCommentReplies",
  "timezone",
  "dateFormat",
] as const;

export async function setDefaultSetting(key: string, value: string): Promise<void> {
  if (!DEFAULT_SETTINGS_KEYS.includes(key as (typeof DEFAULT_SETTINGS_KEYS)[number])) return;
  await execute(
    `INSERT INTO default_settings (\`key\`, value, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
    [key, value]
  );
}

export async function updateDefaultSettings(data: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    if (DEFAULT_SETTINGS_KEYS.includes(key as (typeof DEFAULT_SETTINGS_KEYS)[number])) {
      await setDefaultSetting(key, value);
    }
  }
}
