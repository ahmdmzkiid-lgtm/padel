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

    // Verify booking — pastikan booking milik user yang sedang login
    const bookingResult = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
      [booking_id, user_id]
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking tidak ditemukan.' });
    }

    const booking = bookingResult.rows[0];
    if (booking.status === 'confirmed' || booking.status === 'waiting_confirmation') {
      return res.status(400).json({ message: 'Booking ini sudah dibayar atau sedang dalam proses konfirmasi.' });
    }

    // ── FIX: Validasi voucher ownership ───────────────────────────────────────
    // Sebelumnya: langsung pakai voucher_id dari client tanpa cek kepemilikan
    // Sekarang: verifikasi bahwa voucher milik user yang sedang login DAN belum dipakai
    if (voucher_id) {
      const voucherResult = await pool.query(
        'SELECT * FROM vouchers WHERE id = $1 AND user_id = $2 AND is_used = false',
        [voucher_id, user_id]  // ← kunci: user_id dari token, bukan dari client
      );

      if (voucherResult.rows.length === 0) {
        return res.status(400).json({
          message: 'Voucher tidak valid, sudah digunakan, atau bukan milik Anda.'
        });
      }

      const voucher = voucherResult.rows[0];

      // Pastikan jumlah yang dibayar masuk akal (tidak lebih kecil dari harga - diskon)
      const expectedMin = booking.total_price - voucher.discount_amount;
      if (Number(amount) < expectedMin - 1) { // toleransi 1 rupiah untuk pembulatan
        return res.status(400).json({
          message: 'Jumlah pembayaran tidak sesuai dengan harga setelah diskon voucher.'
        });
      }

      // Tandai voucher sebagai sudah dipakai
      await pool.query('UPDATE vouchers SET is_used = true WHERE id = $1', [voucher_id]);

      // Update harga booking
      await pool.query(
        'UPDATE bookings SET total_price = $1, voucher_id = $2 WHERE id = $3',
        [amount, voucher_id, booking_id]
      );
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
