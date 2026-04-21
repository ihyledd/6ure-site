import { query, queryOne, execute } from "@/lib/db";

/** Normalize DB date to YYYY-MM-DD for API (avoids slicing Date string and losing year). */
function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type SubscriptionDateSource = "manual" | "paypal";

/** When source is PayPal, use active LP subscription period end; otherwise stored manual date. If PayPal selected but no active sub, keep manual column. */
export function computeEffectiveSubscriptionEnd(
  source: SubscriptionDateSource,
  manualEnds: string | null,
  lpPeriodEnd: Date | string | null
): string | null {
  if (source === "paypal" && lpPeriodEnd != null) {
    const d = toDateOnly(lpPeriodEnd);
    if (d) return d;
  }
  return manualEnds;
}

export type ProtectedUserRow = {
  id: number;
  userId: string;
  displayName: string | null;
  creatorName: string | null;
  reason: string | null;
  createdAt: Date | string;
  subscriptionEndsAt?: string | null;
  /** Stored DB date (manual field); same as subscriptionEndsAt when source is manual. */
  subscriptionEndsAtManual?: string | null;
  subscriptionDateSource?: SubscriptionDateSource;
  migratedLpSubscriber?: boolean;
  socialLink?: string | null;
  creatorAvatar?: string | null;
  creatorPlatform?: string | null;
};

export async function getProtectedUsers(): Promise<ProtectedUserRow[]> {
  const rows = await query<{
    id: number;
    user_id: string;
    display_name: string | null;
    creator_name: string | null;
    reason: string | null;
    created_at: Date | string;
    subscription_ends_at: Date | string | null;
    subscription_date_source: string | null;
    social_link: string | null;
    creator_avatar: string | null;
    creator_platform: string | null;
    lp_period_end: Date | string | null;
    lp_migrated: number | boolean;
  }>(
    `SELECT p.id, p.user_id, p.display_name, p.creator_name, p.reason, p.created_at, p.subscription_ends_at,
            COALESCE(p.subscription_date_source, 'manual') AS subscription_date_source,
            p.social_link, p.creator_avatar, p.creator_platform,
            (SELECT s.current_period_end FROM subscriptions s
             WHERE s.user_id = p.user_id AND s.plan_category = 'LEAK_PROTECTION' AND s.status = 'ACTIVE'
             ORDER BY s.created_at DESC LIMIT 1) AS lp_period_end,
            EXISTS (SELECT 1 FROM migration_discounts m WHERE m.user_id = p.user_id AND m.plan_category = 'LEAK_PROTECTION') AS lp_migrated
     FROM protected_users p ORDER BY p.created_at DESC`,
    []
  );
  return rows.map((r) => {
    const source: SubscriptionDateSource = r.subscription_date_source === "paypal" ? "paypal" : "manual";
    const manual = toDateOnly(r.subscription_ends_at);
    const effective = computeEffectiveSubscriptionEnd(source, manual, r.lp_period_end);
    return {
      id: r.id,
      userId: r.user_id,
      displayName: r.display_name,
      creatorName: r.creator_name,
      reason: r.reason,
      createdAt: r.created_at,
      subscriptionEndsAt: effective,
      subscriptionEndsAtManual: manual,
      subscriptionDateSource: source,
      migratedLpSubscriber: Boolean(r.lp_migrated),
      socialLink: r.social_link,
      creatorAvatar: r.creator_avatar,
      creatorPlatform: r.creator_platform,
    };
  });
}

export type ProtectedUserPublicRow = {
  userId: string;
  username: string | null;
  avatar: string | null;
  avatar_decoration: string | null;
  displayName: string | null;
  /** Display date (PayPal period when synced, else manual). */
  subscriptionEndsAt: string | null;
  subscriptionEndsAtManual: string | null;
  subscriptionDateSource: SubscriptionDateSource;
  migratedLpSubscriber: boolean;
  socialLink: string | null;
  creatorName: string | null;
  creatorAvatar: string | null;
  creatorPlatform: string | null;
  followerCount: number;
  videoCount: number | null;
  likesCount: number | null;
  verified: boolean | null;
  creatorBio: string | null;
  creatorBioLink: string | null;
};

