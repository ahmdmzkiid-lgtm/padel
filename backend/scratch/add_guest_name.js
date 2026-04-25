import pool from '../config/db.js';

const run = async () => {
  try {
    await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name VARCHAR(100)');
    console.log('Column guest_name added to bookings table.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
