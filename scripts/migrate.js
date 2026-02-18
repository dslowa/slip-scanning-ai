const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string from user
// postgresql://postgres:kavby2-dupbuk-Kavxip@db.irhhdmovygyotxygoiky.supabase.co:5432/postgres
const connectionString = 'postgresql://postgres:kavby2-dupbuk-Kavxip@db.irhhdmovygyotxygoiky.supabase.co:5432/postgres';

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20240523120000_initial_schema.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...');
        await client.query(migrationSql);
        console.log('Migration completed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
