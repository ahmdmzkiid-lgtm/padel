import pool from '../config/db.js';

// POST /api/payments
export const simulatePayment = async (req, res) => {
  try {
    const { booking_id, amount, payment_method, payment_name, voucher_id } = req.body;
    const user_id = req.user.id; 
    const payment_proof = req.file ? `/uploads/${req.file.filename}` : null;

    if (!booking_id || !amount || !payment_method || !payment_name) {
      return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }

    if (!payment_proof) {
      return res.status(400).json({ message: 'Bukti transfer wajib diunggah.' });
    }

    // Verify booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1 AND user_id = $2', [booking_id, user_id]);
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking tidak ditemukan.' });
    }

    const booking = bookingResult.rows[0];
    if (booking.status === 'confirmed' || booking.status === 'waiting_confirmation') {
      return res.status(400).json({ message: 'Booking ini sudah dibayar atau sedang dalam proses konfirmasi.' });
    }

    // If voucher is used, update booking price and mark voucher as used
    if (voucher_id) {
      await pool.query('UPDATE vouchers SET is_used = true WHERE id = $1', [voucher_id]);
      await pool.query('UPDATE bookings SET total_price = $1, voucher_id = $2 WHERE id = $3', [amount, voucher_id, booking_id]);
    }

    // Insert payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (booking_id, amount, payment_method, status, paid_at, payment_name, payment_proof) 
       VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING *`,
      [booking_id, amount, payment_method, 'waiting_confirmation', payment_name, payment_proof]
    );

    // Update booking status
    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', ['waiting_confirmation', booking_id]);

    // Notify Admin & Update Schedule Real-time
    if (req.io) {
      req.io.emit('payment_uploaded', { booking_id, user_id });
      req.io.emit('schedule_updated');
    }

    res.status(201).json({
      message: 'Pembayaran berhasil dikonfirmasi',
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server saat memproses pembayaran.' });
  }
};
