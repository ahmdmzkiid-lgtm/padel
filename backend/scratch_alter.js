import pool from './config/db.js';

const alterDB = async () => {
  try {
    await pool.query('ALTER TABLE bookings ALTER COLUMN booking_date DROP NOT NULL');
    await pool.query('ALTER TABLE bookings ALTER COLUMN start_time DROP NOT NULL');
    
    // Add new columns if they don't exist
    await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_membership BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS membership_sessions JSON');
    
    console.log('Database altered successfully!');
  } catch (err) {
    console.error('Error altering DB:', err);
  } finally {
    process.exit(0);
  }
};

alterDB();
