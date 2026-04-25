import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Remove channel_binding param that can cause issues with pg driver
let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl.includes('channel_binding')) {
  const url = new URL(dbUrl);
  url.searchParams.delete('channel_binding');
  dbUrl = url.toString();
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export default pool;
