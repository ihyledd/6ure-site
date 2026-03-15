#!/usr/bin/env node
/**
 * Fix users with legacy avatar path (/uploads/creator-avatars/) by fetching from Discord API.
 * Run: npx tsx scripts/migrate-legacy-discord-avatars.ts
 * Or: npm run migrate:discord-avatars
 */
import "dotenv/config";
import { runLegacyDiscordAvatarMigration } from "../src/lib/discord-avatar-refresh";

runLegacyDiscordAvatarMigration()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
