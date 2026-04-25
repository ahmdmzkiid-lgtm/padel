import pool from '../config/db.js';

// POST /api/bookings
export const createBooking = async (req, res) => {
  try {
    const { court_name, booking_date, start_time, duration, total_price, is_membership, membership_sessions } = req.body;
    const user_id = req.user.id;

    if (!court_name || !duration || !total_price) {
      return res.status(400).json({ message: 'Data booking tidak lengkap.' });
    }

    // Validate Operational Hours (08:00 - 23:00)
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
          return res.status(400).json({ message: `Sesi jam ${s.time} berada di luar jam operasional (08:00 - 23:00).` });
        }
      }
    }

    // Check if user is trying to book past time
    const now = new Date();
    if (booking_date && start_time) {
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

    // Check for overlapping bookings (confirmed, waiting, or pending)
    const checkConflict = async (court_name, date, time, duration) => {
      try {
        const dur = parseInt(duration);
        if (!time || isNaN(dur)) return false;

        // 1. Check regular bookings overlap using OVERLAPS operator
        const regConflict = await pool.query(
          `SELECT id FROM bookings 
           WHERE court_name = $1 
           AND booking_date = $2 
           AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')
           AND (
             (start_time, (duration::text || ' hours')::interval) OVERLAPS ($3::time, ($4::text || ' hours')::interval)
           )`,
          [court_name, date, time, dur]
        );
        if (regConflict.rows.length > 0) return true;

        // 2. Check membership sessions overlap
        const memberBookings = await pool.query(
          `SELECT membership_sessions, duration FROM bookings 
           WHERE court_name = $1 
           AND is_membership = true 
           AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`,
          [court_name]
        );

        for (const mb of memberBookings.rows) {
          let mSessions = [];
          try {
            mSessions = typeof mb.membership_sessions === 'string' 
              ? JSON.parse(mb.membership_sessions) 
              : (mb.membership_sessions || []);
          } catch (e) {
            continue;
          }
          
          if (!Array.isArray(mSessions)) continue;
          
          for (const s of mSessions) {
            if (s.date === date) {
              const t1 = `1970-01-01T${time.length === 5 ? time + ':00' : time}`;
              const t2 = `1970-01-01T${s.time.length === 5 ? s.time + ':00' : s.time}`;
              
              const start1 = new Date(t1);
              const end1 = new Date(start1.getTime() + dur * 60 * 60 * 1000);
              const start2 = new Date(t2);
              const end2 = new Date(start2.getTime() + parseInt(mb.duration) * 60 * 60 * 1000);

              if (start1 < end2 && start2 < end1) return true;
            }
          }
        }

        return false;
      } catch (err) {
        return false; 
      }
    };

    if (!is_membership) {
      if (await checkConflict(court_name, booking_date, start_time, duration)) {
        return res.status(400).json({ 
          message: `Jadwal pada Tanggal ${booking_date} pukul ${start_time} WIB sudah terisi. Silakan pilih waktu lain.` 
        });
      }
    } else if (is_membership && membership_sessions) {
      for (const session of membership_sessions) {
        if (await checkConflict(court_name, session.date, session.time, duration)) {
          return res.status(400).json({ 
            message: `Salah satu jadwal pilihan Anda, yaitu Tanggal ${session.date} pukul ${session.time} WIB, sudah terisi. Silakan ganti jadwal tersebut.` 
          });
        }
      }
    }

    // Insert booking
    const result = await pool.query(
      `INSERT INTO bookings (user_id, court_name, booking_date, start_time, duration, total_price, status, is_membership, membership_sessions) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
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

    res.status(201).json({
      message: 'Booking berhasil dibuat',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/bookings/my-bookings
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

// GET /api/bookings/schedule?date=YYYY-MM-DD
export const getPublicSchedule = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Tanggal harus ditentukan.' });

    // 1. Regular bookings
    const regResult = await pool.query(
      `SELECT court_name, start_time, duration, status 
       FROM bookings 
       WHERE booking_date = $1 
       AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`,
      [date]
    );

    // 2. Membership sessions
    const memberResult = await pool.query(
      `SELECT court_name, membership_sessions, duration, status 
       FROM bookings 
       WHERE is_membership = true 
       AND status IN ('confirmed', 'waiting_confirmation', 'checked_in', 'closed', 'pending')`
    );

    const schedule = [...regResult.rows];

    for (const mb of memberResult.rows) {
      const mSessions = typeof mb.membership_sessions === 'string' 
        ? JSON.parse(mb.membership_sessions) 
        : mb.membership_sessions;
      
      if (!mSessions) continue;

      for (const s of mSessions) {
        if (s.date === date) {
          schedule.push({
            court_name: mb.court_name,
            start_time: s.time,
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
