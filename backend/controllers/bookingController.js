import pool from '../config/db.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: parse "HH:MM" atau "HH:MM:SS" → total menit sejak midnight
// ─────────────────────────────────────────────────────────────────────────────
const timeToMinutes = (time) => {
  if (!time) return null;
  const parts = time.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: apakah dua interval waktu overlap?
// A: [startA, startA + durA jam)  vs  B: [startB, startB + durB jam)
// ─────────────────────────────────────────────────────────────────────────────
const isOverlapping = (startA, durA, startB, durB) => {
  const minA = timeToMinutes(startA);
  const minB = timeToMinutes(startB);
  if (minA === null || minB === null) return false;
  const endA = minA + durA * 60;
  const endB = minB + durB * 60;
  return minA < endB && minB < endA;
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE: cek konflik untuk satu slot (court + date + time + duration)
// Mengecek KEDUA tipe booking (regular & membership) sekaligus
// Return: false | { conflict: true, type, ... }
// ─────────────────────────────────────────────────────────────────────────────
const checkConflict = async (courtName, date, time, duration) => {
  const dur = parseInt(duration);
  if (!time || !date || isNaN(dur)) return false;

  // 1. Cek regular bookings (is_membership = false)
  const regResult = await pool.query(
    `SELECT id, start_time, duration FROM bookings
     WHERE court_name = $1
       AND booking_date = $2
       AND is_membership = false
       AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`,
    [courtName, date]
  );

  for (const row of regResult.rows) {
    if (isOverlapping(time, dur, row.start_time, parseInt(row.duration))) {
      return { conflict: true, type: 'regular', row };
    }
  }

  // 2. Cek membership sessions — ambil semua membership aktif untuk court ini
  const memberResult = await pool.query(
    `SELECT id, membership_sessions, duration FROM bookings
     WHERE court_name = $1
       AND is_membership = true
       AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`,
    [courtName]
  );

  for (const mb of memberResult.rows) {
    let sessions = [];
    try {
      sessions = typeof mb.membership_sessions === 'string'
        ? JSON.parse(mb.membership_sessions)
        : (mb.membership_sessions || []);
    } catch (e) {
      continue;
    }
    if (!Array.isArray(sessions)) continue;

    for (const s of sessions) {
      if (s.date === date) {
        if (isOverlapping(time, dur, s.time, parseInt(mb.duration))) {
          return { conflict: true, type: 'membership', row: mb, session: s };
        }
      }
    }
  }

  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings
// ─────────────────────────────────────────────────────────────────────────────
export const createBooking = async (req, res) => {
  try {
    const {
      court_name, booking_date, start_time, duration,
      total_price, is_membership, membership_sessions
    } = req.body;
    const user_id = req.user.id;

    if (!court_name || !duration || !total_price) {
      return res.status(400).json({ message: 'Data booking tidak lengkap.' });
    }

    // Validasi jam operasional (08:00 - 23:00)
    const validateTime = (time) => {
      if (!time) return true;
      const hour = parseInt(time.split(':')[0]);
      return hour >= 8 && hour <= 23;
    };

    if (!is_membership && !validateTime(start_time)) {
      return res.status(400).json({ message: 'Maaf, PadelZone hanya melayani booking antara pukul 08:00 - 23:00 WIB.' });
    }

    if (is_membership && membership_sessions) {
      for (const s of membership_sessions) {
        if (!validateTime(s.time)) {
          return res.status(400).json({
            message: `Sesi jam ${s.time} berada di luar jam operasional (08:00 - 23:00).`
          });
        }
      }
    }

    // Validasi tidak booking waktu yang sudah lewat
    const now = new Date();
    if (!is_membership && booking_date && start_time) {
      const bookingDateTime = new Date(`${booking_date}T${start_time}`);
      if (bookingDateTime < now) {
        return res.status(400).json({
          message: `Maaf, jam ${start_time} pada tanggal ${booking_date} sudah terlewati.`
        });
      }
    }

    if (is_membership && membership_sessions) {
      for (const s of membership_sessions) {
        const sessionDateTime = new Date(`${s.date}T${s.time}`);
        if (sessionDateTime < now) {
          return res.status(400).json({
            message: `Sesi tanggal ${s.date} jam ${s.time} sudah terlewati. Silakan pilih jadwal yang akan datang.`
          });
        }
      }
    }

    // ── CEK KONFLIK ──────────────────────────────────────────────────────────
    if (!is_membership) {
      const conflict = await checkConflict(court_name, booking_date, start_time, duration);
      if (conflict) {
        return res.status(400).json({
          message: `Jadwal pada Tanggal ${booking_date} pukul ${start_time} WIB sudah terisi. Silakan pilih waktu lain.`
        });
      }
    } else if (is_membership && membership_sessions) {
      // Validasi: tidak ada duplikat di dalam input itu sendiri
      const seen = new Set();
      for (const s of membership_sessions) {
        const key = `${s.date}_${s.time}`;
        if (seen.has(key)) {
          return res.status(400).json({
            message: `Terdapat duplikat jadwal: ${s.date} pukul ${s.time}. Setiap sesi harus berbeda.`
          });
        }
        seen.add(key);
      }

      // Cek konflik setiap sesi terhadap booking yang sudah ada
      for (const session of membership_sessions) {
        const conflict = await checkConflict(court_name, session.date, session.time, duration);
        if (conflict) {
          return res.status(400).json({
            message: `Jadwal sesi ${session.date} pukul ${session.time} WIB sudah terisi. Silakan ganti jadwal tersebut.`
          });
        }
      }
    }

    // ── INSERT ───────────────────────────────────────────────────────────────
    const result = await pool.query(
      `INSERT INTO bookings
         (user_id, court_name, booking_date, start_time, duration, total_price, status, is_membership, membership_sessions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        user_id,
        court_name,
        booking_date || null,
        start_time || null,
        duration,
        total_price,
        'pending',
        is_membership || false,
        membership_sessions ? JSON.stringify(membership_sessions) : null
      ]
    );

    // Notify Everyone Real-time
    if (req.io) {
      req.io.emit('schedule_updated');
    }

    res.status(201).json({
      message: 'Booking berhasil dibuat',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/my-bookings
// ─────────────────────────────────────────────────────────────────────────────
export const getMyBookings = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT b.*, b.rejection_reason, p.status as payment_status, p.payment_method, p.paid_at
       FROM bookings b
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [user_id]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/schedule?date=YYYY-MM-DD
//
// Mengembalikan semua slot terisi untuk tanggal tertentu,
// dari KEDUA tipe booking (regular & membership sessions).
// Setiap entry: { court_name, start_time (HH:MM), duration, status }
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicSchedule = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Tanggal harus ditentukan.' });

    // 1. Regular bookings — langsung punya booking_date & start_time di kolom DB
    const regResult = await pool.query(
      `SELECT court_name,
              to_char(start_time, 'HH24:MI') AS start_time,
              duration,
              status
       FROM bookings
       WHERE booking_date = $1
         AND is_membership = false
         AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`,
      [date]
    );

    const schedule = [...regResult.rows];

    // 2. Membership bookings — sessions disimpan sebagai JSON array
    const memberResult = await pool.query(
      `SELECT court_name, membership_sessions, duration, status
       FROM bookings
       WHERE is_membership = true
         AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`
    );

    for (const mb of memberResult.rows) {
      let sessions = [];
      try {
        sessions = typeof mb.membership_sessions === 'string'
          ? JSON.parse(mb.membership_sessions)
          : (mb.membership_sessions || []);
      } catch (e) {
        continue;
      }
      if (!Array.isArray(sessions)) continue;

      for (const s of sessions) {
        // Normalise ke "HH:MM" supaya konsisten dengan format regular
        const normalTime = s.time ? s.time.substring(0, 5) : null;
        if (s.date === date && normalTime) {
          schedule.push({
            court_name: mb.court_name,  // penting: filter di frontend pakai ini
            start_time: normalTime,
            duration: mb.duration,
            status: mb.status
          });
        }
      }
    }

    res.json({ schedule });
  } catch (error) {
    console.error('Fetch public schedule error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};
