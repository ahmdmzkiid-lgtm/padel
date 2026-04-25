import express from 'express';
import { createVoucher, getVouchers, validateVoucher } from '../controllers/voucherController.js';
import authMiddleware, { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin routes
router.post('/', authMiddleware, isAdmin, createVoucher);
router.get('/', authMiddleware, isAdmin, getVouchers);

// User routes
router.post('/validate', authMiddleware, validateVoucher);

export default router;
