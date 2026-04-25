import pool from '../config/db.js';

// POST /api/reviews
export const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating dan komentar wajib diisi.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating harus antara 1 dan 5.' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (user_id, rating, comment) VALUES ($1, $2, $3) RETURNING *`,
      [user_id, rating, comment]
    );

    res.status(201).json({
      message: 'Testimoni berhasil dikirim.',
      review: result.rows[0],
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/reviews
export const getReviews = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       ORDER BY r.created_at DESC`
    );

    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};
