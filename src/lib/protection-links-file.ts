/**
 * Protected links stored in JSON file (leak_protection_data.json).
 * Matches old requests site structure for compatibility.
 * Used when PROTECTION_FILE_PATH env is set.
 */

import { promises as fs } from "fs";
import path from "path";
import { listYamlFilesInDir, getEditorFromYamlFile, LEAKS_DATA_PATH } from "./leaks-loader";

const PROTECTION_FILE_PATH =
  process.env.PROTECTION_FILE_PATH || "/home/main/leak_protection_data.json";

const PROTECTION_PROTECTED_PATH =
  process.env.PROTECTION_PROTECTED_PATH || "/home/6ure/plugins/Skript/scripts/Data/protected";

const RELOAD_INTERVAL = 60 * 1000; // 1 minute

type ProtectionGroup = {
  links: string[];
  keywords: string[];
  description?: string;
  enabled?: boolean;
  created_by?: number;
  created_at?: number;
  last_updated?: number;
  yaml_file?: string | null;
};

type ProtectionData = {
  protection_groups: Record<string, ProtectionGroup>;
  enabled?: boolean;
};

let protectionData: ProtectionData | null = null;
let lastLoadTime = 0;

async function loadProtectionData(): Promise<ProtectionData | null> {
  try {
    const raw = await fs.readFile(PROTECTION_FILE_PATH, "utf8");
    protectionData = JSON.parse(raw) as ProtectionData;
    lastLoadTime = Date.now();
    return protectionData;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      protectionData = { protection_groups: {}, enabled: true };
      return protectionData;
    }
    console.error("[Protection] Error loading protection data:", err);
    return null;
  }
}

async function getProtectionDataFull(): Promise<ProtectionData | null> {
  const now = Date.now();
  if (!protectionData || now - lastLoadTime > RELOAD_INTERVAL) {
    await loadProtectionData();
  }
  return protectionData;
}

async function saveProtectionData(data: ProtectionData): Promise<void> {
  await fs.writeFile(
    PROTECTION_FILE_PATH,
    JSON.stringify(data, null, 2),
    "utf8"
  );
  protectionData = data;
  lastLoadTime = Date.now();
}

function encodeId(payload: { group_name: string; type: string; link: string }): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeId(id: string): { group_name: string; type: string; link: string } | null {
  try {
    const payload = JSON.parse(
      Buffer.from(id, "base64url").toString("utf8")
    ) as { group_name?: string; type?: string; link?: string };
    if (!payload.group_name || !payload.type || payload.link === undefined) return null;
    return {
      group_name: payload.group_name,
      type: payload.type,
      link: payload.link,
    };
  } catch {
    return null;
  }
}

export type ProtectedLinkFromFile = {
  id: string;
  groupName: string;
  link: string;
  type: string;
  enabled: boolean;
  yaml_file: string | null;
  yaml_file_suggested: string | null;
};

