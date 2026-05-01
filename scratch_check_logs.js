const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || '6ure_requests',
        port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
        const [rows] = await connection.execute('SELECT COUNT(*) as total FROM resource_downloads');
        console.log('Total logs:', rows[0].total);
        
        const [lastLogs] = await connection.execute('SELECT * FROM resource_downloads ORDER BY id DESC LIMIT 5');
        console.log('Last 5 logs:', JSON.stringify(lastLogs, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

main();
