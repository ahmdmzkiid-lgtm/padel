import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const setupVouchers = async () => {
  try {
    console.log('Starting database update for vouchers...');
    
    // Create vouchers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_amount DECIMAL(12, 2) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table "vouchers" created/verified.');

    // Check if voucher_id already exists in bookings
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='bookings' AND column_name='voucher_id';
    `);

    if (checkColumn.rowCount === 0) {
      await pool.query(`
        ALTER TABLE bookings ADD COLUMN voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL;
      `);
      console.log('Column "voucher_id" added to "bookings".');
    } else {
      console.log('Column "voucher_id" already exists in "bookings".');
    }

    console.log('Database update completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during database update:', err);
    process.exit(1);
  }
};

setupVouchers();
