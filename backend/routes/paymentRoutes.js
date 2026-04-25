import { Router } from 'express';
import { simulatePayment } from '../controllers/paymentController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

// ── Tipe file yang diizinkan ──────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Multer: filter file sebelum disimpan ──────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(mime) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Format file tidak didukung. Hanya JPG, PNG, dan WEBP yang diizinkan.'), false);
  }
  cb(null, true);
};

// ── Multer: konfigurasi storage ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Nama file: timestamp + random + ekstensi asli (sanitized)
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + safeExt);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,        // max 5 MB
    files: 1,                        // hanya 1 file per request
  }
});

// ── Middleware: tangkap error dari multer ─────────────────────────────────────
const uploadWithErrorHandling = (req, res, next) => {
  upload.single('payment_proof')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran file terlalu besar. Maksimal 5 MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

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
router.post('/', authMiddleware, uploadWithErrorHandling, simulatePayment);

export default router;
