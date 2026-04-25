import express from 'express';
import { createReview, getReviews } from '../controllers/reviewController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createReview);
router.get('/', getReviews);

export default router;
