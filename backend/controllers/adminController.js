import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

// GET /api/admin/bookings
export const getAllBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, p.status as payment_status, p.payment_method, p.payment_name, p.payment_proof, 
       COALESCE(b.guest_name, u.name) as user_name, u.email as user_email,
       a.name as confirmed_by_name
       FROM bookings b 
       LEFT JOIN payments p ON b.id = p.booking_id 
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN users a ON COALESCE(p.confirmed_by, b.confirmed_by) = a.id
       ORDER BY b.created_at DESC`
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// PUT /api/admin/payments/:id/confirm
export const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params; // booking_id

    // Update payment
    await pool.query('UPDATE payments SET status = $1, confirmed_by = $2 WHERE booking_id = $3', ['confirmed', req.user.id, id]);
    
    // Update booking
    const result = await pool.query('UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *', ['confirmed', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking tidak ditemukan.' });
    }

    const booking = result.rows[0];

    // Notify User & Update Schedule Real-time
    if (req.io) {
      req.io.to(`user_${booking.user_id}`).emit('booking_updated', { booking_id: id, status: 'confirmed' });
      req.io.emit('schedule_updated');
    }

    res.json({ message: 'Pembayaran berhasil dikonfirmasi.', booking });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// PUT /api/admin/payments/:id/reject
export const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params; // booking_id
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Alasan penolakan wajib diisi.' });
    }

    // Update payment status
    await pool.query(
      'UPDATE payments SET status = $1, confirmed_by = $2 WHERE booking_id = $3', 
      ['rejected', req.user.id, id]
    );
    
    // Update booking status and rejection reason
    const result = await pool.query(
      'UPDATE bookings SET status = $1, rejection_reason = $2, confirmed_by = $3 WHERE id = $4 RETURNING *', 
      ['rejected', reason.trim(), req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking tidak ditemukan.' });
    }

    const booking = result.rows[0];

    // Notify User & Update Schedule Real-time
    if (req.io) {
      req.io.to(`user_${booking.user_id}`).emit('booking_updated', { booking_id: id, status: 'rejected' });
      req.io.emit('schedule_updated');
    }

    res.json({ message: 'Pembayaran berhasil ditolak.', booking });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/admin/scan
export const scanBarcode = async (req, res) => {
  try {
    const { barcode } = req.body;
    // Format barcode: PZ-{booking_id}-{time_suffix}
    if (!barcode || !barcode.startsWith('PZ-')) {
      return res.status(400).json({ message: 'Format barcode tidak valid.' });
    }

    const parts = barcode.split('-');
    const booking_id = parts[1];

    const result = await pool.query(
      `SELECT b.*, u.name as user_name 
       FROM bookings b 
       JOIN users u ON b.user_id = u.id 
       WHERE b.id = $1`, 
      [booking_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan dalam sistem.' });
    }

    const booking = result.rows[0];

    if (booking.status === 'checked_in') {
      return res.status(400).json({ 
        message: 'Tiket sudah digunakan! Pelanggan ini sudah melakukan check-in sebelumnya.',
        booking 
      });
    }

    if (booking.status === 'waiting_confirmation') {
      return res.status(400).json({ 
        message: 'Akses ditolak. Pembayaran tiket ini masih menunggu konfirmasi admin.',
        booking 
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'Akses ditolak. Tiket ini telah dibatalkan.',
        booking 
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ 
        message: 'Tiket tidak valid atau pembayaran belum lunas.',
        booking 
      });
    }

    res.json({ 
      message: 'Tiket Valid!', 
      booking 
    });

  } catch (error) {
    console.error('Scan barcode error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/admin/schedule?date=YYYY-MM-DD
export const getSchedule = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Tanggal harus ditentukan.' });

    // 1. Regular bookings
    const regResult = await pool.query(
      `SELECT b.*, COALESCE(b.guest_name, u.name) as user_name 
       FROM bookings b 
       LEFT JOIN users u ON b.user_id = u.id 
       WHERE b.booking_date = $1 
       AND b.status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`,
      [date]
    );

    // 2. Membership sessions
    const memberResult = await pool.query(
      `SELECT b.*, COALESCE(b.guest_name, u.name) as user_name 
       FROM bookings b 
       LEFT JOIN users u ON b.user_id = u.id 
       WHERE b.is_membership = true 
       AND b.status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`
    );

    const bookings = [...regResult.rows];

    for (const mb of memberResult.rows) {
      const mSessions = typeof mb.membership_sessions === 'string' 
        ? JSON.parse(mb.membership_sessions) 
        : mb.membership_sessions;
      
      if (!mSessions) continue;

      for (const s of mSessions) {
        if (s.date === date) {
          bookings.push({
            ...mb,
            booking_date: s.date,
            start_time: s.time,
            // Keep original id so admin can click it if needed
          });
        }
      }
    }

    res.json({ bookings });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/admin/bookings/offline
export const createOfflineBooking = async (req, res) => {
  try {
    const { court_name, booking_date, start_time, duration, user_name } = req.body;
    
    // Check conflict against regular and membership bookings
    const checkConflict = async (date, time, dur) => {
      // Reg
      const regConflict = await pool.query(
        `SELECT id FROM bookings 
         WHERE court_name = $1 AND booking_date = $2 
         AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')
         AND ((start_time::time, (start_time::time + ($4::text || ' hours')::interval)) OVERLAPS ($3::time, ($3::time + ($4::text || ' hours')::interval)))`,
        [court_name, date, time, dur]
      );
      if (regConflict.rows.length > 0) return true;

      // Membership
      const memberBookings = await pool.query(
        `SELECT membership_sessions, duration FROM bookings WHERE court_name = $1 AND is_membership = true 
          AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`, [court_name]
      );
      for (const mb of memberBookings.rows) {
        const mSessions = typeof mb.membership_sessions === 'string' 
          ? JSON.parse(mb.membership_sessions) 
          : mb.membership_sessions;
          
        if (!mSessions) continue;
        for (const s of mSessions) {
          if (s.date === date) {
            const start1 = new Date(`1970-01-01T${time}`);
            const end1 = new Date(start1.getTime() + dur * 60 * 60 * 1000);
            const start2 = new Date(`1970-01-01T${s.time}`);
            const end2 = new Date(start2.getTime() + mb.duration * 60 * 60 * 1000);
            if (start1 < end2 && start2 < end1) return true;
          }
        }
      }
      return false;
    };

    if (await checkConflict(booking_date, start_time, duration)) {
      return res.status(400).json({ message: 'Slot sudah terisi oleh booking lain (Reguler/Membership).' });
    }

    const prices = {
      'Court A - Elite': 1500000,
      'Court B - Premium': 1000000,
      'Court C - Standard': 750000
    };
    const total_price = (prices[court_name] || 0) * duration;

    // Shadow bookings (offline) don't need a real user_id, 
    // but for integrity we'll store the admin's ID as the creator
    const result = await pool.query(
      `INSERT INTO bookings (user_id, court_name, booking_date, start_time, duration, total_price, status, guest_name, confirmed_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, court_name, booking_date, start_time, duration, total_price, 'confirmed', user_name, req.user.id]
    );

    // Notify Everyone Real-time
    if (req.io) {
      req.io.emit('schedule_updated');
    }

    res.status(201).json({
      message: 'Booking offline berhasil dibuat',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Create offline booking error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, created_at FROM users WHERE role NOT IN ('admin', 'owner') AND is_admin = false ORDER BY created_at DESC"
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// DELETE /api/admin/bookings/:id
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
    res.json({ message: 'Booking berhasil dihapus.' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/admin/promotions
export const sendPromotion = async (req, res) => {
  try {
    const { title, content, user_ids } = req.body;
    
    // 1. Save to database for persistent notification on main web
    const result = await pool.query(
      'INSERT INTO promotions (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );
    const promo = result.rows[0];

    // 2. Real-time notification to web clients
    if (req.io) {
      req.io.emit('new_promotion', {
        title: promo.title,
        content: promo.content,
        created_at: promo.created_at
      });
    }

    // 3. Logic for sending real emails could go here
    // In a real app, you would loop through user_ids and use Nodemailer/Resend
    console.log(`[Promotion] Campaign "${title}" sent to ${user_ids?.length || 'all'} users.`);

    res.json({ message: 'Promosi berhasil disimpan dan dikirim!', promo });
  } catch (error) {
    console.error('Send promotion error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/admin/staff
export const getAdmins = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, role, is_admin, created_at FROM users WHERE is_admin = true OR role IN ('admin', 'owner') ORDER BY created_at DESC"
    );
    res.json({ admins: result.rows });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/admin/staff
export const createAdmin = async (req, res) => {
  try {
    const { name, password, role, verifyPin } = req.body;
    let { email } = req.body;

    if (!name || !password || !verifyPin) {
      return res.status(400).json({ message: 'Nama, PIN Baru, dan PIN Verifikasi Owner wajib diisi.' });
    }

    // VERIFY OWNER PIN FIRST
    const ownerResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const owner = ownerResult.rows[0];
    const isPinValid = await bcrypt.compare(verifyPin, owner.password);
    
    if (!isPinValid) {
      return res.status(401).json({ message: 'PIN Verifikasi Owner salah. Gagal mendaftarkan admin baru.' });
    }

    // If email is not provided (simplified form), generate one based on name
    if (!email) {
      const slug = name.toLowerCase().replace(/\s+/g, '.');
      email = `${slug}@padelzone.admin`;
    }

    // Check existing
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Nama admin ini sudah terdaftar. Gunakan nama lain.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone, is_admin, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role',
      [name, email, hashedPassword, null, true, role || 'admin']
    );

    res.status(201).json({ message: 'Akun Admin berhasil diaktifkan.', admin: result.rows[0] });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// DELETE /api/admin/staff/:id
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Anda tidak bisa menghapus akun sendiri.' });
    }

    // Check if target is owner and requester is not owner
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (target.rows.length > 0 && target.rows[0].role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Hanya Owner yang bisa menghapus sesama Owner.' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Akun Admin berhasil dihapus.' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};
// PUT /api/admin/change-password
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Password lama dan baru wajib diisi.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'PIN baru minimal harus 6 angka.' });
    }

    // Get current user
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password lama (PIN) salah.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ message: 'PIN berhasil diperbarui.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/admin/notifications
export const getNotifications = async (req, res) => {
  try {
    // 1. Recent Payments (Confirmed or Waiting)
    const payments = await pool.query(
      `SELECT b.id, b.status, COALESCE(b.guest_name, u.name) as user_name, b.total_price, b.created_at, a.name as admin_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN users a ON b.confirmed_by = a.id
       WHERE b.status IN ('confirmed', 'waiting_confirmation')
       ORDER BY b.created_at DESC LIMIT 20`
    );

    // 2. Recent Check-ins
    const checkins = await pool.query(
      `SELECT b.id, b.booking_date, b.start_time, COALESCE(b.guest_name, u.name) as user_name, a.name as admin_name, b.updated_at as checkin_time
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN users a ON b.confirmed_by = a.id
       WHERE b.status = 'checked_in'
       ORDER BY b.updated_at DESC LIMIT 20`
    );

    // 3. Recent Chat Activities
    const messages = await pool.query(
      `SELECT m.*, u.name as sender_name 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.is_admin_sender = false
       ORDER BY m.created_at DESC LIMIT 20`
    );

    res.json({
      payments: payments.rows,
      checkins: checkins.rows,
      messages: messages.rows
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/admin/confirm-checkin
export const confirmCheckin = async (req, res) => {
  try {
    const { booking_id } = req.body;
    
    if (!booking_id) {
      return res.status(400).json({ message: 'Booking ID wajib diisi.' });
    }

    // Update status to checked_in
    await pool.query(
      'UPDATE bookings SET status = $1, confirmed_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['checked_in', req.user.id, booking_id]
    );

    res.json({ message: 'Check-in berhasil dikonfirmasi.' });
  } catch (error) {
    console.error('Confirm checkin error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    // 1. Total Revenue Today
    const revToday = await pool.query(
      "SELECT SUM(total_price) as total FROM bookings WHERE created_at::date = CURRENT_DATE AND status IN ('confirmed', 'checked_in')",
    );

    // 2. Confirmed Bookings Today (Regular bookings for today + transactions made today)
    const bookingsToday = await pool.query(
      "SELECT COUNT(*) as total FROM bookings WHERE (booking_date = CURRENT_DATE OR created_at::date = CURRENT_DATE) AND status IN ('confirmed', 'checked_in')"
    );

    // 3. Active Users (last 30 days)
    const activeUsers = await pool.query(
      "SELECT COUNT(DISTINCT user_id) as total FROM bookings WHERE created_at > CURRENT_DATE - INTERVAL '30 days'"
    );

    // 4. Daily Revenue (last 30 days) - Based on transaction date (created_at)
    const dailyRev = await pool.query(
      `SELECT TO_CHAR(d, 'DD Mon') as label, COALESCE(SUM(b.total_price), 0) as revenue 
       FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') d
       LEFT JOIN bookings b ON b.created_at::date = d AND b.status IN ('confirmed', 'checked_in')
       GROUP BY d
       ORDER BY d`
    );

    // 5. Peak Hours
    const peakHours = await pool.query(
      `SELECT start_time, COUNT(*) as count 
       FROM bookings 
       WHERE status IN ('confirmed', 'checked_in')
       AND booking_date > CURRENT_DATE - INTERVAL '30 days'
       GROUP BY start_time 
       ORDER BY count DESC LIMIT 5`
    );

    // 6. Recent Activity
    const recentActivity = await pool.query(
      `SELECT b.id, COALESCE(b.guest_name, u.name) as user_name, b.status, b.created_at, b.court_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC LIMIT 10`
    );

    res.json({
      revenueToday: Number(revToday.rows[0].total || 0),
      bookingsToday: Number(bookingsToday.rows[0].total || 0),
      activeUsers: Number(activeUsers.rows[0].total || 0),
      dailyRevenue: dailyRev.rows,
      peakHours: peakHours.rows,
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/admin/close-court
export const closeCourt = async (req, res) => {
  const { court_name, booking_date, start_time, duration, reason } = req.body;
  try {
    const checkConflict = async (date, time, dur) => {
      const regConflict = await pool.query(
        `SELECT id FROM bookings 
         WHERE court_name = $1 AND booking_date = $2 
         AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')
         AND ((start_time::time, (start_time::time + ($4::text || ' hours')::interval)) OVERLAPS ($3::time, ($3::time + ($4::text || ' hours')::interval)))`,
        [court_name, date, time, dur]
      );
      return regConflict.rows.length > 0;
    };

    if (await checkConflict(booking_date, start_time, duration)) {
      return res.status(400).json({ message: 'Slot sudah terisi atau sudah ditutup sebelumnya.' });
    }

    await pool.query(
      `INSERT INTO bookings (court_name, booking_date, start_time, duration, status, guest_name, total_price, user_id)
       VALUES ($1, $2, $3, $4, 'closed', $5, 0, $6)`,
      [court_name, booking_date, start_time, duration, reason || 'Maintenance/Tutup Lapangan', req.user.id]
    );

    res.json({ message: 'Lapangan berhasil ditutup untuk jam tersebut.' });
  } catch (error) {
    console.error('Close court error:', error);
    res.status(500).json({ message: 'Gagal menutup lapangan.' });
  }
};

// GET /api/admin/payment-settings
export const getPaymentSettings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_settings ORDER BY type ASC, created_at ASC'
    );
    res.json({ settings: result.rows });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ message: 'Gagal mengambil pengaturan pembayaran.' });
  }
};

// POST /api/admin/payment-settings
export const createPaymentSetting = async (req, res) => {
  try {
    const { type, bank_name, account_number, account_holder } = req.body;

    if (type === 'bank') {
      if (!bank_name || !account_number || !account_holder) {
        return res.status(400).json({ message: 'Nama bank, nomor rekening, dan nama pemilik wajib diisi.' });
      }

      const result = await pool.query(
        'INSERT INTO payment_settings (type, bank_name, account_number, account_holder) VALUES ($1, $2, $3, $4) RETURNING *',
        ['bank', bank_name, account_number, account_holder]
      );
      return res.status(201).json({ message: 'Rekening berhasil ditambahkan.', setting: result.rows[0] });
    }

    return res.status(400).json({ message: 'Tipe pengaturan tidak valid.' });
  } catch (error) {
    console.error('Create payment setting error:', error);
    res.status(500).json({ message: 'Gagal menambahkan rekening.' });
  }
};

// PUT /api/admin/payment-settings/:id
export const updatePaymentSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { bank_name, account_number, account_holder, is_active } = req.body;

    const result = await pool.query(
      `UPDATE payment_settings 
       SET bank_name = COALESCE($1, bank_name), 
           account_number = COALESCE($2, account_number), 
           account_holder = COALESCE($3, account_holder),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [bank_name, account_number, account_holder, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pengaturan tidak ditemukan.' });
    }

    res.json({ message: 'Pengaturan berhasil diperbarui.', setting: result.rows[0] });
  } catch (error) {
    console.error('Update payment setting error:', error);
    res.status(500).json({ message: 'Gagal memperbarui pengaturan.' });
  }
};

// DELETE /api/admin/payment-settings/:id
export const deletePaymentSetting = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM payment_settings WHERE id = $1', [id]);
    res.json({ message: 'Pengaturan berhasil dihapus.' });
  } catch (error) {
    console.error('Delete payment setting error:', error);
    res.status(500).json({ message: 'Gagal menghapus pengaturan.' });
  }
};

// POST /api/admin/payment-settings/qris (upload QRIS image)
export const uploadQris = async (req, res) => {
  try {
    const qris_image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!qris_image) {
      return res.status(400).json({ message: 'File QRIS wajib diunggah.' });
    }

    // Check if QRIS setting already exists
    const existing = await pool.query("SELECT id FROM payment_settings WHERE type = 'qris'");

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        "UPDATE payment_settings SET qris_image = $1, updated_at = CURRENT_TIMESTAMP WHERE type = 'qris' RETURNING *",
        [qris_image]
      );
    } else {
      result = await pool.query(
        "INSERT INTO payment_settings (type, qris_image) VALUES ('qris', $1) RETURNING *",
        [qris_image]
      );
    }

    res.json({ message: 'QRIS berhasil diperbarui.', setting: result.rows[0] });
  } catch (error) {
    console.error('Upload QRIS error:', error);
    res.status(500).json({ message: 'Gagal mengunggah QRIS.' });
  }
};

// ===== EVENT MANAGEMENT =====

// GET /api/admin/events
export const getEvents = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/admin/events
export const createEvent = async (req, res) => {
  try {
    const { title, description, content, date, location } = req.body;
    if (!title) return res.status(400).json({ message: 'Judul event wajib diisi.' });

    const result = await pool.query(
      'INSERT INTO events (title, description, content, date, location) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description || '', content || '', date || null, location || '']
    );
    res.status(201).json({ message: 'Event berhasil dibuat.', event: result.rows[0] });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Gagal membuat event.' });
  }
};

// PUT /api/admin/events/:id
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, date, location, is_active } = req.body;

    const result = await pool.query(
      `UPDATE events SET 
        title = COALESCE($1, title), 
        description = COALESCE($2, description), 
        content = COALESCE($3, content), 
        date = COALESCE($4, date), 
        location = COALESCE($5, location),
        is_active = COALESCE($6, is_active)
      WHERE id = $7 RETURNING *`,
      [title, description, content, date || null, location, is_active, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Event tidak ditemukan.' });
    res.json({ message: 'Event berhasil diperbarui.', event: result.rows[0] });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Gagal memperbarui event.' });
  }
};

// DELETE /api/admin/events/:id
export const deleteEvent = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Event tidak ditemukan.' });
    res.json({ message: 'Event berhasil dihapus.' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Gagal menghapus event.' });
  }
};

// POST /api/admin/events/:id/image
export const uploadEventImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'File gambar wajib diunggah.' });

    const imagePath = '/uploads/' + req.file.filename;
    const result = await pool.query(
      'UPDATE events SET image = $1 WHERE id = $2 RETURNING *',
      [imagePath, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Event tidak ditemukan.' });
    res.json({ message: 'Gambar event berhasil diunggah.', event: result.rows[0] });
  } catch (error) {
    console.error('Upload event image error:', error);
    res.status(500).json({ message: 'Gagal mengunggah gambar.' });
  }
};

// PUT /api/admin/users/:id/generate-token
export const generateResetToken = async (req, res) => {
  try {
    const { id } = req.params;

    // Generate 6 digit token
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // FIX: set expiry 15 menit dari sekarang — token tidak bisa dipakai setelah expired
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    const result = await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3 RETURNING id, name, email, reset_token',
      [token, expiresAt, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    res.json({ message: 'Token reset berhasil dibuat.', user: result.rows[0], token: result.rows[0].reset_token });
  } catch (error) {
    console.error('Generate reset token error:', error);
    res.status(500).json({ message: 'Gagal membuat token reset.' });
  }
};
