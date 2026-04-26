import { Router } from 'express';
import { simulatePayment } from '../controllers/paymentController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import pool from '../config/db.js';
import { uploadPayment, createUploadMiddleware } from '../config/cloudinary.js';

// Middleware upload payment proof → Cloudinary
const uploadPaymentProof = createUploadMiddleware(uploadPayment, 'payment_proof');

const router = Router();

// GET /api/payments/methods
router.get('/methods', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_settings WHERE is_active = true ORDER BY type ASC, created_at ASC'
    );
    res.json({ methods: result.rows });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Gagal mengambil metode pembayaran.' });
  }
});

// POST /api/payments
router.post('/', authMiddleware, uploadPaymentProof, simulatePayment);

export default router;
