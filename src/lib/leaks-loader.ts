import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";

const LEAKS_DATA_PATH =
  process.env.LEAKS_DATA_PATH || "/home/6ure/plugins/Skript/scripts/Data/Leaks";

/**
 * Recursively list all file paths under dir.
 */
async function listAllFilesRecursive(
  dir: string,
  baseDir?: string,
  list?: string[]
): Promise<string[]> {
  const currentBaseDir = baseDir || dir;
  const currentList = list || [];
  let names: string[];

  try {
    names = await fs.readdir(dir);
  } catch (e) {
    console.warn("[Leaks] Cannot read directory", dir, (e as Error).message);
    return currentList;
  }

  for (const name of names) {
    const fullPath = path.join(dir, name);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        const relative = path.relative(currentBaseDir, fullPath);
        currentList.push(relative);
      } else if (stat.isDirectory()) {
        await listAllFilesRecursive(fullPath, currentBaseDir, currentList);
      }
    } catch {
      continue;
    }
  }

  return currentList;
}

/**
 * List relative paths of .yml and .yaml files under dir (recursive).
 */
export async function listYamlFilesInDir(dirPath: string): Promise<string[]> {
  if (!dirPath) return [];
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) return [];
  } catch {
    return [];
  }

  const all = await listAllFilesRecursive(dirPath);
  return all.filter((f) => {
    const lower = f.toLowerCase();
    return lower.endsWith(".yml") || lower.endsWith(".yaml");
  });
}

/** Strip !skriptdate '...' to plain string so js-yaml doesn't throw */
function stripSkriptDate(content: string) {
  if (!content || typeof content !== "string") return content;
  return content.replace(/!skriptdate\s+'([^']*)'/g, "'$1'");
}

/**
 * Quote Guild/Channel/Message/Member values so js-yaml keeps them as strings.
 */
function quoteSnowflakeIds(content: string) {
  if (!content || typeof content !== "string") return content;
  return content.replace(
    /(\s*(?:Guild|Channel|Message|Member):\s*)(\d{15,})/gm,
    (_, prefix, id) => `${prefix}"${id}"`
  );
}

/**
 * Read a YAML file and return the Editor value from the first leak entry, or null.
 */
export async function getEditorFromYamlFile(
  dirPath: string,
  relativePath: string
): Promise<string | null> {
  const filePath = path.join(dirPath, relativePath);
  try {
    const content = await fs.readFile(filePath, "utf8");
    let raw = stripSkriptDate(content);
    raw = quoteSnowflakeIds(raw);

    const data = yaml.load(raw, { schema: yaml.DEFAULT_SCHEMA });
    if (!data || typeof data !== "object") return null;

    // Search for Editor at the top level or first nested object
    let editor: string | null = null;
    const searchEditor = (obj: any): string | null => {
      if (!obj || typeof obj !== "object") return null;
      if (obj.Editor) return String(obj.Editor).trim();
      if (obj.editor) return String(obj.editor).trim();
      for (const val of Object.values(obj)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const res = searchEditor(val);
          if (res) return res;
        }
      }
      // Check array items
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const res = searchEditor(item);
          if (res) return res;
        }
      }
      return null;
    };

    editor = searchEditor(data);
    return editor;
  } catch (e) {
    return null;
  }
}

// ─── Leak entry scanning ───────────────────────────────────────────────

const PREMIUM_LEAK_FORUM_ID = process.env.DISCORD_PREMIUM_LEAK_FORUM_ID || "";

export type LeakEntry = {
  name: string;
  editor: string;
  place: string;
  premium: boolean;
  guild: string;
  channel: string;
  message: string;
  thumbnail?: string;
  counter?: number;
};

/**
 * Parse a YAML leak file and return all leak entries inside it.
 */
