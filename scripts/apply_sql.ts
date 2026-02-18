
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Load env from project root manually
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
    console.error("Could not read .env.local");
    process.exit(1);
}

const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/"/g, '');
        env[key] = value;
    }
});

// Use connection string from env (e.g. POSTGRES_URL or SUPABASE_URL)
// .env.local usually has POSTGRES_URL or similar for Prisma.
// Let's look for one that starts with postgres:// and has password.
// Or eodxgmwyfailgzjksmzs_POSTGRES_URL
const connectionString = Object.values(env).find(v => v.startsWith('postgres://') && v.includes('@'));

if (!connectionString) {
    console.error("Could not find a valid Postgres connection string in .env.local");
    console.log("Keys found:", Object.keys(env));
    process.exit(1);
}

// Strip existing SSL params from connection string to avoid conflicts
const cleanConnectionString = connectionString.split('?')[0];

console.log("Using connection string:", cleanConnectionString.replace(/:[^:@]+@/, ':***@'));

const client = new Client({
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to database.");

        const sqlPath = path.resolve(__dirname, 'fix_assignments_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log("Executing SQL from:", sqlPath);
        const res = await client.query(sql);

        console.log("SQL executed successfully.");

        const results = Array.isArray(res) ? res : [res];

        results.forEach((r, i) => {
            if (r.rows && r.rows.length > 0) {
                console.log(`Results (Query ${i + 1}):`);
                //console.table(r.rows);
                console.log(JSON.stringify(r.rows, null, 2));
            } else {
                console.log(`Query ${i + 1}: No rows returned or not a SELECT statement.`);
            }
        });
    } catch (err) {
        console.error("Error executing SQL:", err);
    } finally {
        await client.end();
    }
}

run();
