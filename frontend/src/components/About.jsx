import { Shield, Trophy, Heart, Zap } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const About = () => {
  const [ref, isVisible] = useScrollAnimation();

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Standar Internasional',
      description: 'Lapangan dibangun dengan standar FIP (Federación Internacional de Pádel) untuk kualitas terbaik.',
      color: 'from-primary to-accent',
      bgColor: 'bg-primary/10',
      textColor: 'text-primary-light',
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Pelatih Profesional',
      description: 'Tim pelatih bersertifikat siap membantu Anda meningkatkan skill dari pemula hingga mahir.',
      color: 'from-secondary to-yellow-500',
      bgColor: 'bg-secondary/10',
      textColor: 'text-secondary',
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Komunitas Aktif',
      description: 'Bergabung dengan komunitas padel terbesar di kota. Turnamen rutin dan event sosial seru.',
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-500/10',
      textColor: 'text-pink-400',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Booking Mudah',
      description: 'Sistem booking online yang cepat dan mudah. Pilih lapangan, waktu, dan bayar secara instan.',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
    },
  ];

  return (
    <section id="about" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div ref={ref} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-primary-light text-sm font-medium mb-4">
            Mengapa PadelZone?
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold font-display text-white mb-6">
            Pengalaman Padel
            <br />
            <span className="gradient-text">Premium & Terbaik</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Kami menyediakan fasilitas padel terlengkap dengan standar internasional. 
            Dari lapangan berkualitas tinggi hingga pelatih profesional, semuanya ada di PadelZone.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group p-6 rounded-2xl glass hover:bg-white/5 transition-all duration-500 hover:-translate-y-2 cursor-default ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${(index + 2) * 150}ms` }}
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-5 ${feature.textColor} group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <div className={`mt-16 p-8 rounded-3xl glass grid grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {[
            { number: '6', label: 'Lapangan Premium', suffix: '' },
            { number: '50', label: 'Pelatih & Staff', suffix: '+' },
            { number: '100', label: 'Turnamen/Tahun', suffix: '+' },
            { number: '98', label: 'Kepuasan Member', suffix: '%' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold font-display gradient-text">
                {stat.number}{stat.suffix}
              </p>
              <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
