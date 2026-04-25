import pool from './config/db.js';

const alterDB = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
    console.log('Table reviews created successfully!');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    process.exit(0);
  }
};

alterDB();