/** Public list for Protected page: full fields, JOIN users for Discord avatar/username. */
export async function getProtectedUsersForPublic(): Promise<ProtectedUserPublicRow[]> {
  const rows = await query<{
    user_id: string;
    subscription_ends_at: Date | string | null;
    subscription_date_source: string | null;
    social_link: string | null;
    display_name: string | null;
    avatar_url: string | null;
    creator_name: string | null;
    creator_avatar: string | null;
    creator_platform: string | null;
    follower_count: number | string | null;
    video_count: number | null;
    likes_count: number | string | null;
    verified: number | boolean | null;
    creator_bio: string | null;
    creator_bio_link: string | null;
    u_global_name: string | null;
    u_display_name: string | null;
    u_username: string | null;
    u_avatar: string | null;
    u_avatar_decoration: string | null;
    lp_period_end: Date | string | null;
    lp_migrated: number | boolean;
  }>(
    `SELECT p.user_id, p.subscription_ends_at, COALESCE(p.subscription_date_source, 'manual') AS subscription_date_source, p.social_link, p.display_name, p.avatar_url,
            p.creator_name, p.creator_avatar, p.creator_platform,
            p.follower_count, p.video_count, p.likes_count, p.verified,
            p.creator_bio, p.creator_bio_link,
            u.global_name as u_global_name, u.display_name as u_display_name, u.username as u_username, u.avatar as u_avatar, u.avatar_decoration as u_avatar_decoration,
            (SELECT s.current_period_end FROM subscriptions s
             WHERE s.user_id = p.user_id AND s.plan_category = 'LEAK_PROTECTION' AND s.status = 'ACTIVE'
             ORDER BY s.created_at DESC LIMIT 1) AS lp_period_end,
            EXISTS (SELECT 1 FROM migration_discounts m WHERE m.user_id = p.user_id AND m.plan_category = 'LEAK_PROTECTION') AS lp_migrated
     FROM protected_users p
     LEFT JOIN users u ON p.user_id = u.id
     ORDER BY COALESCE(p.follower_count, 0) DESC, p.created_at DESC`,
    []
  );
  return rows.map((r) => {
    const username =
      r.u_global_name || r.u_display_name || r.u_username || r.display_name || "Unknown";
    const avatar = r.u_avatar
      ? `https://cdn.discordapp.com/avatars/${r.user_id}/${r.u_avatar}.${String(r.u_avatar).startsWith("a_") ? "gif" : "png"}?size=128`
      : r.avatar_url;
    const source: SubscriptionDateSource = r.subscription_date_source === "paypal" ? "paypal" : "manual";
    const manual = toDateOnly(r.subscription_ends_at);
    const effective = computeEffectiveSubscriptionEnd(source, manual, r.lp_period_end);
    return {
      userId: r.user_id,
      username,
      avatar: avatar || null,
      avatar_decoration: r.u_avatar_decoration ?? null,
      displayName: r.display_name,
      subscriptionEndsAt: effective,
      subscriptionEndsAtManual: manual,
      subscriptionDateSource: source,
      migratedLpSubscriber: Boolean(r.lp_migrated),
      socialLink: r.social_link,
      creatorName: r.creator_name,
      creatorAvatar: r.creator_avatar,
      creatorPlatform: r.creator_platform,
      followerCount: r.follower_count != null ? Number(r.follower_count) : 0,
      videoCount: r.video_count != null ? Number(r.video_count) : null,
      likesCount: r.likes_count != null ? Number(r.likes_count) : null,
      verified: r.verified != null ? Boolean(r.verified) : null,
      creatorBio: r.creator_bio && String(r.creator_bio).trim() ? String(r.creator_bio).trim() : null,
      creatorBioLink: r.creator_bio_link && String(r.creator_bio_link).trim() ? String(r.creator_bio_link).trim() : null,
    };
  });
}

export async function addProtectedUser(params: {
  userId: string;
  subscriptionEndsAt?: string | null;
  subscriptionDateSource?: SubscriptionDateSource;
  socialLink?: string | null;
  createdBy?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  creatorPlatform?: string | null;
  followerCount?: number | null;
  videoCount?: number | null;
  likesCount?: number | null;
  verified?: boolean | null;
  creatorBio?: string | null;
  creatorBioLink?: string | null;
}): Promise<void> {
  const fc = params.followerCount != null ? Math.max(0, params.followerCount) : 0;
  const vc = params.videoCount != null ? Math.max(0, params.videoCount) : null;
  const lc = params.likesCount != null ? Math.max(0, params.likesCount) : null;
  const ver = params.verified != null ? (params.verified ? 1 : 0) : null;
  const bio = params.creatorBio && typeof params.creatorBio === "string" ? params.creatorBio.trim().slice(0, 2000) || null : null;
  const bioLink = params.creatorBioLink && typeof params.creatorBioLink === "string" ? params.creatorBioLink.trim().slice(0, 500) || null : null;
  const dateSource: SubscriptionDateSource =
    params.subscriptionDateSource === "paypal" ? "paypal" : "manual";

  await execute(
    `INSERT INTO protected_users (user_id, subscription_ends_at, subscription_date_source, social_link, created_by, display_name, avatar_url, creator_name, creator_avatar, creator_platform, follower_count, video_count, likes_count, verified, creator_bio, creator_bio_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE subscription_ends_at = VALUES(subscription_ends_at), subscription_date_source = VALUES(subscription_date_source), social_link = VALUES(social_link), created_by = VALUES(created_by), display_name = COALESCE(VALUES(display_name), display_name), avatar_url = COALESCE(VALUES(avatar_url), avatar_url), creator_name = VALUES(creator_name), creator_avatar = VALUES(creator_avatar), creator_platform = VALUES(creator_platform), follower_count = VALUES(follower_count), video_count = VALUES(video_count), likes_count = VALUES(likes_count), verified = VALUES(verified), creator_bio = VALUES(creator_bio), creator_bio_link = VALUES(creator_bio_link)`,
    [
      params.userId,
      params.subscriptionEndsAt || null,
      dateSource,
      params.socialLink || null,
      params.createdBy || null,
      params.displayName || null,
      params.avatarUrl || null,
      params.creatorName || null,
      params.creatorAvatar || null,
      params.creatorPlatform || null,
      fc,
      vc,
      lc,
      ver,
      bio,
      bioLink,
    ]
  );
}

