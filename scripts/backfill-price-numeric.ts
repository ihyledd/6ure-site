/**
 * Backfill price_numeric for existing requests that have price but no price_numeric.
 * Run with: npx tsx scripts/backfill-price-numeric.ts
 */

import "dotenv/config";
import { query, execute } from "../src/lib/db";
import { getPriceInEur } from "../src/lib/price-utils";

async function main() {
  const rows = await query<{ id: number; price: string | null }>(
    "SELECT id, price FROM requests WHERE price IS NOT NULL AND TRIM(price) != '' AND (price_numeric IS NULL OR price_numeric = 0)"
  );
  console.log(`Found ${rows.length} requests to backfill`);
  let updated = 0;
  for (const row of rows) {
    const eur = getPriceInEur(row.price);
    if (eur != null) {
      await execute("UPDATE requests SET price_numeric = ? WHERE id = ?", [eur, row.id]);
      updated++;
    }
  }
  console.log(`Updated ${updated} requests`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
