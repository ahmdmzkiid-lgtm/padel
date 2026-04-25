import { useState, useEffect } from 'react';
import { Star, MessageSquare, X, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import api from '../utils/api';
import { useModal } from '../context/ModalContext';

const Testimonials = () => {
  const [ref, isVisible] = useScrollAnimation();
  const { user, showAlert: showAuthAlert } = useAuth();
  const { showAlert } = useModal();
  const [reviews, setReviews] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews');
      setReviews(response.data.reviews);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleWriteReview = () => {
    if (!user) {
      showAuthAlert('Silakan login terlebih dahulu untuk memberikan ulasan.');
      return;
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      showAlert('Silakan pilih rating bintang terlebih dahulu.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reviews', { rating, comment });
      setIsModalOpen(false);
      setRating(0);
      setComment('');
      fetchReviews(); // Refresh list
      showAlert('Ulasan berhasil dikirim!', 'success');
    } catch (error) {
      console.error('Failed to submit review:', error);
      showAlert('Gagal mengirim ulasan. Silakan coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render stars
  const renderStars = (count) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        size={16} 
        className={`${i < count ? 'fill-yellow-500 text-yellow-500' : 'text-slate-600'}`} 
      />
    ));
  };

  return (
    <section className="py-24 relative overflow-hidden bg-dark">
      <div className="absolute inset-0 bg-gradient-to-t from-dark-light/20 to-transparent" />
      
      <div ref={ref} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-secondary text-sm font-medium mb-4">
            Testimoni
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold font-display text-white mb-6">
            Apa Kata <span className="gradient-text">Mereka?</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed mb-8">
            Pengalaman nyata dari para pemain yang telah mencoba lapangan premium kami.
          </p>
          <button 
            onClick={handleWriteReview}
            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2 mx-auto"
          >
            <MessageSquare size={18} />
            Tulis Ulasan Anda
          </button>
        </div>

        {reviews.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.slice(0, 6).map((review, idx) => (
              <div 
                key={review.id} 
                className={`glass p-6 rounded-2xl border border-white/10 transition-all duration-500 hover:-translate-y-2 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {renderStars(review.rating)}
                </div>
                <p className="text-slate-300 text-sm mb-6 line-clamp-4 leading-relaxed">
                  "{review.comment}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <User size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{review.user_name}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(review.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-500 py-12 glass rounded-3xl border border-white/10">
            <Star size={48} className="mx-auto mb-4 text-slate-600 opacity-50" />
            <p>Belum ada ulasan saat ini. Jadilah yang pertama!</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-dark-light rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-white/10">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold text-white">Tulis Ulasan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6 text-center">
                <p className="text-slate-400 text-sm mb-3">Bagaimana pengalaman Anda bermain di PadelZone?</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="focus:outline-none transition-transform hover:scale-110"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star 
                        size={36} 
                        className={`transition-colors ${
                          star <= (hoverRating || rating) 
                            ? 'fill-yellow-500 text-yellow-500' 
                            : 'text-slate-600'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">Komentar / Ulasan</label>
                <textarea
                  required
                  rows="4"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda di sini..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary resize-none placeholder:text-slate-600"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim Ulasan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Testimonials;
