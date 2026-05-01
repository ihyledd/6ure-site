/**
 * Next.js instrumentation – runs once when the server starts.
 * Starts periodic creator avatar refresh, request info refresh, and image availability refresh when SCRAPE_API_KEY is set.
 * Syncs all Discord guild members' roles on startup (cache roles).
 *
 * Note: The Discord bot is started by build-and-restart.sh (not here) to avoid Turbopack
 * trying to resolve bot/index.js at build time.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCreatorAvatarRefresh, runLegacyCreatorAvatarMigration } = await import("@/lib/creator-avatar-refresh");
    const { startRequestInfoRefresh } = await import("@/lib/request-info-refresh");
    const { startImageAvailabilityRefresh } = await import("@/lib/image-availability-refresh");
    const { startDiscordAvatarRefresh, runDiscordAvatarRefresh, runLegacyDiscordAvatarMigration } = await import("@/lib/discord-avatar-refresh");
    const { syncAllRolesOnStartup } = await import("@/lib/requests-bot-api");
    const { runAvatarDecorationMigration } = await import("@/lib/avatar-decoration-migration");
    setImmediate(() => runLegacyCreatorAvatarMigration().catch((e) => console.warn("[Startup] Legacy creator avatar migration failed:", (e as Error).message)));
    setImmediate(() => runAvatarDecorationMigration().catch((e) => console.warn("[Startup] Avatar decoration migration failed:", (e as Error).message)));
    startCreatorAvatarRefresh();
    startRequestInfoRefresh();
    startImageAvailabilityRefresh();
    setImmediate(() => runLegacyDiscordAvatarMigration().catch((e) => console.warn("[Startup] Legacy Discord avatar migration failed:", (e as Error).message)));
    startDiscordAvatarRefresh();
    setImmediate(() => runDiscordAvatarRefresh().catch((e) => console.warn("[Startup] Discord avatar refresh failed:", (e as Error).message)));
    // Delay sync until bot API (started by build-and-restart.sh) is listening on port 3002
    setTimeout(() => syncAllRolesOnStartup(), 5000);
  }
}
