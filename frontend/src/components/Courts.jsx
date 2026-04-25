import { useState, useEffect, useMemo } from 'react';
import { MapPin, Star, Users as UsersIcon, Calendar } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import socket from '../utils/socket';

const Courts = () => {
  const [ref, isVisible] = useScrollAnimation();
  const { user, showAlert } = useAuth();
  const navigate = useNavigate();

  const handleBooking = (e, court) => {
    e.preventDefault();
    if (court.status !== 'available') return;
    if (!user) {
      showAlert('Silakan login atau mendaftar terlebih dahulu untuk melakukan booking lapangan.');
    } else {
      navigate('/booking');
    }
  };

  const [courtList, setCourtList] = useState([
    {
      name: 'Court A - Elite',
      type: 'Indoor',
      surface: 'Artificial Grass',
      capacity: '4 Pemain',
      features: ['Full AC', 'LED Pro Lighting', 'Kaca Tempered 12mm'],
      status: 'available',
      image: '/lapangan-padel1.png',
    },
    {
      name: 'Court B - Premium',
      type: 'Indoor',
      surface: 'Artificial Grass',
      capacity: '4 Pemain',
      features: ['Full AC', 'LED Pro Lighting', 'Kaca Tempered 12mm'],
      status: 'available',
      image: '/lapangan-padel2.webp',
    },
    {
      name: 'Court C - Standard',
      type: 'Semi-Outdoor',
      surface: 'Artificial Grass',
      capacity: '4 Pemain',
      features: ['Covered Roof', 'LED Lighting', 'Kaca Tempered 10mm'],
      status: 'available',
      image: '/lapangan-padel3.png',
    },
  ]);

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await api.get(`/bookings/schedule?date=${today}`);
        const schedule = response.data.schedule || [];

        const now = new Date();
        const currentHour = now.getHours();

        setCourtList(prev => prev.map(court => {
          const bookedHours = new Set();
          schedule.filter(b => b.court_name === court.name).forEach(b => {
            const startHour = parseInt(b.start_time.split(':')[0]);
            for (let h = startHour; h < startHour + b.duration; h++) {
              if (h >= currentHour) bookedHours.add(h);
            }
          });

          // Possible slots from now until 23:00
          const totalPossibleSlots = 24 - currentHour;
          const isFull = totalPossibleSlots > 0 && bookedHours.size >= totalPossibleSlots;

          return {
            ...court,
            status: isFull ? 'booked' : 'available'
          };
        }));
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      }
    };

    checkAvailability();

    // Real-time updates
    socket.on('schedule_updated', checkAvailability);
    return () => socket.off('schedule_updated', checkAvailability);
  }, []);

  return (
    <section id="courts" className="py-24 relative overflow-hidden">
      <div ref={ref} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-accent text-sm font-medium mb-4">
            Lapangan Kami
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold font-display text-white mb-6">
            Pilih Lapangan
            <br />
            <span className="gradient-text">Sesuai Kebutuhan</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Tersedia berbagai tipe lapangan dengan fasilitas berbeda untuk memenuhi kebutuhan permainan Anda.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courtList.map((court, index) => (
            <div
              key={index}
              className={`group rounded-3xl overflow-hidden glass hover:bg-white/5 transition-all duration-500 hover:-translate-y-3 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${(index + 2) * 200}ms` }}
            >
              {/* Court Preview */}
              <div className="relative h-48 overflow-hidden bg-slate-900">
                <img src={court.image} alt={court.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                
                {/* Status badge */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border backdrop-blur-md shadow-lg z-10">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    court.status === 'booked' ? 'bg-red-400 animate-pulse' : 'bg-green-400 animate-pulse'
                  }`} />
                  <span className={`${
                    court.status === 'booked' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {court.status === 'booked' ? 'Full Booked (Hari Ini)' : 'Available Now'}
                  </span>
                </div>
              </div>

              {/* Court Info */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{court.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {court.type}
                    </span>
                    <span>•</span>
                    <span>{court.surface}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {court.features.map((feature, fIndex) => (
                    <span key={fIndex} className="px-3 py-1 rounded-lg bg-white/5 text-slate-300 text-xs">
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Capacity */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <UsersIcon size={14} />
                    <span>{court.capacity}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={12} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>

                {/* Book Button */}
                <button 
                  onClick={(e) => handleBooking(e, court)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  court.status === 'available'
                    ? 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed opacity-50'
                }`}>
                  {court.status === 'available' ? 'Booking Sekarang' : 'Full Booked'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Informative Note for Future Bookings */}
        <div className="mt-16 max-w-5xl mx-auto animate-slide-up delay-400">
          <div className="glass p-8 rounded-[2rem] border border-white/10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-primary/20" />
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <Calendar className="text-white" size={32} />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-white mb-2 font-display">Ingin Main di Hari Lain?</h4>
              <p className="text-slate-300 text-base leading-relaxed">
                Jangan khawatir jika slot hari ini sudah penuh! Anda masih bisa merencanakan pertandingan untuk esok hari atau tanggal lainnya. Silakan cek tabel <span className="text-primary font-bold underline decoration-primary/30 underline-offset-4">Jadwal Lengkap</span> di bawah ini dan amankan slot favorit Anda sebelum kehabisan.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Courts;
