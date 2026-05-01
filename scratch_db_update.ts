import { execute } from "./src/lib/db";

async function main() {
  try {
    console.log("Adding avatar_url column to resources_editors...");
    await execute("ALTER TABLE resources_editors ADD COLUMN avatar_url VARCHAR(2048) DEFAULT NULL AFTER social_url;");
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
