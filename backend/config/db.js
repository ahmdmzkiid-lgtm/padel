import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Clean up DATABASE_URL
let dbUrl = (process.env.DATABASE_URL || '').replace(/^=/, '');

// Remove channel_binding param that can cause issues with pg driver
dbUrl = dbUrl.replace(/[&?]channel_binding=[^&]*/g, '');

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
