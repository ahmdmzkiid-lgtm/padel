import { useState, useEffect } from 'react';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Events = () => {
  const [ref, isVisible] = useScrollAnimation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/events`);
        setEvents(response.data.events || []);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (!loading && events.length === 0) return null;

  const gradients = [
    'from-blue-600 via-blue-500 to-cyan-400',
    'from-purple-600 via-violet-500 to-fuchsia-400',
    'from-emerald-600 via-green-500 to-teal-400',
    'from-orange-600 via-amber-500 to-yellow-400',
    'from-rose-600 via-pink-500 to-red-400',
    'from-indigo-600 via-blue-500 to-sky-400',
  ];

  // Determine grid spans for visual variety (like Gallery)
  const getSpan = (index, total) => {
    if (total === 1) return 'md:col-span-4 md:row-span-2';
    if (total === 2) return 'md:col-span-2 md:row-span-2';
    // For 3+ events, make the first one large
    if (index === 0) return 'md:col-span-2 md:row-span-2';
    return '';
  };

  return (
    <section id="events" className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-amber-400 text-sm font-medium mb-4">
            <Calendar size={14} className="inline mr-1.5 -mt-0.5" />
            Event
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold font-display text-white mb-6">
            Event <span className="gradient-text">PadelZone</span>
          </h2>
          <p className="text-lg text-slate-400">Ikuti berbagai event seru dan turnamen yang kami selenggarakan.</p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {events.map((event, i) => {
            const grad = gradients[i % gradients.length];
            const span = getSpan(i, events.length);

            return (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className={`group relative rounded-2xl overflow-hidden cursor-pointer ${span} ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                } transition-all duration-700`}
                style={{ transitionDelay: `${(i + 2) * 100}ms` }}
              >
                {/* Image or gradient background */}
                {event.image ? (
                  <img
                    src={`${API_URL}${event.image}`}
                    alt={event.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-80 group-hover:opacity-100 transition-opacity duration-500`} />
                )}

                {/* Hover glow overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-primary/5 transition-opacity duration-500" />

                {/* Dark gradient from bottom only - keeps photo vivid */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Date badge */}
                {event.date && (
                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Calendar size={10} className="text-amber-400" />
                    {formatDate(event.date)}
                  </div>
                )}

                {/* Content overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  {event.location && (
                    <span className="flex items-center gap-1 text-[10px] text-white/70 uppercase tracking-widest mb-1 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <MapPin size={10} />
                      {event.location}
                    </span>
                  )}
                  <h3 className="text-white font-bold text-lg leading-tight translate-y-4 group-hover:translate-y-0 transition-transform duration-300 line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-75">
                    {event.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-primary-light text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-150">
                    Baca Selengkapnya
                    <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
};

export default Events;
