import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/events - Public: get all active events
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE is_active = true ORDER BY date DESC'
    );
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// GET /api/events/:id - Public: get single event
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event tidak ditemukan.' });
    }
    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

export default router;
