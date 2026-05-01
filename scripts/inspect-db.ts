import { query } from "../src/lib/db";

async function main() {
    try {
        const columns = await query("SHOW COLUMNS FROM resource_downloads");
        console.log("Columns:", JSON.stringify(columns, null, 2));
    } catch (err) {
        console.error("Failed to get columns:", err);
    }
    process.exit(0);
}

main();
