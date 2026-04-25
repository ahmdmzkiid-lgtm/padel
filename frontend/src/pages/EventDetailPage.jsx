import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowLeft, Share2, Clock } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherEvents, setOtherEvents] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchEvent = async () => {
      try {
        const [eventRes, allRes] = await Promise.all([
          axios.get(`${API_URL}/api/events/${id}`),
          axios.get(`${API_URL}/api/events`),
        ]);
        setEvent(eventRes.data.event);
        // Get other events (exclude current)
        setOtherEvents((allRes.data.events || []).filter(e => e.id !== parseInt(id)).slice(0, 3));
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('Event tidak ditemukan.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const gradients = [
    'from-blue-600 via-blue-500 to-cyan-400',
    'from-purple-600 via-violet-500 to-fuchsia-400',
    'from-emerald-600 via-green-500 to-teal-400',
    'from-orange-600 via-amber-500 to-yellow-400',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Memuat event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar size={32} className="text-slate-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 font-display">Event Tidak Ditemukan</h2>
          <p className="text-slate-400 mb-8">Maaf, event yang Anda cari tidak tersedia.</p>
          <button
            onClick={() => navigate('/#events')}
            className="px-8 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-primary/30 transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Hero Banner */}
      <div className="relative pt-28 pb-12 px-4 sm:px-8 min-h-[50vh] sm:min-h-[60vh] flex flex-col justify-between overflow-hidden">
        {event.image ? (
          <img
            src={`${API_URL}${event.image}`}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-dark" />
        )}
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark/60 to-transparent" />

        {/* Navigation */}
        <div className="relative z-10 max-w-5xl mx-auto w-full mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/#events')}
              className="flex items-center gap-2 px-4 py-2.5 bg-black/40 backdrop-blur-md text-white rounded-xl border border-white/10 hover:bg-white/10 transition-all text-sm font-medium group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Kembali
            </button>
          </div>
        </div>

        {/* Title Overlay */}
        <div className="relative z-10 max-w-5xl mx-auto w-full mt-auto">
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              {event.date && (
                <div className="flex items-center gap-2 text-sm text-slate-200 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                  <Calendar size={14} className="text-amber-400" />
                  {formatDate(event.date)}
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-slate-200 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                  <MapPin size={14} className="text-primary-light" />
                  {event.location}
                </div>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white font-display leading-tight drop-shadow-lg">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="relative">
        {/* Subtle glow behind content */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Description */}
              {event.description && (
                <div className="mb-8">
                  <p className="text-lg sm:text-xl text-slate-300 leading-relaxed border-l-4 border-primary/40 pl-6 italic">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8" />

              {/* Content / Article Body */}
              {event.content && (
                <div className="prose prose-lg prose-invert max-w-none">
                  <div className="text-slate-300 leading-relaxed whitespace-pre-line text-base sm:text-lg">
                    {event.content}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Event Info Card */}
              <div className="glass rounded-3xl p-6 border border-white/10 mb-6 sticky top-8">
                <h3 className="text-lg font-bold text-white mb-4 font-display">Info Event</h3>
                <div className="space-y-4">
                  {event.date && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0">
                        <Calendar size={18} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Tanggal</p>
                        <p className="text-sm text-white font-medium">{formatDate(event.date)}</p>
                      </div>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin size={18} className="text-primary-light" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Lokasi</p>
                        <p className="text-sm text-white font-medium">{event.location}</p>
                      </div>
                    </div>
                  )}
                  {event.created_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        <Clock size={18} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Dipublikasikan</p>
                        <p className="text-sm text-white font-medium">
                          {new Date(event.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <Link
                    to="/booking"
                    className="block w-full py-3.5 bg-gradient-to-r from-primary to-accent text-white text-center font-bold rounded-2xl hover:shadow-lg hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Booking Lapangan
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Other Events Section */}
          {otherEvents.length > 0 && (
            <div className="mt-16 pt-12 border-t border-white/10">
              <h2 className="text-2xl font-bold text-white font-display mb-8">Event Lainnya</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherEvents.map((ev, i) => {
                  const grad = gradients[i % gradients.length];
                  return (
                    <Link
                      key={ev.id}
                      to={`/events/${ev.id}`}
                      className="group relative rounded-2xl overflow-hidden h-[260px] block"
                    >
                      {ev.image ? (
                        <img
                          src={`${API_URL}${ev.image}`}
                          alt={ev.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-80`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-primary/10 transition-opacity duration-500" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        {ev.date && (
                          <span className="text-[10px] text-slate-300 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Calendar size={10} />
                            {new Date(ev.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        <h3 className="text-white font-bold text-lg group-hover:text-primary-light transition-colors line-clamp-2">
                          {ev.title}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
