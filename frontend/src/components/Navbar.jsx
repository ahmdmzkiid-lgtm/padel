import { useState, useEffect, useRef } from 'react';
import { Menu, X, MapPin, Phone, User, LogOut, Bell, Megaphone, Calendar, ChevronDown, Image, Info } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoIcon from './LogoIcon';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tentangOpen, setTentangOpen] = useState(false);
  const tentangRef = useRef(null);
  const tentangTimeout = useRef(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    socket.on('new_promotion', (promo) => {
      setNotifications(prev => [promo, ...prev]);
      setUnreadCount(prev => prev + 1);
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
      } catch (e) {}
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      socket.off('new_promotion');
    };
  }, []);

  // Close dropdown when clicking outside (Desktop only)
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Hanya jalankan logika ini jika layar sedang di mode desktop (lg)
      if (window.innerWidth >= 1024) {
        if (tentangRef.current && !tentangRef.current.contains(e.target)) {
          setTentangOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Beranda', href: '#hero' },
    { name: 'Fasilitas', href: '#facilities' },
    { name: 'Lapangan', href: '#courts' },
    { name: 'Jadwal', href: '#schedule' },
    { name: 'Membership', href: '#pricing' },
    { name: 'Event', href: '#events' },
  ];

  const tentangSubLinks = [
    { name: 'Tentang Kami', href: '#about', icon: Info },
    { name: 'Galeri', href: '#gallery', icon: Image },
  ];

  const handleTentangEnter = () => {
    clearTimeout(tentangTimeout.current);
    setTentangOpen(true);
  };

  const handleTentangLeave = () => {
    tentangTimeout.current = setTimeout(() => setTentangOpen(false), 200);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass shadow-2xl shadow-black/20 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <LogoIcon className="w-10 h-10 transform group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <div>
              <span className="text-xl font-bold font-display text-white tracking-tight">
                Padel<span className="text-primary-light">Zone</span>
              </span>
              <p className="text-[10px] text-slate-400 -mt-1 tracking-widest uppercase">Premium Court</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            <Link
              to={isHome ? '#hero' : '/#hero'}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300 relative group"
            >
              Beranda
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-3/4 transition-all duration-300 rounded-full" />
            </Link>

            {/* Tentang Dropdown */}
            <div
              ref={tentangRef}
              className="relative"
              onMouseEnter={handleTentangEnter}
              onMouseLeave={handleTentangLeave}
            >
              <button
                className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300 relative group flex items-center gap-1"
              >
                Tentang
                <ChevronDown size={14} className={`transition-transform duration-300 ${tentangOpen ? 'rotate-180' : ''}`} />
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-3/4 transition-all duration-300 rounded-full" />
              </button>

              <div className={`absolute top-full left-0 mt-2 w-52 transition-all duration-300 ${
                tentangOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}>
                <div className="glass rounded-2xl border border-white/10 p-2 shadow-2xl shadow-black/40">
                  {tentangSubLinks.map((sub) => (
                    <Link
                      key={sub.name}
                      to={isHome ? sub.href : `/${sub.href}`}
                      onClick={() => setTentangOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                    >
                      <sub.icon size={16} className="text-primary" />
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {navLinks.slice(1).map((link) => (
              <Link
                key={link.name}
                to={isHome ? link.href : `/${link.href}`}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300 relative group"
              >
                {link.name}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-3/4 transition-all duration-300 rounded-full" />
              </Link>
            ))}
          </div>

          {/* Desktop Nav - Right Section */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Notification Bell */}
            <button 
              onClick={() => {
                setShowPromoModal(true);
                setUnreadCount(0);
              }}
              className="relative p-2 text-slate-300 hover:text-primary transition-all bg-white/5 rounded-xl border border-white/10 hover:border-primary/30 group"
            >
              <Bell size={20} className={unreadCount > 0 ? 'animate-bounce-subtle' : ''} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-dark animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                {user.is_admin && (
                  <Link to="/admin" className="text-sm font-bold text-primary hover:text-primary-light transition-colors mr-2">
                    Panel Admin
                  </Link>
                )}
                <Link to="/my-bookings" className="text-sm font-medium text-slate-300 hover:text-white transition-colors mr-2">
                  Riwayat Booking
                </Link>
                <div className="flex items-center gap-2 text-white bg-white/5 py-1 px-3 rounded-full border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <User size={14} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium">{user.name.split(' ')[0]}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-300"
              >
                Masuk / Daftar
              </Link>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 lg:hidden">
            <button 
              onClick={() => {
                setShowPromoModal(true);
                setUnreadCount(0);
              }}
              className="relative p-2 text-slate-300 bg-white/5 rounded-xl border border-white/10"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-dark">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Promotion Notification Modal */}
        {showPromoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowPromoModal(false)} />
            <div className="relative w-full max-w-lg glass-card p-0 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-8 border-b border-white/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Megaphone size={24} />
                  </div>
                  <button onClick={() => setShowPromoModal(false)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl">
                    <X size={20} />
                  </button>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1 font-display">Promo & Pengumuman</h3>
                <p className="text-sm text-slate-400">Jangan lewatkan diskon menarik dari PadelZone!</p>
              </div>

              <div className="p-8 max-h-[400px] overflow-y-auto custom-scrollbar space-y-6">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                      <Bell size={32} className="text-slate-500" />
                    </div>
                    <p className="text-slate-500 font-medium">Belum ada promo baru saat ini.</p>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:border-primary/20 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-white group-hover:text-primary transition-colors">{n.title}</h4>
                        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded-md flex items-center gap-1 uppercase font-bold tracking-tighter">
                          <Calendar size={10} />
                          {new Date(n.created_at || Date.now()).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-8 pt-0">
                <button 
                  onClick={() => setShowPromoModal(false)}
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/20"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        <div
          className={`lg:hidden transition-all duration-500 overflow-hidden ${
            isOpen ? 'max-h-[800px] overflow-y-auto custom-scrollbar opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-[#151C21]/95 backdrop-blur-xl rounded-2xl p-4 space-y-1 border border-white/10 shadow-2xl shadow-black/50">
            <Link
              to={isHome ? '#hero' : '/#hero'}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
            >
              Beranda
            </Link>

            {/* Mobile Tentang Accordion */}
            <div>
              <button
                onClick={() => setTentangOpen(!tentangOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
              >
                Tentang
                <ChevronDown size={16} className={`transition-transform duration-300 ${tentangOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${tentangOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                {tentangSubLinks.map((sub) => (
                  <Link
                    key={sub.name}
                    to={isHome ? sub.href : `/${sub.href}`}
                    onClick={() => { setIsOpen(false); setTentangOpen(false); }}
                    className="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                  >
                    <sub.icon size={14} className="text-primary" />
                    {sub.name}
                  </Link>
                ))}
              </div>
            </div>

            {navLinks.slice(1).map((link) => (
              <Link
                key={link.name}
                to={isHome ? link.href : `/${link.href}`}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-white/10">
              {user ? (
                <div className="space-y-2">
                  <div className="px-4 py-3 flex items-center gap-3 text-white">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                  </div>
                  {user.is_admin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-3 text-primary hover:bg-white/5 rounded-xl transition-all duration-300 font-bold"
                    >
                      Panel Admin
                    </Link>
                  )}
                  <Link
                    to="/my-bookings"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 font-medium"
                  >
                    Riwayat Booking
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 text-red-400 font-semibold rounded-xl hover:bg-red-500/20"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block text-center px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl"
                >
                  Masuk / Daftar
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
