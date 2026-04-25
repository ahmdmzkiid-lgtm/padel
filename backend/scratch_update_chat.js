import pool from './config/db.js';

async function updateTable() {
  try {
    await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false');
    console.log('Column is_read added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error adding column:', err);
    process.exit(1);
  }
}

updateTable();
