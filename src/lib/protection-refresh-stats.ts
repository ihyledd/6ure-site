/**
 * Refresh follower/video/creator stats for all protected users that have a social link.
 * Uses enrichCreator (api.hlx.li) and updates protected_users.
 */

import { getProtectedUsers, updateProtectedUser } from "@/lib/dal/protection";
import { enrichCreator, isAllowedCreatorDomain } from "@/lib/scraper";

export type RefreshProtectedStatsResult = {
  refreshed: number;
  failed: number;
  errors: string[];
};

export async function refreshProtectedUsersStats(): Promise<RefreshProtectedStatsResult> {
  const users = await getProtectedUsers();
  const withLink = users.filter((u) => u.socialLink && isAllowedCreatorDomain(u.socialLink));
  const errors: string[] = [];
  let refreshed = 0;
  let failed = 0;

  for (const u of withLink) {
    const link = u.socialLink!;
    try {
      const enriched = await enrichCreator(link);
      const updated = await updateProtectedUser(u.userId, {
        creatorName: enriched.name ?? null,
        creatorAvatar: enriched.avatar ?? null,
        creatorPlatform: enriched.platform ?? null,
        followerCount: enriched.follower_count ?? 0,
        videoCount: enriched.video_count ?? null,
        likesCount: enriched.likes_count ?? null,
        verified: enriched.verified ?? null,
      });
      if (updated) refreshed++;
      else failed++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${u.userId}: ${msg}`);
    }
  }

  return { refreshed, failed, errors };
}
