

import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
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
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <picture>
          <source media="(max-width: 768px)" srcSet="/banner-vertikal.jpg" />
          <img
            src="/banner.webp"
            alt="Lapangan Padel"
            className="w-full h-full object-cover object-center"
          />
        </picture>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-dark/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-dark/50" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full flex justify-center">
        <div className="max-w-3xl text-center space-y-8 flex flex-col items-center">
          {/* Heading */}
          <div className="space-y-4 animate-slide-up opacity-0">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display leading-[1.1] tracking-tight text-white">
              Mainkan
              <br />
              <span className="gradient-text italic pr-4 inline-block">Padel</span> Terbaik
              <br />
              di Kota<span className="text-primary-light">.</span>
            </h1>
          </div>

          {/* Paragraph */}
          <p className="text-lg text-slate-300 max-w-lg leading-relaxed animate-slide-up opacity-0 delay-200">
            Nikmati pengalaman bermain padel premium dengan 
            lapangan berstandar internasional, fasilitas lengkap, dan 
            suasana yang nyaman untuk semua level pemain.
          </p>

          {/* Booking Button */}
          <div className="animate-slide-up opacity-0 delay-300 -mt-2">
            <a
              href="#booking"
              onClick={handleBooking}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-primary/30 transform hover:-translate-y-1 transition-all duration-300"
            >
              Booking Lapangan
            </a>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
