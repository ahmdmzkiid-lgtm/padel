import { useScrollAnimation } from '../hooks/useScrollAnimation';

const Gallery = () => {
  const [ref, isVisible] = useScrollAnimation();

  const items = [
    { title: 'Lapangan Indoor Premium', cat: 'Lapangan', image: '/lapanganindoor.png', span: 'md:col-span-2 md:row-span-2' },
    { title: 'Lounge Area', cat: 'Fasilitas', image: '/loungearea.webp', span: '' },
    { title: 'Pro Shop / Cafe', cat: 'Fasilitas', image: '/coffeshop.jpg', span: '' },
    { title: 'Turnamen Bulanan', cat: 'Event', image: '/tournament.jpg', span: '' },
    { title: 'Coaching Session', cat: 'Pelatihan', image: '/coachingsession.jpg', span: '' },
    { title: 'Night Session', cat: 'Lapangan', image: '/nightsession.jpg', span: 'md:col-span-2' },
  ];

  return (
    <section id="gallery" className="py-24 relative">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-pink-400 text-sm font-medium mb-4">Galeri</span>
          <h2 className="text-4xl sm:text-5xl font-bold font-display text-white mb-6">
            Lihat Suasana <span className="gradient-text">PadelZone</span>
          </h2>
          <p className="text-lg text-slate-400">Intip keseruan bermain padel di fasilitas kami yang modern dan nyaman.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {items.map((item, i) => (
            <div key={i} className={`group relative rounded-2xl overflow-hidden cursor-pointer ${item.span} ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} transition-all duration-700`} style={{ transitionDelay: `${(i+2)*100}ms` }}>
              {item.image ? (
                <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${item.g} opacity-80 group-hover:opacity-100 transition-opacity duration-500`} />
              )}
              
              {/* Overlays */}
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                <span className="text-xs text-white/70 uppercase tracking-widest mb-1 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">{item.cat}</span>
                <h3 className="text-white font-bold text-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
