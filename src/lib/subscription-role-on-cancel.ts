import { removeDiscordRoleFromUser } from "@/lib/discord-assign-role";
import { getSubscriptionRoleId } from "@/lib/site-settings";
import { updateSubscription, type SubscriptionRow } from "@/lib/dal/subscriptions";

/**
 * Remove Discord subscription role when cancelled or suspended subscription no longer has paid access.
 * If accessEnd is in the future, no-op. Unknown end: do not remove the role.
 */
export async function releaseDiscordRoleIfSubscriptionAccessEnded(
  sub: SubscriptionRow,
  accessEnd: Date | null
): Promise<void> {
  if (sub.role_released_at) return;
  if (sub.plan_interval === "LIFETIME") return;

  const end =
    accessEnd ?? (sub.current_period_end ? new Date(sub.current_period_end) : null);
  // Without a known end date, do not strip the role (avoids removing access early).
  if (!end) {
    return;
  }
  if (Date.now() < end.getTime()) {
    return;
  }

  const roleId = await getSubscriptionRoleId(sub.plan_category);
  if (!roleId) {
    await updateSubscription(sub.id, { roleReleasedAt: new Date() });
    return;
  }

  const result = await removeDiscordRoleFromUser(sub.user_id, roleId);
  if (!result.ok) {
    console.error(`[releaseDiscordRole] user=${sub.user_id}:`, result.error);
    return;
  }
  await updateSubscription(sub.id, { roleReleasedAt: new Date() });
}