export async function updateProtectedUser(
  userId: string,
  updates: {
    subscriptionEndsAt?: string | null;
    subscriptionDateSource?: SubscriptionDateSource;
    socialLink?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    creatorName?: string | null;
    creatorAvatar?: string | null;
    creatorPlatform?: string | null;
    followerCount?: number | null;
    videoCount?: number | null;
    likesCount?: number | null;
    verified?: boolean | null;
    creatorBio?: string | null;
    creatorBioLink?: string | null;
  }
): Promise<boolean> {
  const parts: string[] = [];
  const values: unknown[] = [];

  if (updates.subscriptionEndsAt !== undefined) {
    parts.push("subscription_ends_at = ?");
    values.push(updates.subscriptionEndsAt && String(updates.subscriptionEndsAt).trim() ? String(updates.subscriptionEndsAt).trim().slice(0, 10) : null);
  }
  if (updates.subscriptionDateSource !== undefined) {
    parts.push("subscription_date_source = ?");
    values.push(updates.subscriptionDateSource === "paypal" ? "paypal" : "manual");
  }
  if (updates.socialLink !== undefined) {
    parts.push("social_link = ?");
    values.push(updates.socialLink && typeof updates.socialLink === "string" ? updates.socialLink.trim() || null : null);
  }
  if (updates.displayName !== undefined) {
    parts.push("display_name = ?");
    values.push(updates.displayName && typeof updates.displayName === "string" ? updates.displayName.trim() || null : null);
  }
  if (updates.avatarUrl !== undefined) {
    parts.push("avatar_url = ?");
    values.push(updates.avatarUrl && typeof updates.avatarUrl === "string" ? updates.avatarUrl.trim() || null : null);
  }
  if (updates.creatorName !== undefined) {
    parts.push("creator_name = ?");
    values.push(updates.creatorName && typeof updates.creatorName === "string" ? updates.creatorName.trim() || null : null);
  }
  if (updates.creatorAvatar !== undefined) {
    parts.push("creator_avatar = ?");
    values.push(updates.creatorAvatar && typeof updates.creatorAvatar === "string" ? updates.creatorAvatar.trim() || null : null);
  }
  if (updates.creatorPlatform !== undefined) {
    parts.push("creator_platform = ?");
    values.push(updates.creatorPlatform && typeof updates.creatorPlatform === "string" ? updates.creatorPlatform.trim() || null : null);
  }
  if (updates.followerCount !== undefined) {
    parts.push("follower_count = ?");
    values.push(Math.max(0, updates.followerCount ?? 0));
  }
  if (updates.videoCount !== undefined) {
    parts.push("video_count = ?");
    values.push(updates.videoCount != null ? Math.max(0, updates.videoCount) : null);
  }
  if (updates.likesCount !== undefined) {
    parts.push("likes_count = ?");
    values.push(updates.likesCount != null ? Math.max(0, updates.likesCount) : null);
  }
  if (updates.verified !== undefined) {
    parts.push("verified = ?");
    values.push(updates.verified ? 1 : 0);
  }
  if (updates.creatorBio !== undefined) {
    parts.push("creator_bio = ?");
    values.push(updates.creatorBio && typeof updates.creatorBio === "string" ? updates.creatorBio.trim().slice(0, 2000) || null : null);
  }
  if (updates.creatorBioLink !== undefined) {
    parts.push("creator_bio_link = ?");
    values.push(updates.creatorBioLink && typeof updates.creatorBioLink === "string" ? updates.creatorBioLink.trim().slice(0, 500) || null : null);
  }

  if (parts.length === 0) return false;
  values.push(userId);
  const result = await execute(
    `UPDATE protected_users SET ${parts.join(", ")} WHERE user_id = ?`,
    values
  );
  return (result.affectedRows ?? 0) > 0;
}

