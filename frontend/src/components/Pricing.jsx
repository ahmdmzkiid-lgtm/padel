import { Check, Star, Zap } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const [ref, isVisible] = useScrollAnimation();
  const { user, showAlert } = useAuth();
  const navigate = useNavigate();

  const handleBooking = (e) => {
    e.preventDefault();
    if (!user) {
      showAlert('Silakan login atau mendaftar terlebih dahulu untuk memilih paket ini.', '/booking', { type: 'membership' });
    } else {
      navigate('/booking', { state: { type: 'membership' } });
    }
  };

  const plans = [
    {
      name: 'Court C (Standard)',
      description: 'Membership 1 Bulan',
      price: '2.250.000',
      unit: 'Rp/bln',
      period: 'Harga Normal: Rp 3.000.000',
      features: [
        'Diskon 25% (4 Sesi)',
        '4x Sesi Main (1 Jam)',
        'Bebas Pilih Jadwal',
        'Akses Loker Room',
        'Free WiFi',
      ],
      accent: 'from-slate-500 to-slate-600',
      badge: null,
      popular: false,
    },
    {
      name: 'Court B (Premium)',
      description: 'Membership 1 Bulan',
      price: '3.000.000',
      unit: 'Rp/bln',
      period: 'Harga Normal: Rp 4.000.000',
      features: [
        'Diskon 25% (4 Sesi)',
        '4x Sesi Main (1 Jam)',
        'Bebas Pilih Jadwal',
        'Akses Loker VIP',
        'Full AC & LED Pro',
      ],
      accent: 'from-primary to-accent',
      badge: 'Paling Populer',
      popular: true,
    },
    {
      name: 'Court A (Elite)',
      description: 'Membership 1 Bulan',
      price: '4.500.000',
      unit: 'Rp/bln',
      period: 'Harga Normal: Rp 6.000.000',
      features: [
        'Diskon 25% (4 Sesi)',
        '4x Sesi Main (1 Jam)',
        'Bebas Pilih Jadwal',
        'Welcome Drink & Handuk',
        'Video Recording Session',
      ],
      accent: 'from-secondary to-yellow-500',
      badge: null,
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-dark via-dark-light/30 to-dark" />
      
      <div ref={ref} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-emerald-400 text-sm font-medium mb-4">
            Harga Terjangkau
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold font-display text-white mb-6">
            Pilih Paket
            <br />
            <span className="gradient-text">Sesuai Budget Anda</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Harga transparan tanpa biaya tersembunyi. Pilih paket yang paling sesuai dengan kebutuhan Anda.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl transition-all duration-500 hover:-translate-y-3 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              } ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}
              style={{ transitionDelay: `${(index + 2) * 200}ms` }}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-primary to-accent text-white text-xs font-bold rounded-full shadow-lg shadow-primary/30 flex items-center gap-1.5">
                    <Star size={12} className="fill-white" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className={`h-full p-8 rounded-3xl ${plan.popular ? 'glass border border-primary/30 shadow-2xl shadow-primary/10' : 'glass'}`}>
                {/* Plan Header */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-slate-400">Rp</span>
                    <span className={`text-5xl font-bold font-display bg-gradient-to-r ${plan.accent} bg-clip-text text-transparent`}>
                      {plan.price}
                    </span>
                    <span className="text-slate-400 text-sm">{plan.unit}</span>
                  </div>
                  <p className="text-xs text-red-400 mt-2 line-through opacity-70">{plan.period}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3 text-sm">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${plan.accent} flex items-center justify-center flex-shrink-0`}>
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button 
                  onClick={handleBooking}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  plan.name.includes('Court C')
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                    : `bg-gradient-to-r ${plan.accent} text-white hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5`
                }`}>
                  Pilih Paket
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
