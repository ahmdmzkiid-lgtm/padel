import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { ArrowRight, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CTA = () => {
  const [ref, isVisible] = useScrollAnimation();
  const { user, showAlert } = useAuth();
  const navigate = useNavigate();

  const handleBooking = (e) => {
    e.preventDefault();
    if (!user) {
      showAlert('Silakan login atau mendaftar terlebih dahulu untuk melakukan booking lapangan.');
    } else {
      navigate('/booking');
    }
  };

  return (
    <section id="booking" className="py-24 relative overflow-hidden">
      <div ref={ref} className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative rounded-3xl overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          {/* Decorative orbs */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-2xl" />

          <div className="relative p-10 sm:p-16 text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur text-white/90 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Slot tersedia hari ini
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-bold font-display text-white leading-tight">
              Siap Untuk Bermain?
              <br />
              <span className="text-white/80">Booking Sekarang!</span>
            </h2>
            
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Jangan lewatkan kesempatan bermain di lapangan padel terbaik. 
              Booking mudah dan cepat, langsung main!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="#booking" onClick={handleBooking} className="px-8 py-4 bg-white text-primary font-bold rounded-2xl hover:shadow-2xl hover:shadow-white/20 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2">
                Booking Lapangan
                <ArrowRight size={18} />
              </a>
              <a href="https://wa.me/6285183147625" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white/10 backdrop-blur text-white font-bold rounded-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2 border border-white/20">
                <Phone size={18} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
