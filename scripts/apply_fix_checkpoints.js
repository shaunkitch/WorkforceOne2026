const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Disable SSL verification for self-signed certs (Supabase pooler)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = 'postgres://postgres.eodxgmwyfailgzjksmzs:wx9IDPrEni9WV3jy@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

async function applyFix() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.join(__dirname, 'fix_checkpoints_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing fix...');
        await client.query(sql);
        console.log('Fix applied successfully.');

    } catch (err) {
        console.error('Error applying fix:', err);
    } finally {
        await client.end();
    }
}

applyFix();
