import pool from './config/db.js';

const setup = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Promotions table created successfully.');
  } catch (err) {
    console.error('Setup error:', err);
  } finally {
    process.exit(0);
  }
};

setup();
