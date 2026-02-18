const { Client } = require('pg');
// Disable SSL verification for self-signed certs (Supabase pooler)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = 'postgres://postgres.eodxgmwyfailgzjksmzs:wx9IDPrEni9WV3jy@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

async function checkSchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'incidents';
    `);

        console.log('Columns in incidents table:');
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkSchema();