function parseLeakYaml(content: string): LeakEntry[] {
  let raw = stripSkriptDate(content);
  raw = quoteSnowflakeIds(raw);

  let data: any;
  try {
    data = yaml.load(raw, { schema: yaml.DEFAULT_SCHEMA });
  } catch {
    return [];
  }
  if (!data || typeof data !== "object") return [];

  const entries: LeakEntry[] = [];
  for (const [_key, val] of Object.entries(data)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const v = val as Record<string, any>;
    // Must have at least Place + Message to be a leak entry
    if (!v.Place && !v.place) continue;
    if (!v.Message && !v.message) continue;

    const place = String(v.Place || v.place || "").trim();
    if (!place) continue;

    const isPremium = Boolean(
      v.Premium === true ||
      v.premium === true ||
      (PREMIUM_LEAK_FORUM_ID &&
        String(v.Channel || v.channel || "") === PREMIUM_LEAK_FORUM_ID));

    entries.push({
      name: String(v.Name || v.name || _key).trim(),
      editor: String(v.Editor || v.editor || "").trim(),
      place,
      premium: isPremium,
      guild: String(v.Guild || v.guild || "").trim(),
      channel: String(v.Channel || v.channel || "").trim(),
      message: String(v.Message || v.message || "").trim(),
      thumbnail: v.Thumbnail || v.thumbnail || undefined,
      counter: v.Counter != null ? Number(v.Counter) : undefined,
    });
  }
  return entries;
}

/**
 * Normalize a URL for matching: lowercase, strip query/hash, strip trailing slash.
 */
function normalizeUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    u.search = "";
    u.hash = "";
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString().toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

// ─── Leak index (cached) ──────────────────────────────────────────────

type LeakIndex = Map<string, LeakEntry>;
let leakIndexCache: LeakIndex | null = null;
let leakIndexCacheTime = 0;
const LEAK_INDEX_TTL = 300_000; // 5 minutes — YAML leak files change rarely

const PROTECTION_PROTECTED_PATH =
  process.env.PROTECTION_PROTECTED_PATH ||
  "/home/6ure/plugins/Skript/scripts/Data/protected";

/**
 * Build an index of normalizedUrl → LeakEntry from all YAML files.
 */
async function buildLeakIndex(): Promise<LeakIndex> {
  const now = Date.now();
  if (leakIndexCache && now - leakIndexCacheTime < LEAK_INDEX_TTL) {
    return leakIndexCache;
  }

  const index: LeakIndex = new Map();

  // Scan both Leaks and Protected directories
  const dirs = [LEAKS_DATA_PATH, PROTECTION_PROTECTED_PATH];
  for (const dir of dirs) {
    let yamlFiles: string[];
    try {
      yamlFiles = await listYamlFilesInDir(dir);
    } catch {
      continue;
    }
    for (const rel of yamlFiles) {
      const filePath = path.join(dir, rel);
      try {
        const content = await fs.readFile(filePath, "utf8");
        const entries = parseLeakYaml(content);
        for (const entry of entries) {
          const normalized = normalizeUrl(entry.place);
          if (normalized) {
            index.set(normalized, entry);
          }
        }
      } catch {
        continue;
      }
    }
  }

  leakIndexCache = index;
  leakIndexCacheTime = now;
  return index;
}

/**
 * Find a leak entry matching the given product URL.
 * Returns the entry + discord message URL, or null if not found.
 */
export async function findLeakByProductUrl(
  productUrl: string
): Promise<
  (LeakEntry & { discordMessageUrl: string | null }) | null
> {
  if (!productUrl) return null;
  const index = await buildLeakIndex();

  const normalized = normalizeUrl(productUrl);
  if (!normalized) return null;

  // 1. Exact match
  const exact = index.get(normalized);
  if (exact) {
    return {
      ...exact,
      discordMessageUrl: buildDiscordUrl(exact),
    };
  }

  // 2. Partial match — check if request URL is contained in a leak URL or vice versa
  for (const [leakUrl, entry] of index) {
    if (leakUrl.includes(normalized) || normalized.includes(leakUrl)) {
      return {
        ...entry,
        discordMessageUrl: buildDiscordUrl(entry),
      };
    }
  }

  return null;
}

function buildDiscordUrl(entry: LeakEntry): string | null {
  if (entry.guild && entry.channel && entry.message) {
    return `https://discord.com/channels/${entry.guild}/${entry.channel}/${entry.message}`;
  }
  return null;
}

/** Force-clear the leak index cache (e.g. after adding a new leak). */
export function invalidateLeakCache(): void {
  leakIndexCache = null;
  leakIndexCacheTime = 0;
}

export { LEAKS_DATA_PATH };

