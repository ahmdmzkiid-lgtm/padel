import express from 'express';
import { getChatHistory, getAdminChatList, deleteChatHistory } from '../controllers/chatController.js';
import authMiddleware, { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// User & Admin: Get history
router.get('/history/:userId', authMiddleware, getChatHistory);

// User & Admin: Delete history
router.delete('/history/:userId', authMiddleware, deleteChatHistory);

// Admin only: Get list of active chats
router.get('/admin/list', authMiddleware, isAdmin, getAdminChatList);

export default router;
