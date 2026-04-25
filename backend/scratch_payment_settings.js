import pool from './config/db.js';

const setup = async () => {
  try {
    // Create payment_settings table for bank accounts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_settings (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL DEFAULT 'bank',
        bank_name VARCHAR(100),
        account_number VARCHAR(100),
        account_holder VARCHAR(100),
        qris_image VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('payment_settings table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

setup();
