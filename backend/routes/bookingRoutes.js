import { Router } from 'express';
import { createBooking, getMyBookings, getPublicSchedule } from '../controllers/bookingController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// Public route
router.get('/schedule', getPublicSchedule);

// Protected routes
router.post('/', authMiddleware, createBooking);
router.get('/my-bookings', authMiddleware, getMyBookings);

export default router;
