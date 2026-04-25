import { MapPin, Phone, Mail, Headset } from 'lucide-react';
import { FaInstagram, FaFacebook, FaYoutube } from 'react-icons/fa';
import LogoIcon from './LogoIcon';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <LogoIcon className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <div>
                <span className="text-xl font-bold font-display text-white">Padel<span className="text-primary-light">Zone</span></span>
                <p className="text-[10px] text-slate-500 -mt-1 tracking-widest uppercase">Premium Court</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tempat bermain padel terbaik dengan fasilitas standar internasional dan komunitas yang aktif.
            </p>
            <div className="flex gap-3">
              {[<FaInstagram size={18} />, <FaFacebook size={18} />, <FaYoutube size={18} />].map((icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-lg glass flex items-center justify-center text-slate-400 hover:text-primary-light hover:bg-white/5 transition-all">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Menu</h4>
            <ul className="space-y-3">
              {['Beranda', 'Tentang', 'Fasilitas', 'Lapangan', 'Harga', 'Galeri', 'Kontak'].map((link) => (
                <li key={link}><a href={`#${link.toLowerCase()}`} className="text-slate-400 text-sm hover:text-primary-light transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-4">Layanan</h4>
            <ul className="space-y-3">
              {['Booking Lapangan', 'Private Coaching', 'Group Training', 'Turnamen', 'Event Perusahaan', 'Membership'].map((s) => (
                <li key={s}><a href="#" className="text-slate-400 text-sm hover:text-primary-light transition-colors">{s}</a></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Kontak</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-slate-400 text-sm">
                <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                <span>Jl. Padel Raya No. 88, Jakarta Selatan</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <Phone size={16} className="flex-shrink-0" />
                <span>+62 812-3456-7890</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <Mail size={16} className="flex-shrink-0" />
                <span>info@padelzone.id</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">© 2026 PadelZone. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-primary-light transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary-light transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
