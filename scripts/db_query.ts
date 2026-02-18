
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// Helper to get connection string
function getConnectionString(): string | undefined {
    // Try to find a direct postgres connection string
    if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

    // Construct from parts if available
    if (process.env.POSTGRES_USER && process.env.POSTGRES_HOST && process.env.POSTGRES_DB) {
        const user = process.env.POSTGRES_USER;
        const password = process.env.POSTGRES_PASSWORD || '';
        const host = process.env.POSTGRES_HOST;
        const port = process.env.POSTGRES_PORT || '5432';
        const db = process.env.POSTGRES_DB;
        return `postgres://${user}:${password}@${host}:${port}/${db}`;
    }

    return undefined;
}

const connectionString = getConnectionString();

if (!connectionString) {
    console.error('No database connection string found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase/AWS
});

async function run() {
    try {
        await client.connect();

        const sqlFile = process.argv[2];
        if (!sqlFile) {
            console.error('Please provide a SQL file path');
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlFile, 'utf8');
        const result = await client.query(sql);

        console.log("Input SQL:", sql);
        console.log("--- Results ---");
        if (Array.isArray(result)) {
            result.forEach((r, i) => {
                console.log(`Result ${i + 1}:`, JSON.stringify(r.rows, null, 2));
            });
        } else {
            console.log(JSON.stringify(result.rows, null, 2));
        }

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

run();
