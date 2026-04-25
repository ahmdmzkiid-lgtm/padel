import { X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AuthAlert = ({ isOpen, message, redirectTo, redirectState, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-dark/80 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="text-primary w-6 h-6" />
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-white font-display mb-2">
            Satu Langkah Lagi!
          </h3>
          <p className="text-slate-300 leading-relaxed mb-8">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                onClose();
                navigate('/login', { state: { redirectTo, redirectState } });
              }}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-300"
            >
              Login / Daftar
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 border border-white/10 transition-all duration-300"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthAlert;
