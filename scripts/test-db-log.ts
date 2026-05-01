import { execute } from "../src/lib/db";

async function main() {
    try {
        const res = await execute(
            "INSERT INTO resource_downloads (resource_id, user_id, user_name, ip_address) VALUES (?, ?, ?, ?)",
            [1, "test-user", "Test User", "127.0.0.1"]
        );
        console.log("Insert success:", res);
    } catch (err) {
        console.error("Insert failed:", err);
    }
    process.exit(0);
}

main();
