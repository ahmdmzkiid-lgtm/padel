import pool from './config/db.js';
import bcrypt from 'bcryptjs';

const setupAdminAndDB = async () => {
  try {
    // 1. Add columns to tables
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(255)');
    await pool.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_name VARCHAR(100)');

    // 2. Insert admin user
    const email = 'padelzone@admin.id';
    const password = 'padelzone';
    
    // Check if admin already exists
    const checkAdmin = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkAdmin.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      await pool.query(
        'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4)',
        ['Admin PadelZone', email, hashedPassword, true]
      );
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user already exists. Updating is_admin flag just in case.');
      await pool.query('UPDATE users SET is_admin = true WHERE email = $1', [email]);
    }

    console.log('Database setup completed successfully!');
  } catch (err) {
    console.error('Error in database setup:', err);
  } finally {
    process.exit(0);
  }
};

setupAdminAndDB();
