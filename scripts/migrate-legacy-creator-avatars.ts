#!/usr/bin/env node
/**
 * Fix requests with legacy creator_avatar (/uploads/creator-avatars/) by fetching external URLs.
 * Run: npx tsx scripts/migrate-legacy-creator-avatars.ts
 * Or: npm run migrate:creator-avatars
 */
import "dotenv/config";
import { runLegacyCreatorAvatarMigration } from "../src/lib/creator-avatar-refresh";

runLegacyCreatorAvatarMigration()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
