import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import socket from '../utils/socket';
import { useModal } from '../context/ModalContext';
import { Calendar, Clock, MapPin, Ticket, X, Download, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as htmlToImage from 'html-to-image';

const MyBookingsPage = () => {
  const { user } = useAuth();
  const { showAlert } = useModal();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const ticketRef = useRef(null);

  const safeDateString = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID');
  };

  const safeDateTimeString = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatBookingTime = (startTime, duration) => {
    if (!startTime) return '--:--';
    const start = startTime.slice(0, 5);
    const hour = parseInt(start.split(':')[0]);
    const minute = start.split(':')[1];
    const endHour = (hour + duration) % 24;
    const end = `${endHour.toString().padStart(2, '0')}:${minute}`;
    return `${start} - ${end}`;
  };

  const handleDownloadTicket = async (e) => {
    e.stopPropagation();
    if (!ticketRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(ticketRef.current, { 
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff' // Force white background so it doesn't become transparent
      });
      const link = document.createElement('a');
      link.download = `PadelZone-Ticket-${selectedTicket.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download ticket:', err);
      showAlert('Gagal mengunduh tiket. Coba lagi.', 'error');
    }
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get('/bookings/my-bookings');
        setBookings(response.data.bookings);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBookings();
      
      // Real-time updates
      socket.emit('join', `user_${user.id}`);
      
      socket.on('booking_updated', (data) => {
        fetchBookings();
      });

      return () => {
        socket.off('booking_updated');
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark pt-32 pb-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold font-display text-white mb-2">Riwayat Booking</h1>
          <p className="text-slate-400">Daftar pemesanan lapangan padel Anda.</p>
        </div>

        {bookings.length === 0 ? (
          <div className="glass p-12 text-center rounded-3xl border border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Belum Ada Booking</h3>
            <p className="text-slate-400 mb-6">Anda belum memiliki riwayat pemesanan lapangan.</p>
            <a href="/booking" className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-light transition-colors">
              Booking Sekarang
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="glass p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-white">{booking.court_name}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        booking.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {booking.status === 'confirmed' ? 'LUNAS' : 
                         booking.status === 'rejected' ? 'DITOLAK' : 'PENDING'}
                      </span>
                      {booking.is_membership && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                          MEMBERSHIP
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Rejection Reason */}
                  {booking.status === 'rejected' && booking.rejection_reason && (
                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-2">
                      <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Alasan Penolakan</div>
                        <p className="text-sm text-red-300/80 leading-relaxed">{booking.rejection_reason}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:flex gap-4 md:gap-8 text-sm text-slate-300">
                    {booking.is_membership ? (
                      <div className="flex items-start gap-2">
                        <Calendar size={16} className="text-primary mt-0.5" />
                        <div>
                          <span className="font-medium text-white block mb-1">Paket 4 Sesi:</span>
                          <div className="space-y-1.5 mt-2">
                            {booking.membership_sessions && booking.membership_sessions.map((s, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px] bg-white/5 px-2 py-1 rounded-md border border-white/5 w-fit">
                                <span className="text-primary font-bold">{idx + 1}</span>
                                <span className="text-slate-200">{new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                <span className="text-slate-400 font-mono">({formatBookingTime(s.time, booking.duration)})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-primary" />
                          {safeDateString(booking.booking_date)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-primary" />
                          {formatBookingTime(booking.start_time, booking.duration)} WIB
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Total Harga</div>
                    <div className="text-2xl font-bold text-white">
                      Rp {Number(booking.total_price).toLocaleString('id-ID')}
                    </div>
                  </div>
                  
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => setSelectedTicket(booking)}
                      className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-lg hover:shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2 transition-all"
                    >
                      <Ticket size={16} />
                      Lihat Tiket
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 sm:p-4 cursor-pointer" onClick={() => setSelectedTicket(null)}>
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm" />
          
          {/* Aesthetic Side Texts */}
          <div 
            className="absolute left-2 sm:left-6 lg:left-16 top-1/2 -translate-y-1/2 text-white/60 tracking-[0.3em] sm:tracking-[0.5em] text-[10px] sm:text-xs font-bold uppercase pointer-events-none z-10"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Klik untuk menutup
          </div>
          <div 
            className="absolute right-2 sm:right-6 lg:right-16 top-1/2 -translate-y-1/2 text-white/60 tracking-[0.3em] sm:tracking-[0.5em] text-[10px] sm:text-xs font-bold uppercase pointer-events-none z-10"
            style={{ writingMode: 'vertical-rl' }}
          >
            Klik untuk menutup
          </div>
          
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center pb-8 pt-4">
            <div 
              ref={ticketRef}
              className="relative w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in cursor-default shrink-0"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the ticket
            >
              {/* Ticket Header */}
              <div className="bg-gradient-to-r from-primary to-accent p-5 text-center relative">
                <h3 className="text-xl font-bold text-white font-display mb-1">E-Ticket</h3>
                <p className="text-white/80 text-xs">PadelZone Premium Court</p>
              </div>

              {/* Ticket Body */}
              <div className="p-5">
                <div className="space-y-4 mb-5">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Nama Pemesan</div>
                  <div className="font-bold text-dark text-lg">{user.name}</div>
                </div>
                
                {selectedTicket.is_membership ? (
                  <div className="border border-white/10 rounded-xl p-3 bg-slate-50 mb-4">
                    <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2">Jadwal 4 Sesi</div>
                    <div className="space-y-2">
                      {selectedTicket.membership_sessions && selectedTicket.membership_sessions.map((s, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200 last:border-0 pb-1 last:pb-0">
                          <span className="font-bold text-dark">{safeDateString(s.date)}</span>
                          <span className="font-bold text-primary">{s.time} WIB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Tanggal Main</div>
                      <div className="font-bold text-dark">{safeDateString(selectedTicket.booking_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Jam Main</div>
                      <div className="font-bold text-dark">{formatBookingTime(selectedTicket.start_time, selectedTicket.duration)} WIB</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Lapangan</div>
                    <div className="font-bold text-dark">{selectedTicket.court_name.split(' - ')[0]}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Durasi per Sesi</div>
                    <div className="font-bold text-dark">{selectedTicket.duration} Jam</div>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-4 mt-4">
                  <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Waktu Pembayaran</div>
                  <div className="font-medium text-dark text-sm">
                    {safeDateTimeString(selectedTicket.paid_at)} WIB
                  </div>
                </div>
              </div>

              {/* QR Code Area */}
              <div className="flex flex-col items-center justify-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <QRCodeSVG 
                  value={`PZ-${selectedTicket?.id}-${selectedTicket?.created_at ? new Date(selectedTicket.created_at).getTime().toString().slice(-6) : '000000'}`} 
                  size={160}
                  level="H"
                  includeMargin={true}
                />
                <div className="mt-4 font-mono font-bold text-slate-800 text-sm tracking-widest bg-slate-100 px-4 py-1.5 rounded-lg">
                  PZ-{selectedTicket?.id}-{selectedTicket?.created_at ? new Date(selectedTicket.created_at).getTime().toString().slice(-6) : '000000'}
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-[10px] text-slate-400">
                  Tunjukkan barcode ini kepada petugas lapangan sebelum bermain.
                </p>
              </div>
            </div>
            
            {/* Cutout details for ticket look */}
            <div className="absolute left-[-15px] top-[80px] w-8 h-8 bg-dark/80 backdrop-blur-sm rounded-full" />
            <div className="absolute right-[-15px] top-[80px] w-8 h-8 bg-dark/80 backdrop-blur-sm rounded-full" />
          </div>

          {/* Download Button */}
          <button 
            onClick={handleDownloadTicket}
            className="mt-6 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all z-10 w-full max-w-xs shrink-0 animate-scale-in"
          >
            <Download size={20} />
            Simpan E-Ticket
          </button>
        </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
