import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  getAllBookings, confirmPayment, rejectPayment, scanBarcode,
  getSchedule, createOfflineBooking, deleteBooking, getAllUsers,
  sendPromotion, getAdmins, createAdmin, deleteAdmin, changePassword,
  getNotifications, confirmCheckin, getStats, closeCourt,
  getPaymentSettings, createPaymentSetting, updatePaymentSetting,
  deletePaymentSetting, uploadQris, getEvents, createEvent, updateEvent,
  deleteEvent, uploadEventImage, generateResetToken
} from '../controllers/adminController.js';
import authMiddleware, { isAdmin } from '../middleware/authMiddleware.js';

// ── Konstanta validasi file ────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── File filter: cek MIME type DAN ekstensi (double check) ────────────────────
const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(mime) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Format file tidak didukung. Hanya JPG, PNG, dan WEBP yang diizinkan.'), false);
  }
  cb(null, true);
};

// ── Storage config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Nama file di-generate server, bukan dari input user
    const prefix = req.path.includes('event') ? 'event-' : 'qris-';
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, prefix + Date.now() + '-' + Math.round(Math.random() * 1e9) + safeExt);
  }
});

// ── Multer instance dengan validasi lengkap ───────────────────────────────────
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,  // max 5 MB
    files: 1,                  // hanya 1 file per request
  }
});

// ── Middleware wrapper: tangkap error multer dan kembalikan pesan yang jelas ──
const uploadWithErrorHandling = (req, res, next) => {
  upload.single('qris_image')(req, res, (err) => {
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

const uploadEventWithErrorHandling = (req, res, next) => {
  upload.single('event_image')(req, res, (err) => {
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

// ── Router ────────────────────────────────────────────────────────────────────
const router = express.Router();

// Semua rute admin diproteksi oleh authMiddleware dan isAdmin
router.use(authMiddleware, isAdmin);

router.get('/bookings', getAllBookings);
router.get('/schedule', getSchedule);
router.get('/users', getAllUsers);
router.put('/users/:id/generate-token', generateResetToken);
router.get('/staff', getAdmins);
router.post('/staff', createAdmin);
router.delete('/staff/:id', deleteAdmin);
router.put('/change-password', changePassword);
router.get('/notifications', getNotifications);
router.post('/confirm-checkin', confirmCheckin);
router.get('/stats', getStats);
router.post('/close-court', closeCourt);
router.post('/promotions', sendPromotion);
router.post('/bookings/offline', createOfflineBooking);
router.delete('/bookings/:id', deleteBooking);
router.put('/payments/:id/confirm', confirmPayment);
router.put('/payments/:id/reject', rejectPayment);
router.post('/scan', scanBarcode);

// Payment Settings Routes
router.get('/payment-settings', getPaymentSettings);
router.post('/payment-settings', createPaymentSetting);
router.put('/payment-settings/:id', updatePaymentSetting);
router.delete('/payment-settings/:id', deletePaymentSetting);
// QRIS upload — sekarang dengan validasi file
router.post('/payment-settings/qris', uploadWithErrorHandling, uploadQris);

// Event Routes
router.get('/events', getEvents);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);
// Event image upload — sekarang dengan validasi file
router.post('/events/:id/image', uploadEventWithErrorHandling, uploadEventImage);

export default router;
