import pool from '../config/db.js';

export const createVoucher = async (req, res) => {
  const { code, discount_amount, user_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO vouchers (code, discount_amount, user_id) VALUES ($1, $2, $3) RETURNING *',
      [code, discount_amount, user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating voucher:', err);
    res.status(500).json({ error: 'Gagal membuat voucher. Pastikan kode unik.' });
  }
};

export const getVouchers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, u.name as user_name, u.email as user_email 
      FROM vouchers v 
      JOIN users u ON v.user_id = u.id 
      ORDER BY v.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching vouchers:', err);
    res.status(500).json({ error: 'Gagal mengambil data voucher.' });
  }
};

export const validateVoucher = async (req, res) => {
  const { code, user_id } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM vouchers WHERE code = $1 AND user_id = $2 AND is_used = false',
      [code, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kode voucher tidak valid, sudah digunakan, atau bukan milik Anda.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error validating voucher:', err);
    res.status(500).json({ error: 'Gagal memvalidasi voucher.' });
  }
};
