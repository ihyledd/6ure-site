import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

const DATA_DIR = path.join(process.cwd(), "data");
const ABOUT_CONTENT_KEY = "about_content";

async function ensureDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filename: string, data: unknown) {
  await ensureDir();
  await writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
}

// ---------- About site content (stored in DB for persistence on serverless) ----------

export type AboutContent = {
  hero_headline: string;
  hero_description: string;
  about_story: string;
  about_mission: string;
  about_vision: string;
  stat_downloads: number;
  stat_presets: number;
  stat_support_label: string;
};

const CONTENT_DEFAULTS: AboutContent = {
  hero_headline: "Welcome to 6ure",
  hero_description: "Your hub for editing presets, plugins, and resources - curated, organised, and built for creators.",
  about_story: "6ure was originally established to provide a more comfortable and structured space to navigate presets, bringing resources from various sources into one organised and simplified space. Before 6ure, finding quality presets meant jumping between scattered sources, inconsistent formats, and unreliable access. We wanted to change that - a single place where creators and editors could discover, download, and share without the clutter. Today, 6ure has grown into a premium community: curated presets, Requests, Wiki, and round-the-clock support, all in one ecosystem.",
  about_mission: "To provide the best premium content experience with transparency, reliability, and an unmatched community atmosphere.",
  about_vision: "A community where quality content meets genuine support - no shortcuts, no compromises.",
  stat_downloads: 1000000,
  stat_presets: 5000,
  stat_support_label: "24/7",
};

function parseAboutContent(raw: string | null): AboutContent | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data && (typeof data.stat_downloads === "number" || typeof data.stat_presets === "number")) {
      return {
        hero_headline: typeof data.hero_headline === "string" ? data.hero_headline : CONTENT_DEFAULTS.hero_headline,
        hero_description: typeof data.hero_description === "string" ? data.hero_description : CONTENT_DEFAULTS.hero_description,
        about_story: typeof data.about_story === "string" ? data.about_story : CONTENT_DEFAULTS.about_story,
        about_mission: typeof data.about_mission === "string" ? data.about_mission : CONTENT_DEFAULTS.about_mission,
        about_vision: typeof data.about_vision === "string" ? data.about_vision : CONTENT_DEFAULTS.about_vision,
        stat_downloads: typeof data.stat_downloads === "number" ? data.stat_downloads : CONTENT_DEFAULTS.stat_downloads,
        stat_presets: typeof data.stat_presets === "number" ? data.stat_presets : CONTENT_DEFAULTS.stat_presets,
        stat_support_label: typeof data.stat_support_label === "string" ? data.stat_support_label : CONTENT_DEFAULTS.stat_support_label,
      };
    }
  } catch {}
  return null;
}

export async function getAboutContent(): Promise<AboutContent> {
  try {
    const value = await getSiteSetting(ABOUT_CONTENT_KEY);
    const parsed = parseAboutContent(value);
    if (parsed) return parsed;
  } catch {}

  // Fallback: migrate from data/content.json if it exists
  const fileData = await readJson<Partial<AboutContent>>("content.json", {});
  if (fileData && (typeof fileData.stat_downloads === "number" || typeof fileData.stat_presets === "number")) {
    const migrated: AboutContent = {
      hero_headline: fileData.hero_headline ?? CONTENT_DEFAULTS.hero_headline,
      hero_description: fileData.hero_description ?? CONTENT_DEFAULTS.hero_description,
      about_story: fileData.about_story ?? CONTENT_DEFAULTS.about_story,
      about_mission: fileData.about_mission ?? CONTENT_DEFAULTS.about_mission,
      about_vision: fileData.about_vision ?? CONTENT_DEFAULTS.about_vision,
      stat_downloads: typeof fileData.stat_downloads === "number" ? fileData.stat_downloads : CONTENT_DEFAULTS.stat_downloads,
      stat_presets: typeof fileData.stat_presets === "number" ? fileData.stat_presets : CONTENT_DEFAULTS.stat_presets,
      stat_support_label: fileData.stat_support_label ?? CONTENT_DEFAULTS.stat_support_label,
    };
    await saveAboutContent(migrated);
    return migrated;
  }
  return CONTENT_DEFAULTS;
}

export async function saveAboutContent(content: AboutContent): Promise<void> {
  await setSiteSetting(ABOUT_CONTENT_KEY, JSON.stringify(content));
}

// ---------- Staff ----------

/** Optional social links (URLs). Keys: tiktok, instagram, youtube, twitter, twitch, github */
export type StaffSocials = Partial<Record<string, string>>;

export type StaffMember = {
  id: string;
  name: string;
  username?: string;
  role: string;
  avatar: string;
  description?: string;
  display: boolean;
  order: number;
  /** Optional social profile URLs (tiktok, instagram, youtube, twitter, twitch, github) */
  socials?: StaffSocials;
};

export async function getStaff(): Promise<StaffMember[]> {
  const data = await readJson<{ staff: StaffMember[] }>("staff.json", { staff: [] });
  return (data.staff ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function saveStaff(staff: StaffMember[]) {
  return writeJson("staff.json", { staff });
}

// ---------- Applications ----------

export type Application = {
  id: string;
  position: string;
  status: "pending" | "accepted" | "rejected";
  discord_user_id?: string;
  answers: Record<string, string>;
  created_at: string;
  responded_at?: string;
};

export async function getApplications(limit = 50): Promise<Application[]> {
  const data = await readJson<{ applications: Application[] }>("applications.json", { applications: [] });
  return (data.applications ?? []).reverse().slice(0, limit);
}

export async function saveApplications(apps: Application[]) {
  return writeJson("applications.json", { applications: apps });
}

export async function updateApplicationStatus(appId: string, status: "accepted" | "rejected") {
  const data = await readJson<{ applications: Application[] }>("applications.json", { applications: [] });
  const apps = data.applications ?? [];
  for (const a of apps) {
    if (a.id === appId) {
      a.status = status;
      a.responded_at = new Date().toISOString();
      break;
    }
  }
  await writeJson("applications.json", { applications: apps });
}

// ---------- Dashboard access (roles) ----------

export type DashboardRoles = {
  admins: string[];
  staff: string[];
};

export async function getDashboardRoles(): Promise<DashboardRoles> {
  return readJson("dashboard-roles.json", { admins: [], staff: [] });
}

export async function saveDashboardRoles(roles: DashboardRoles) {
  return writeJson("dashboard-roles.json", roles);
}
