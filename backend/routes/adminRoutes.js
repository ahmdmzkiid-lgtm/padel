import express from 'express';
import {
  getAllBookings, confirmPayment, rejectPayment, scanBarcode,
  getSchedule, createOfflineBooking, deleteBooking, getAllUsers,
  sendPromotion, getAdmins, createAdmin, deleteAdmin, changePassword,
  getNotifications, confirmCheckin, getStats, closeCourt,
  getPaymentSettings, createPaymentSetting, updatePaymentSetting,
  deletePaymentSetting, uploadQrisHandler, getEvents, createEvent, updateEvent,
  deleteEvent, uploadEventImageHandler, generateResetToken
} from '../controllers/adminController.js';
import authMiddleware, { isAdmin } from '../middleware/authMiddleware.js';
import { uploadQris, uploadEvent, createUploadMiddleware } from '../config/cloudinary.js';

// Middleware upload ke Cloudinary
const uploadQrisMiddleware = createUploadMiddleware(uploadQris, 'qris_image');
const uploadEventMiddleware = createUploadMiddleware(uploadEvent, 'event_image');

const router = express.Router();

// Semua rute admin diproteksi
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

// Payment Settings
router.get('/payment-settings', getPaymentSettings);
router.post('/payment-settings', createPaymentSetting);
router.put('/payment-settings/:id', updatePaymentSetting);
router.delete('/payment-settings/:id', deletePaymentSetting);
router.post('/payment-settings/qris', uploadQrisMiddleware, uploadQrisHandler);

// Events
router.get('/events', getEvents);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);
router.post('/events/:id/image', uploadEventMiddleware, uploadEventImageHandler);

export default router;
