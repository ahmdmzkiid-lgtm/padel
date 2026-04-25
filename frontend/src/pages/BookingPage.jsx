import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, CheckCircle2, UserCheck, CalendarDays, XCircle, Search } from 'lucide-react';
import api from '../utils/api';

const COURTS = [
  { id: 'Court A', name: 'Court A - Elite', price: 1500000, type: 'Indoor' },
  { id: 'Court B', name: 'Court B - Premium', price: 1000000, type: 'Indoor' },
  { id: 'Court C', name: 'Court C - Standard', price: 750000, type: 'Semi-Outdoor' }
];

const DURATIONS = [1, 2, 3, 4]; // hours

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise waktu ke "HH:MM" (buang detik jika ada) */
const normalizeTime = (t) => (t ? t.substring(0, 5) : '');

/** Total menit sejak midnight */
const toMinutes = (t) => {
  const normalized = normalizeTime(t);
  if (!normalized) return null;
  const [h, m] = normalized.split(':').map(Number);
  return h * 60 + m;
};

/** Apakah dua slot waktu overlap? */
const slotsOverlap = (startA, durA, startB, durB) => {
  const minA = toMinutes(startA);
  const minB = toMinutes(startB);
  if (minA === null || minB === null) return false;
  return minA < minB + durB * 60 && minB < minA + durA * 60;
};

// ─────────────────────────────────────────────────────────────────────────────

const BookingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [bookingType, setBookingType] = useState(location.state?.type || 'reguler');

  const [formData, setFormData] = useState({
    court: COURTS[0],
    date: '',
    time: '18:00',
    duration: 1
  });

  const [sessions, setSessions] = useState([
    { date: '', time: '18:00' },
    { date: '', time: '18:00' },
    { date: '', time: '18:00' },
    { date: '', time: '18:00' }
  ]);

  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });

  // takenSlots: { 'YYYY-MM-DD': [ { court_name, start_time (HH:MM), duration, status } ] }
  const [takenSlots, setTakenSlots] = useState({});

  // ── Set default dates ──────────────────────────────────────────────────────
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setFormData(prev => ({ ...prev, date: tomorrowStr }));

    setSessions(prev => prev.map((s, i) => {
      const d = new Date(tomorrow);
      d.setDate(d.getDate() + i * 7);
      return { ...s, date: d.toISOString().split('T')[0] };
    }));
  }, []);

  if (!user) {
    navigate('/login', { state: { redirectTo: '/booking', redirectState: location.state } });
    return null;
  }

  // ── Fetch schedule untuk satu tanggal ─────────────────────────────────────
  const fetchSlots = useCallback(async (date) => {
    if (!date) return;
    // Jangan fetch ulang kalau sudah ada
    if (takenSlots[date]) return;
    try {
      const res = await api.get(`/bookings/schedule?date=${date}`);
      setTakenSlots(prev => ({ ...prev, [date]: res.data.schedule || [] }));
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    }
  }, [takenSlots]);

  useEffect(() => {
    if (bookingType === 'reguler') {
      fetchSlots(formData.date);
    } else {
      sessions.forEach(s => fetchSlots(s.date));
    }
  }, [formData.date, sessions, bookingType]);

  // ── Paksa refresh schedule setelah tanggal berubah ────────────────────────
  const refreshSlots = async (date) => {
    if (!date) return;
    try {
      const res = await api.get(`/bookings/schedule?date=${date}`);
      setTakenSlots(prev => ({ ...prev, [date]: res.data.schedule || [] }));
    } catch (err) {
      console.error('Failed to refresh schedule:', err);
    }
  };

  // ── Cek apakah slot ini konflik dengan yang sudah terisi ──────────────────
  // Return: slot yang konflik, atau null jika aman
  const getConflictingSlot = (date, time, duration, courtName) => {
    const daySlots = takenSlots[date] || [];
    return daySlots.find(slot => {
      // Filter per lapangan — ini kunci utama bug lama
      if (slot.court_name !== courtName) return false;
      return slotsOverlap(time, duration, slot.start_time, parseInt(slot.duration));
    }) || null;
  };

  const handleSessionChange = (index, field, value) => {
    setSessions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Refresh slots saat tanggal berubah
    if (field === 'date') refreshSlots(value);
  };

  const totalPrice = bookingType === 'reguler'
    ? formData.court.price * formData.duration
    : formData.court.price * formData.duration * 4 * 0.75;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Validasi waktu di frontend sebelum kirim ke server
    if (bookingType === 'reguler') {
      if (formData.date < today) {
        setErrorModal({ show: true, message: `Tanggal ${formData.date} sudah terlewati.` });
        setLoading(false);
        return;
      }
      if (formData.date === today) {
        const selectedHour = parseInt(formData.time.split(':')[0]);
        if (selectedHour <= now.getHours()) {
          setErrorModal({ show: true, message: `Jam ${formData.time} untuk hari ini sudah terlewati.` });
          setLoading(false);
          return;
        }
      }
      // Cek konflik di frontend (early warning sebelum hit server)
      const conflict = getConflictingSlot(formData.date, formData.time, formData.duration, formData.court.name);
      if (conflict) {
        setErrorModal({ show: true, message: `Jadwal ${formData.date} pukul ${formData.time} WIB sudah terisi. Silakan pilih waktu lain.` });
        setLoading(false);
        return;
      }
    } else {
      for (const session of sessions) {
        if (session.date < today) {
          setErrorModal({ show: true, message: `Sesi tanggal ${session.date} sudah terlewati.` });
          setLoading(false);
          return;
        }
        if (session.date === today) {
          const selectedHour = parseInt(session.time.split(':')[0]);
          if (selectedHour <= now.getHours()) {
            setErrorModal({ show: true, message: `Sesi jam ${session.time} hari ini sudah terlewati.` });
            setLoading(false);
            return;
          }
        }
        const conflict = getConflictingSlot(session.date, session.time, formData.duration, formData.court.name);
        if (conflict) {
          setErrorModal({ show: true, message: `Jadwal sesi ${session.date} pukul ${session.time} WIB sudah terisi. Silakan ganti jadwal.` });
          setLoading(false);
          return;
        }
      }

      // Cek duplikat antar sesi
      const seen = new Set();
      for (const s of sessions) {
        const key = `${s.date}_${s.time}`;
        if (seen.has(key)) {
          setErrorModal({ show: true, message: `Terdapat jadwal duplikat: ${s.date} pukul ${s.time}. Setiap sesi harus berbeda.` });
          setLoading(false);
          return;
        }
        seen.add(key);
      }
    }

    try {
      const payload = {
        court_name: formData.court.name,
        duration: formData.duration,
        total_price: totalPrice,
        is_membership: bookingType === 'membership'
      };

      if (bookingType === 'reguler') {
        payload.booking_date = formData.date;
        payload.start_time = formData.time;
      } else {
        // Kirim time dalam format "HH:MM" yang konsisten
        payload.membership_sessions = sessions.map(s => ({
          date: s.date,
          time: normalizeTime(s.time)
        }));
      }

      const response = await api.post('/bookings', payload);
      navigate('/payment', { state: { booking: response.data.booking } });
    } catch (error) {
      console.error('Booking failed:', error);
      const message = error.response?.data?.message || 'Gagal membuat booking. Silakan coba lagi.';
      setErrorModal({ show: true, message });
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold font-display text-white mb-4">Form Booking Lapangan</h1>
          <p className="text-slate-400">Pilih tipe booking, lapangan, jadwal, dan durasi permainan Anda.</p>
        </div>

        {/* Booking Type Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex">
            <button
              type="button"
              onClick={() => setBookingType('reguler')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                bookingType === 'reguler' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sewa Reguler
            </button>
            <button
              type="button"
              onClick={() => setBookingType('membership')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                bookingType === 'membership' ? 'bg-gradient-to-r from-secondary to-yellow-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck size={18} /> Membership
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Court Selection */}
            <div className="glass p-6 rounded-2xl border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="text-primary" /> Pilih Lapangan
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {COURTS.map(court => (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, court })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.court.id === court.id
                        ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(31,90,46,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="font-semibold text-white mb-1">{court.name}</div>
                    <div className="text-xs text-slate-400 mb-2">{court.type}</div>
                    <div className="text-primary-light font-medium text-sm">
                      Rp {(court.price / 1000).toLocaleString()}k / jam
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="glass p-6 rounded-2xl border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="text-primary" /> Durasi per Sesi
              </h2>
              <div className="flex gap-4">
                {DURATIONS.map(hours => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setFormData({ ...formData, duration: hours })}
                    className={`flex-1 py-3 rounded-xl border font-medium transition-all ${
                      formData.duration === hours
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {hours} Jam
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time Selection */}
            <div className="glass p-6 rounded-2xl border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="text-primary" /> Jadwal Main
              </h2>

              {bookingType === 'reguler' ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Tanggal</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={(e) => {
                        e.target.setCustomValidity('');
                        const newDate = e.target.value;
                        setFormData({ ...formData, date: newDate });
                        refreshSlots(newDate);
                      }}
                      onInvalid={(e) => e.target.setCustomValidity('Pilih tanggal hari ini atau yang akan datang.')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Waktu Mulai</label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all ${
                        getConflictingSlot(formData.date, formData.time, formData.duration, formData.court.name)
                          ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                          : 'border-white/10 focus:border-primary'
                      }`}
                    />
                    {(() => {
                      const conflict = getConflictingSlot(formData.date, formData.time, formData.duration, formData.court.name);
                      return conflict ? (
                        <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                          <XCircle size={12} />
                          {conflict.status === 'closed' ? 'Lapangan ditutup / Maintenance' : 'Jadwal sudah terisi'}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-secondary mb-4">* Pilih 4 tanggal berbeda untuk paket membership bulanan Anda.</p>
                  {sessions.map((session, index) => {
                    const conflict = getConflictingSlot(session.date, session.time, formData.duration, formData.court.name);
                    return (
                      <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 border border-white/10 rounded-xl bg-white/5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div className="grid grid-cols-2 gap-4 flex-1">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Tanggal</label>
                            <input
                              type="date"
                              required
                              min={new Date().toISOString().split('T')[0]}
                              value={session.date}
                              onChange={(e) => {
                                e.target.setCustomValidity('');
                                handleSessionChange(index, 'date', e.target.value);
                              }}
                              onInvalid={(e) => e.target.setCustomValidity('Pilih tanggal yang akan datang.')}
                              className="w-full bg-transparent border-b border-white/20 px-2 py-1 text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Waktu</label>
                            <input
                              type="time"
                              required
                              value={session.time}
                              onChange={(e) => handleSessionChange(index, 'time', e.target.value)}
                              className={`w-full bg-transparent border-b px-2 py-1 text-white focus:outline-none transition-all ${
                                conflict ? 'border-red-500' : 'border-white/20 focus:border-primary'
                              }`}
                            />
                            {conflict && (
                              <p className="text-[9px] text-red-500 mt-1 font-bold uppercase">
                                {conflict.status === 'closed' ? 'CLOSED' : 'TERISI'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-1">
            <div className="glass p-6 rounded-2xl border border-white/10 sticky top-28">
              <h2 className="text-xl font-semibold text-white mb-6">Ringkasan</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tipe Paket</span>
                  <span className="text-white font-medium uppercase tracking-wider text-xs bg-white/10 px-2 py-1 rounded">
                    {bookingType}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Lapangan</span>
                  <span className="text-white font-medium">{formData.court.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Durasi (per sesi)</span>
                  <span className="text-white font-medium">{formData.duration} Jam</span>
                </div>

                {bookingType === 'reguler' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Tanggal</span>
                      <span className="text-white font-medium">{formData.date}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Waktu</span>
                      <span className="text-white font-medium">{formData.time} WIB</span>
                    </div>
                  </>
                ) : (
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <span className="text-slate-400 text-sm mb-2 block">4 Sesi Main:</span>
                    <ul className="text-sm text-white space-y-1 pl-4 list-disc marker:text-primary">
                      {sessions.map((s, i) => (
                        <li key={i}>{s.date || '...'} <span className="text-slate-400 ml-1">@ {s.time} WIB</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {bookingType === 'membership' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-6 text-sm">
                  <span className="text-green-400 font-semibold">Selamat!</span> Anda mendapatkan diskon 25% dari harga reguler.
                </div>
              )}

              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Total Harga</span>
                  <span className="text-2xl font-bold text-primary-light">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 text-white font-bold rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  bookingType === 'membership'
                    ? 'bg-gradient-to-r from-secondary to-yellow-500 hover:shadow-secondary/30'
                    : 'bg-gradient-to-r from-primary to-accent hover:shadow-primary/30'
                }`}
              >
                {loading ? 'Memproses...' : 'Lanjut Pembayaran'}
                <CheckCircle2 size={20} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setErrorModal({ ...errorModal, show: false })}
          />
          <div className="relative bg-[#151C21] w-full max-w-md rounded-[2rem] border border-white/10 p-8 shadow-2xl animate-scale-in overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5 border border-primary/20 shadow-[0_0_30px_rgba(34,197,94,0.08)]">
                <CalendarDays size={32} />
              </div>
              <h2 className="text-xl font-bold font-display text-white mb-3">Jadwal Tidak Tersedia</h2>
              <div className="bg-white/[0.03] rounded-xl p-4 mb-6 border border-white/5">
                <p className="text-slate-400 leading-relaxed text-sm">{errorModal.message}</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setErrorModal({ ...errorModal, show: false });
                    navigate('/#schedule');
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Search size={16} /> Cari Waktu Lain
                </button>
                <button
                  onClick={() => setErrorModal({ ...errorModal, show: false })}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-300 font-medium text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