export async function deleteProtectedUser(userId: string): Promise<boolean> {
  const result = await execute("DELETE FROM protected_users WHERE user_id = ?", [userId]);
  return (result.affectedRows ?? 0) > 0;
}

export type ProtectedLinkRow = {
  id: number | string;
  groupName: string;
  link: string;
  type: string;
  enabled?: boolean;
};

async function useProtectionFile(): Promise<boolean> {
  const { isProtectionFileConfigured } = await import("@/lib/protection-links-file");
  return isProtectionFileConfigured();
}

export async function getProtectedLinks(): Promise<ProtectedLinkRow[]> {
  if (await useProtectionFile()) {
    const { getProtectedLinksFromFile } = await import("@/lib/protection-links-file");
    return getProtectedLinksFromFile();
  }
  const rows = await query<{ id: number; group_name: string; link: string; type: string }>(
    "SELECT id, group_name, link, type FROM protected_links ORDER BY group_name ASC, type ASC, link ASC",
    []
  );
  return rows.map((r) => ({
    id: r.id,
    groupName: r.group_name,
    link: r.link,
    type: r.type,
  }));
}

export async function addProtectedLink(params: {
  groupName?: string | null;
  link: string;
  type?: "link" | "keyword";
}): Promise<number | string> {
  if (await useProtectionFile()) {
    const { addProtectedLinkToFile } = await import("@/lib/protection-links-file");
    const group = (params.groupName && typeof params.groupName === "string" ? params.groupName.trim() : "") || "default";
    const linkType = params.type === "keyword" ? "keyword" : "link";
    return addProtectedLinkToFile(group, params.link.trim(), linkType);
  }
  const group = (params.groupName && typeof params.groupName === "string" ? params.groupName.trim() : "") || "default";
  const linkType = params.type === "keyword" ? "keyword" : "link";
  const result = await execute(
    "INSERT INTO protected_links (group_name, link, type) VALUES (?, ?, ?)",
    [group, params.link.trim(), linkType]
  );
  return result.insertId ?? 0;
}

export async function deleteProtectedLink(id: number | string): Promise<boolean> {
  if (await useProtectionFile()) {
    const { removeProtectedLinkById } = await import("@/lib/protection-links-file");
    return removeProtectedLinkById(String(id));
  }
  const numId = typeof id === "string" ? parseInt(id, 10) : id;
  if (isNaN(numId) || numId < 1) return false;
  const result = await execute("DELETE FROM protected_links WHERE id = ?", [numId]);
  return (result.affectedRows ?? 0) > 0;
}

const PROTECTION_ENABLED_KEY = "protection_links_enabled";

export async function getProtectionEnabled(): Promise<boolean> {
  if (await useProtectionFile()) {
    const { getProtectionEnabledFromFile } = await import("@/lib/protection-links-file");
    return getProtectionEnabledFromFile();
  }
  const val = await queryOne<{ value: string }>(
    "SELECT value FROM site_settings WHERE `key` = ?",
    [PROTECTION_ENABLED_KEY]
  );
  if (val?.value === "false" || val?.value === "0") return false;
  if (val?.value === "true" || val?.value === "1") return true;
  return true;
}

export async function setProtectionEnabled(enabled: boolean): Promise<void> {
  if (await useProtectionFile()) {
    const { setProtectionEnabledFromFile } = await import("@/lib/protection-links-file");
    await setProtectionEnabledFromFile(enabled);
    return;
  }
  const { setSiteSetting } = await import("@/lib/site-settings");
  await setSiteSetting(PROTECTION_ENABLED_KEY, enabled ? "true" : "false");
}

export async function setProtectionGroupEnabled(groupName: string, enabled: boolean): Promise<boolean> {
  if (await useProtectionFile()) {
    const { setProtectionGroupEnabledFromFile } = await import("@/lib/protection-links-file");
    return setProtectionGroupEnabledFromFile(groupName, enabled);
  }
  return false;
}

export async function getAvailableYamlFiles(): Promise<Array<{ path: string; location: string; editor: string | null }>> {
  if (await useProtectionFile()) {
    const { getAvailableYamlFiles: getFiles } = await import("@/lib/protection-links-file");
    return getFiles();
  }
  return [];
}

export async function setProtectionGroupYaml(groupName: string, yamlFile: string | null): Promise<boolean> {
  if (await useProtectionFile()) {
    const { setProtectionGroupYamlFromFile } = await import("@/lib/protection-links-file");
    return setProtectionGroupYamlFromFile(groupName, yamlFile);
  }
  return false;
}
