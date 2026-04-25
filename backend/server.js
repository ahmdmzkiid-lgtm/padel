import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import pool from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import voucherRoutes from './routes/voucherRoutes.js';
import eventRoutes from './routes/eventRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

const allowedOrigins = '*';

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// ── Rate Limiting ─────────────────────────────────────────────────────────────

// Login: max 10 percobaan per 15 menit per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register: max 5 akun per jam per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Terlalu banyak pendaftaran dari IP ini. Silakan coba lagi dalam 1 jam.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking: max 20 request per 10 menit per IP
const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { message: 'Terlalu banyak request booking. Silakan tunggu sebentar.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment upload: max 10 upload per 30 menit per IP
const paymentLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: { message: 'Terlalu banyak upload pembayaran. Silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: max 200 request per 10 menit per IP (fallback)
const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  message: { message: 'Terlalu banyak request. Silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/bookings', bookingLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/events', eventRoutes);

// Serve uploads folder statically
app.use('/uploads', express.static(join(__dirname, 'public/uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PadelZone API is running' });
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // Real-time Chat System
  socket.on('send_message', async (data) => {
    try {
      const { sender_id, message } = data;
      const result = await pool.query(
        'INSERT INTO messages (sender_id, message, is_admin_sender) VALUES ($1, $2, false) RETURNING *',
        [sender_id, message]
      );
      const savedMsg = result.rows[0];
      io.to('admins').emit('new_chat_message', savedMsg);
    } catch (error) {
      console.error('Socket send_message error:', error);
    }
  });

  socket.on('admin_reply', async (data) => {
    try {
      const { receiver_id, message } = data;
      const result = await pool.query(
        'INSERT INTO messages (receiver_id, message, is_admin_sender) VALUES ($1, $2, true) RETURNING *',
        [receiver_id, message]
      );
      const savedMsg = result.rows[0];
      io.to(`user_${receiver_id}`).emit('new_chat_message', savedMsg);
    } catch (error) {
      console.error('Socket admin_reply error:', error);
    }
  });
});

// ── DB Init ───────────────────────────────────────────────────────────────────
const initDB = async () => {
  try {
    const sql = readFileSync(join(__dirname, 'db', 'init.sql'), 'utf-8');
    await pool.query(sql);
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
};

// Auto-delete pending bookings older than 24 hours
const cleanupExpiredBookings = async () => {
  try {
    const result = await pool.query(
      "DELETE FROM bookings WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'"
    );
    if (result.rowCount > 0) {
      console.log(`[Cleanup] Deleted ${result.rowCount} expired pending bookings.`);
      io.emit('schedule_updated');
    }
  } catch (error) {
    console.error('[Cleanup Error]', error.message);
  }
};

// ── Start ─────────────────────────────────────────────────────────────────────
const startServer = async () => {
  await initDB();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    setInterval(cleanupExpiredBookings, 60 * 60 * 1000);
    cleanupExpiredBookings();
  });
};

startServer();
