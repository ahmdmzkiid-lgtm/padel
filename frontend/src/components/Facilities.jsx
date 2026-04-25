import { Wifi, Wind, ShowerHead, Car, Coffee, Dumbbell, ShieldCheck, Shirt } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const Facilities = () => {
  const [ref, isVisible] = useScrollAnimation();

  const facilities = [
    { icon: <Wind className="w-6 h-6" />, name: 'Full AC', desc: 'Suhu terkontrol' },
    { icon: <ShowerHead className="w-6 h-6" />, name: 'Shower Room', desc: 'Air panas & dingin' },
    { icon: <Car className="w-6 h-6" />, name: 'Parkir Luas', desc: '100+ kendaraan' },
    { icon: <Coffee className="w-6 h-6" />, name: 'Café & Lounge', desc: 'Menu lengkap' },
    { icon: <Wifi className="w-6 h-6" />, name: 'Free WiFi', desc: 'High-speed internet' },
    { icon: <Dumbbell className="w-6 h-6" />, name: 'Pro Shop', desc: 'Peralatan lengkap' },
    { icon: <ShieldCheck className="w-6 h-6" />, name: 'Locker Room', desc: 'Keamanan terjamin' },
    { icon: <Shirt className="w-6 h-6" />, name: 'Sewa Peralatan', desc: 'Raket & bola' },
  ];

  return (
    <section id="facilities" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-dark via-dark-light/50 to-dark" />
      
      <div ref={ref} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-secondary text-sm font-medium mb-4">
            Fasilitas Lengkap
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold font-display text-white mb-6">
            Semua yang Anda
            <br />
            <span className="gradient-text-warm">Butuhkan Ada di Sini</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Kami menyediakan fasilitas premium untuk kenyamanan maksimal Anda sebelum, 
            selama, dan sesudah bermain padel.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {facilities.map((facility, index) => (
            <div
              key={index}
              className={`group relative p-6 rounded-2xl glass hover:bg-white/5 text-center transition-all duration-500 hover:-translate-y-2 cursor-default ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${(index + 2) * 100}ms` }}
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 text-primary-light group-hover:scale-110 group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
                {facility.icon}
              </div>
              <h3 className="text-white font-semibold mb-1">{facility.name}</h3>
              <p className="text-slate-400 text-sm">{facility.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Facilities;
