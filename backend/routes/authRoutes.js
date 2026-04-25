import { Router } from 'express';
import { register, login, getMe, resetPasswordWithToken } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

// Rate limit khusus reset password:
// Max 5 percobaan per 15 menit per IP — cegah brute-force token 6 digit
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Terlalu banyak percobaan reset password. Silakan tunggu 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

// Reset password — dilindungi rate limiter
router.post('/reset-password-with-token', resetLimiter, resetPasswordWithToken);

export default router;
