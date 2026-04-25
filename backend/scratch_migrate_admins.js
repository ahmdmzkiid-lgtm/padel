import pool from './config/db.js';
import bcrypt from 'bcryptjs';

const migrateAdmins = async () => {
  try {
    console.log('Starting migration for multi-admin support...');

    // 1. Add role column to users
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'");
    console.log('Added role column to users table.');

    // 2. Add confirmed_by column to payments and bookings
    await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id)");
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id)");
    console.log('Added confirmed_by columns to payments and bookings tables.');

    // 3. Update existing admin to owner
    await pool.query("UPDATE users SET role = 'owner' WHERE email = 'padelzone@admin.id' OR is_admin = true");
    console.log('Updated existing admins to owner role.');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
};

migrateAdmins();
