import { createContext, useState, useContext } from 'react';
import { AlertCircle, CheckCircle, Trash2, Info } from 'lucide-react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({ show: false, message: '', type: 'info' });
  const [confirmConfig, setConfirmConfig] = useState({ show: false, message: '', onConfirm: null, isDanger: false });

  const showAlert = (message, type = 'info') => {
    setAlertConfig({ show: true, message, type });
  };

  const showConfirm = (message, onConfirm, isDanger = false) => {
    setConfirmConfig({ show: true, message, onConfirm, isDanger });
  };

  const closeAlert = () => setAlertConfig({ ...alertConfig, show: false });
  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, show: false });

  const alertStyles = {
    error: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: <AlertCircle size={28} />, title: 'Perhatian' },
    success: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', icon: <CheckCircle size={28} />, title: 'Berhasil' },
    info: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', icon: <Info size={28} />, title: 'Pemberitahuan' },
  };

  const currentStyle = alertStyles[alertConfig.type] || alertStyles.info;

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* Alert Modal */}
      {alertConfig.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={closeAlert} />
          <div className="relative w-full max-w-sm bg-[#151C21] p-8 rounded-[2rem] border border-white/10 shadow-2xl animate-scale-in text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border} border`}>
              {currentStyle.icon}
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">{currentStyle.title}</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {alertConfig.message}
            </p>
            <button 
              onClick={closeAlert}
              className="w-full py-3 bg-white/[0.06] hover:bg-white/10 text-white font-semibold rounded-xl transition-all border border-white/5 text-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmConfig.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={closeConfirm} />
          <div className="relative w-full max-w-sm bg-[#151C21] p-8 rounded-[2rem] border border-white/10 shadow-2xl animate-scale-in text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
              confirmConfig.isDanger ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {confirmConfig.isDanger ? <Trash2 size={28} /> : <AlertCircle size={28} />}
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Konfirmasi</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {confirmConfig.message}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={closeConfirm}
                className="py-3 px-4 rounded-xl border border-white/10 text-white/70 font-medium hover:bg-white/5 transition-all text-sm"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                  closeConfirm();
                }}
                className={`py-3 px-4 rounded-xl text-white font-bold transition-all text-sm ${
                  confirmConfig.isDanger 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20' 
                    : 'bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/20'
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
