import pool from './config/db.js';

const sql = `CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  image VARCHAR(500),
  date DATE,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

pool.query(sql).then(() => {
  console.log('events table created successfully');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