function normalizeForMatch(s: string): string {
  if (typeof s !== "string") return "";
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

const MIN_YAML_MATCH_SCORE = 80;

function scoreYamlMatch(groupName: string, relativePath: string, editorFromFile: string | null): number {
  const groupNorm = normalizeForMatch(groupName);
  if (!groupNorm) return 0;
  const base = path.basename(relativePath, path.extname(relativePath));
  const baseNorm = normalizeForMatch(base);
  const editorNorm = editorFromFile ? normalizeForMatch(editorFromFile) : "";
  if (groupNorm === baseNorm) return 100;
  if (editorNorm && groupNorm === editorNorm) return 80;
  return 0;
}

export async function getAvailableYamlFiles(): Promise<Array<{ path: string; location: string; editor: string | null }>> {
  const leaks = await listYamlFilesInDir(LEAKS_DATA_PATH);
  
  let protectedDir: string[] = [];
  try {
    const stat = await fs.stat(PROTECTION_PROTECTED_PATH);
    if (stat.isDirectory()) {
      protectedDir = await listYamlFilesInDir(PROTECTION_PROTECTED_PATH);
    }
  } catch {}

  const result = [];
  for (const rel of leaks) {
    const editor = await getEditorFromYamlFile(LEAKS_DATA_PATH, rel);
    result.push({ path: rel, location: "leaks", editor });
  }
  for (const rel of protectedDir) {
    const editor = await getEditorFromYamlFile(PROTECTION_PROTECTED_PATH, rel);
    result.push({ path: rel, location: "protected", editor });
  }
  return result;
}

function findBestYamlForGroup(groupName: string, availableFiles: Array<{ path: string; location: string; editor: string | null }>): string | null {
  if (!groupName || !availableFiles || availableFiles.length === 0) return null;
  let best = null;
  let bestScore = 0;
  for (const f of availableFiles) {
    const score = scoreYamlMatch(groupName, f.path, f.editor);
    if (score >= MIN_YAML_MATCH_SCORE && score > bestScore) {
      bestScore = score;
      best = f.path;
    }
  }
  return best;
}

async function resolveYamlForGroup(groupName: string, groupYamlFile: string | null): Promise<string | null> {
  if (groupYamlFile && typeof groupYamlFile === "string" && groupYamlFile.trim()) {
    return groupYamlFile.trim();
  }
  const available = await getAvailableYamlFiles();
  return findBestYamlForGroup(groupName, available);
}

export async function getProtectedLinksFromFile(): Promise<ProtectedLinkFromFile[]> {
  const data = await getProtectionDataFull();
  const groups = data?.protection_groups || {};
  const list: ProtectedLinkFromFile[] = [];
  // Do not call getAvailableYamlFiles() here: it reads/parses every YAML in Leaks+protected
  // (hundreds of files) and can take 30+ seconds, leaving the Protection page stuck on "Loading...".
  // yaml_file_suggested is left null; the YAML dropdown still shows assigned yaml_file.
  const available: Awaited<ReturnType<typeof getAvailableYamlFiles>> = [];

  for (const [groupName, group] of Object.entries(groups)) {
    const groupEnabled = group.enabled !== false;
    const yamlFile = group.yaml_file || null;
    const suggested = findBestYamlForGroup(groupName, available);

    if (group.links && Array.isArray(group.links)) {
      for (const link of group.links) {
        list.push({
          id: encodeId({ group_name: groupName, type: "link", link }),
          groupName,
          link,
          type: "link",
          enabled: groupEnabled,
          yaml_file: yamlFile,
          yaml_file_suggested: suggested,
        });
      }
    }
    if (group.keywords && Array.isArray(group.keywords)) {
      for (const link of group.keywords) {
        list.push({
          id: encodeId({ group_name: groupName, type: "keyword", link }),
          groupName,
          link,
          type: "keyword",
          enabled: groupEnabled,
          yaml_file: yamlFile,
          yaml_file_suggested: suggested,
        });
      }
    }
  }

  return list;
}

export async function addProtectedLinkToFile(
  groupName: string,
  link: string,
  type: "link" | "keyword"
): Promise<string> {
  const data = await getProtectionDataFull();
  if (!data) throw new Error("Could not load protection data");

  const groups = data.protection_groups || {};
  const name = (groupName || "default").trim() || "default";
  const value = link.trim();
  const now = Math.floor(Date.now() / 1000);

  if (!groups[name]) {
    groups[name] = {
      links: [],
      keywords: [],
      description: "No description",
      enabled: true,
      created_by: 0,
      created_at: now,
      last_updated: now,
      yaml_file: null,
    };

    // Auto-assign a YAML file for newly created groups when a good match exists.
    const available = await getAvailableYamlFiles();
    const suggested = findBestYamlForGroup(name, available);
    if (suggested) {
      groups[name].yaml_file = suggested;
    }
  }

  const group = groups[name];
  if (type === "keyword") {
    if (!group.keywords.includes(value)) group.keywords.push(value);
  } else {
    if (!group.links.includes(value)) group.links.push(value);
  }
  group.last_updated = now;
  data.protection_groups = groups;
  await saveProtectionData(data);

  return encodeId({ group_name: name, type, link: value });
}

export async function removeProtectedLinkFromFile(
  groupName: string,
  type: string,
  link: string
): Promise<boolean> {
  const data = await getProtectionDataFull();
  if (!data) throw new Error("Could not load protection data");

  const groups = data.protection_groups || {};
  const name = (groupName || "default").trim() || "default";
  const value = link.trim();
  const group = groups[name];

  if (!group) return false;

  if (type === "keyword") {
    const idx = group.keywords.indexOf(value);
    if (idx === -1) return false;
    group.keywords.splice(idx, 1);
  } else {
    const idx = group.links.indexOf(value);
    if (idx === -1) return false;
    group.links.splice(idx, 1);
  }

  if (group.keywords.length === 0 && group.links.length === 0) {
    const yamlPath = await resolveYamlForGroup(name, group.yaml_file || null);
    if (yamlPath) {
      const protectedPath = path.join(PROTECTION_PROTECTED_PATH, yamlPath);
      try {
        const stat = await fs.stat(protectedPath);
        if (stat.isFile()) await moveYamlToLeaks(yamlPath);
      } catch (e) {
        console.error("[Protection] Move to leaks on group remove:", e);
      }
    }
    delete groups[name];
  }

  data.protection_groups = groups;
  await saveProtectionData(data);
  return true;
}

export async function removeProtectedLinkById(id: string): Promise<boolean> {
  const payload = decodeId(id);
  if (!payload) return false;
  return removeProtectedLinkFromFile(payload.group_name, payload.type, payload.link);
}

export async function getProtectionEnabledFromFile(): Promise<boolean> {
  const data = await getProtectionDataFull();
  return Boolean(data?.enabled !== false);
}

export async function setProtectionEnabledFromFile(enabled: boolean): Promise<void> {
  const data = await getProtectionDataFull();
  if (!data) throw new Error("Could not load protection data");
  data.enabled = Boolean(enabled);
  await saveProtectionData(data);
}

export async function setProtectionGroupYamlFromFile(
  groupName: string,
  yamlFile: string | null
): Promise<boolean> {
  const data = await getProtectionDataFull();
  if (!data) throw new Error("Could not load protection data");

  const groups = data.protection_groups || {};
  const name = (groupName || "").trim();
  if (!name || !groups[name]) return false;

  groups[name].yaml_file = yamlFile && typeof yamlFile === "string" ? yamlFile.trim() || null : null;
  groups[name].last_updated = Math.floor(Date.now() / 1000);
  data.protection_groups = groups;
  await saveProtectionData(data);
  return true;
}

async function moveYamlToProtected(relativePath: string) {
  const src = path.join(LEAKS_DATA_PATH, relativePath);
  const dest = path.join(PROTECTION_PROTECTED_PATH, relativePath);
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(src, dest);
    console.log("[Protection] Moved YAML to protected:", relativePath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT" && (e as NodeJS.ErrnoException).path === src) return;
    console.error("[Protection] Move to protected failed:", e);
  }
}

async function moveYamlToLeaks(relativePath: string) {
  const src = path.join(PROTECTION_PROTECTED_PATH, relativePath);
  const dest = path.join(LEAKS_DATA_PATH, relativePath);
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(src, dest);
    console.log("[Protection] Moved YAML back to leaks:", relativePath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT" && (e as NodeJS.ErrnoException).path === src) return;
    console.error("[Protection] Move to leaks failed:", e);
  }
}

export async function setProtectionGroupEnabledFromFile(
  groupName: string,
  enabled: boolean
): Promise<boolean> {
  const data = await getProtectionDataFull();
  if (!data) throw new Error("Could not load protection data");

  const groups = data.protection_groups || {};
  const name = (groupName || "").trim();
  if (!name || !groups[name]) return false;

  groups[name].enabled = Boolean(enabled);
  groups[name].last_updated = Math.floor(Date.now() / 1000);
  data.protection_groups = groups;
  await saveProtectionData(data);

  const yamlPath = await resolveYamlForGroup(name, groups[name].yaml_file || null);
  if (!yamlPath) return true;

  try {
    if (enabled) {
      const srcFile = path.join(LEAKS_DATA_PATH, yamlPath);
      const stat = await fs.stat(srcFile).catch(() => null);
      if (stat?.isFile()) await moveYamlToProtected(yamlPath);
    } else {
      const srcFile = path.join(PROTECTION_PROTECTED_PATH, yamlPath);
      const stat = await fs.stat(srcFile).catch(() => null);
      if (stat?.isFile()) await moveYamlToLeaks(yamlPath);
    }
  } catch (err) {
    console.error("[Protection] Error toggling YAml movement", err);
  }

  return true;
}

/** Check if URL is protected (for checkRequestProtection). */
export function isUrlProtected(
  url: string,
  protectionGroups: Record<string, ProtectionGroup>
): { protected: true; group: string; reason: string } | { protected: false } {
  if (!url || !protectionGroups) return { protected: false };

  const normalizedUrl = url.toLowerCase().trim();

  for (const [groupName, group] of Object.entries(protectionGroups)) {
    if (group.enabled === false) continue;

    if (group.links && Array.isArray(group.links)) {
      for (const protectedLink of group.links) {
        const normalizedProtectedLink = protectedLink.toLowerCase().trim();

        if (normalizedUrl === normalizedProtectedLink) {
          return { protected: true, group: groupName, reason: "exact_link_match" };
        }
        if (
          normalizedUrl.includes(normalizedProtectedLink) ||
          normalizedProtectedLink.includes(normalizedUrl)
        ) {
          return { protected: true, group: groupName, reason: "link_contains_match" };
        }

        try {
          const urlObj = new URL(normalizedUrl);
          const protectedUrlObj = new URL(normalizedProtectedLink);
          if (urlObj.hostname === protectedUrlObj.hostname) {
            const urlPath = urlObj.pathname.toLowerCase();
            const protectedPath = protectedUrlObj.pathname.toLowerCase();
            if (urlPath.startsWith("/b/") && protectedPath.startsWith("/b/") && urlPath === protectedPath) {
              return { protected: true, group: groupName, reason: "same_product_path" };
            }
            if (urlPath === protectedPath && urlPath !== "/") {
              return { protected: true, group: groupName, reason: "same_store_path" };
            }
          }
        } catch {
          // invalid URL, skip
        }
      }
    }

    if (group.keywords && Array.isArray(group.keywords)) {
      for (const keyword of group.keywords) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (normalizedUrl.includes(normalizedKeyword)) {
          return { protected: true, group: groupName, reason: "keyword_match" };
        }
      }
    }
  }

  return { protected: false };
}

export async function checkRequestProtectionFromFile(
  creatorUrl: string,
  productUrl: string
): Promise<{
  protected: boolean;
  group?: string;
  reason?: string;
  url?: string;
}> {
  const data = await getProtectionDataFull();
  if (!data || !data.enabled) return { protected: false };

  const groups = data.protection_groups || {};

  if (productUrl) {
    const check = isUrlProtected(productUrl, groups);
    if (check.protected) {
      return { protected: true, group: check.group, reason: check.reason, url: productUrl };
    }
  }

  if (creatorUrl) {
    const check = isUrlProtected(creatorUrl, groups);
    if (check.protected) {
      return { protected: true, group: check.group, reason: check.reason, url: creatorUrl };
    }
  }

  return { protected: false };
}

export function isProtectionFileConfigured(): boolean {
  return Boolean(
    process.env.PROTECTION_FILE_PATH && process.env.PROTECTION_FILE_PATH.trim()
  );
}
