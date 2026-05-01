import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "6ure_requests"
    });
    try {
        const [rows] = await connection.execute("SHOW COLUMNS FROM resource_downloads");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
    await connection.end();
}

main();
