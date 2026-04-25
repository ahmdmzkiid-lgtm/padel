import { Router } from 'express';
import { simulatePayment } from '../controllers/paymentController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/uploads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const router = Router();

// Public endpoint: get active payment methods for payment page
router.get('/methods', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM payment_settings WHERE is_active = true ORDER BY type ASC, created_at ASC"
    );
    res.json({ methods: result.rows });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Gagal mengambil metode pembayaran.' });
  }
});

router.post('/', authMiddleware, upload.single('payment_proof'), simulatePayment);

export default router;

