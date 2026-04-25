import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';
import socket from '../utils/socket';

const PublicSchedule = () => {
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bookings/schedule?date=${scheduleDate}`);
      setSchedule(response.data.schedule);
    } catch (error) {
      console.error('Failed to fetch public schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();

    // Real-time schedule updates
    socket.on('schedule_updated', () => {
      fetchSchedule();
    });

    return () => {
      socket.off('schedule_updated');
    };
  }, [scheduleDate]);

  const memoizedSchedule = useMemo(() => {
    const grid = {};
    schedule.forEach(b => {
      const startHour = parseInt(b.start_time.split(':')[0]);
      for (let h = startHour; h < startHour + b.duration; h++) {
        grid[`${b.court_name}-${h}`] = 'booked';
      }
    });
    return grid;
  }, [schedule]);

  return (
    <section id="schedule" className="py-24 relative bg-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <span className="inline-block px-4 py-1.5 rounded-full glass text-primary text-sm font-medium mb-4 uppercase tracking-widest">
          Live Availability
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold font-display text-white mb-6">
          Jadwal <span className="gradient-text">Lapangan</span>
        </h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Cek ketersediaan lapangan secara real-time sebelum Anda melakukan pemesanan.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-[#151C21] rounded-[32px] border border-white/5 p-6 md:p-10 shadow-2xl overflow-hidden relative">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-10 pb-10 border-b border-white/5">
            <div 
              className="relative group/datepicker w-full md:w-auto"
              onClick={() => inputRef.current?.showPicker?.()}
            >
              <div className="flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl hover:border-primary/50 transition-all cursor-pointer pointer-events-none">
                <Calendar size={22} className="text-primary" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Pilih Tanggal</span>
                  <span className="text-lg font-bold text-white">
                    {new Date(scheduleDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <ChevronDown size={20} className="text-slate-500 ml-4 group-hover/datepicker:text-primary transition-colors" />
              </div>
              <input 
                ref={inputRef}
                type="date" 
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[20]"
              />
            </div>

            <div className="flex items-center gap-8 text-sm font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white/5 border border-white/10" />
                <span className="text-slate-500">Kosong</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
                <span className="text-red-400">Terisi</span>
              </div>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="overflow-x-auto -mx-6 md:-mx-10 px-6 md:px-10">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[100px_repeat(3,1fr)] gap-4 mb-6">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Jam</div>
                {['Court A - Elite', 'Court B - Premium', 'Court C - Standard'].map(c => (
                  <div key={c} className="text-xs font-bold text-white uppercase tracking-widest text-center py-2 bg-white/5 rounded-xl border border-white/5">
                    {c.split(' - ')[0]}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {Array.from({ length: 18 }, (_, i) => {
                  const hour = i + 6;
                  const displayTime = `${hour.toString().padStart(2, '0')}:00`;
                  
                  // Check if this time has passed today
                  const now = new Date();
                  const isToday = scheduleDate === now.toLocaleDateString('en-CA');
                  const currentHour = now.getHours();
                  const isPast = isToday && hour <= currentHour;
                  
                  return (
                    <div key={hour} className="grid grid-cols-[100px_repeat(3,1fr)] gap-4 items-center group">
                      <div className={`text-sm font-mono font-bold text-center py-3 border-r border-white/5 ${isPast ? 'text-slate-700' : 'text-slate-500'}`}>
                        {displayTime}
                      </div>
                      {['Court A - Elite', 'Court B - Premium', 'Court C - Standard'].map(court => {
                        const isBooked = memoizedSchedule[`${court}-${hour}`];
                        const isUnavailable = isBooked || isPast;
                        
                        return (
                          <div 
                            key={court} 
                            className={`h-12 rounded-xl border transition-all duration-300 ${
                              isUnavailable 
                                ? 'bg-red-500/10 border-red-500/20 shadow-inner' 
                                : 'bg-white/5 border-white/10 hover:border-primary/30 group-hover:bg-white/[0.07]'
                            }`}
                          >
                            {isUnavailable && (
                              <div className="w-full h-full flex items-center justify-center">
                                <XCircle size={16} className="text-red-500/30" />
                              </div>
                            )}
                            {!isUnavailable && (
                              <div className="w-full h-full flex items-center justify-center transition-opacity">
                                <CheckCircle size={16} className="text-primary/60" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 bg-dark/50 backdrop-blur-[2px] flex items-center justify-center z-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PublicSchedule;
