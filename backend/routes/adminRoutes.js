import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getAllBookings, confirmPayment, rejectPayment, scanBarcode, getSchedule, createOfflineBooking, deleteBooking, getAllUsers, sendPromotion, getAdmins, createAdmin, deleteAdmin, changePassword, getNotifications, confirmCheckin, getStats, closeCourt, getPaymentSettings, createPaymentSetting, updatePaymentSetting, deletePaymentSetting, uploadQris, getEvents, createEvent, updateEvent, deleteEvent, uploadEventImage } from '../controllers/adminController.js';
import authMiddleware, { isAdmin } from '../middleware/authMiddleware.js';

// Setup multer storage for QRIS upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/uploads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const prefix = req.path.includes('event') ? 'event-' : 'qris-';
    cb(null, prefix + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const router = express.Router();

// Semua rute admin diproteksi oleh authMiddleware dan isAdmin
router.use(authMiddleware, isAdmin);

router.get('/bookings', getAllBookings);
router.get('/schedule', getSchedule);
router.get('/users', getAllUsers);
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
router.post('/payment-settings/qris', upload.single('qris_image'), uploadQris);

// Event Routes
router.get('/events', getEvents);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);
router.post('/events/:id/image', upload.single('event_image'), uploadEventImage);

export default router;
