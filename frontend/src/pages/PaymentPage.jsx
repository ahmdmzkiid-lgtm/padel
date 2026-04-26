import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { CreditCard, Wallet, Smartphone, ShieldCheck, Ticket, CheckCircle2, QrCode, Building2 } from 'lucide-react';
import api from '../utils/api';

const PaymentPage = () => {
  const { user } = useAuth();
  const { showAlert } = useModal();
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking;

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentName, setPaymentName] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Voucher states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Dynamic payment methods
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [qrisData, setQrisData] = useState(null);
  const [methodsLoading, setMethodsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await api.get('/payments/methods');
        const methods = response.data.methods || [];
        
        const banks = methods.filter(m => m.type === 'bank');
        const qris = methods.find(m => m.type === 'qris');
        
        setPaymentMethods(banks);
        setQrisData(qris || null);
        
        // Auto-select first bank method
        if (banks.length > 0) {
          setSelectedMethod({ type: 'bank', data: banks[0] });
        } else if (qris) {
          setSelectedMethod({ type: 'qris', data: qris });
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error);
      } finally {
        setMethodsLoading(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    const checkBookingStatus = async () => {
      if (!booking?.id) return;
      try {
        const response = await api.get('/bookings/my-bookings');
        const latest = response.data.bookings.find(b => b.id === booking.id);
        if (latest && (latest.status === 'confirmed' || latest.status === 'waiting_confirmation')) {
          showAlert('Booking ini sudah dibayar atau sedang dikonfirmasi.', 'info');
          navigate('/my-bookings');
        }
      } catch (error) {
        console.error('Failed to check booking status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkBookingStatus();
  }, [booking?.id]);

  // Calculate total with discount
  const finalPrice = appliedVoucher 
    ? Math.max(0, Number(booking?.total_price || 0) - Number(appliedVoucher.discount_amount))
    : Number(booking?.total_price || 0);

  // If accessed directly without booking state
  if (!booking || !user) {
    navigate('/');
    return null;
  }

  if (checkingStatus || methodsLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setIsValidating(true);
    try {
      const response = await api.post('/vouchers/validate', { 
        code: voucherCode.toUpperCase(), 
        user_id: user.id 
      });
      setAppliedVoucher(response.data);
      showAlert('Voucher berhasil digunakan!', 'success');
    } catch (error) {
      setAppliedVoucher(null);
      showAlert(error.response?.data?.error || 'Kode voucher tidak valid.', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentName.trim()) {
      showAlert('Silakan masukkan nama rekening pengirim.', 'error');
      return;
    }
    if (!paymentProof) {
      showAlert('Silakan unggah bukti transfer.', 'error');
      return;
    }
    if (!selectedMethod) {
      showAlert('Silakan pilih metode pembayaran.', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('booking_id', booking.id);
      formData.append('amount', finalPrice);
      
      // Determine payment method name for backend
      const methodName = selectedMethod.type === 'bank' 
        ? selectedMethod.data.bank_name 
        : 'QRIS';
      formData.append('payment_method', methodName);
      formData.append('payment_name', paymentName);
      formData.append('payment_proof', paymentProof);
      if (appliedVoucher) {
        formData.append('voucher_id', appliedVoucher.id);
      }

      await api.post('/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      setLoading(false);
    } catch (error) {
      console.error('Payment failed:', error);
      showAlert('Gagal mengirim bukti pembayaran. Silakan coba lagi.', 'error');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full glass p-8 rounded-3xl text-center border border-white/10 animate-scale-in">
          <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Bukti Terkirim!</h2>
          <p className="text-slate-400 mb-8">
            Terima kasih, {user.name.split(' ')[0]}. Bukti pembayaran Anda sedang menunggu konfirmasi Admin.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              Lihat Tiket Booking
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-all border border-white/10"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasNoMethods = paymentMethods.length === 0 && !qrisData;

  return (
    <div className="min-h-screen bg-dark pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Selesaikan Pembayaran</h1>
          <p className="text-slate-400">Pilih metode pembayaran untuk mengonfirmasi booking Anda.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Booking Summary */}
          <div className="glass p-6 rounded-2xl border border-white/10 h-fit">
            <h2 className="text-lg font-semibold text-white mb-6 border-b border-white/10 pb-4">Info Booking</h2>
            
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-slate-400 mb-1">Lapangan</div>
                <div className="text-white font-medium text-lg">{booking.court_name}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-400 mb-1">Tanggal</div>
                  <div className="text-white">{new Date(booking.booking_date).toLocaleDateString('id-ID')}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Waktu</div>
                  <div className="text-white">{booking.start_time} WIB ({booking.duration} Jam)</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
              {appliedVoucher && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Diskon Voucher ({appliedVoucher.code})</span>
                  <span className="text-red-400 font-bold">- Rp {Number(appliedVoucher.discount_amount).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between items-end">
                <div className="text-slate-300">Total Tagihan</div>
                <div className="text-3xl font-bold text-primary-light">
                  Rp {finalPrice.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Voucher Input */}
            {!appliedVoucher && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Punya Kode Voucher?</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Masukkan kode"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-primary transition-all font-mono"
                    />
                  </div>
                  <button 
                    onClick={handleApplyVoucher}
                    disabled={isValidating || !voucherCode.trim()}
                    className="px-6 bg-white/5 hover:bg-primary text-white font-bold rounded-xl border border-white/10 hover:border-primary transition-all text-xs disabled:opacity-50"
                  >
                    {isValidating ? '...' : 'Pakai'}
                  </button>
                </div>
              </div>
            )}
            {appliedVoucher && (
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-green-400 uppercase tracking-widest">Voucher Berhasil!</div>
                  <div className="text-[10px] text-slate-400">Potongan Rp {Number(appliedVoucher.discount_amount).toLocaleString('id-ID')} telah diterapkan.</div>
                </div>
                <button onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }} className="text-[10px] text-slate-500 hover:text-white underline font-bold uppercase tracking-widest">Hapus</button>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Pilih Metode</h2>

            {hasNoMethods && (
              <div className="text-center py-12 glass rounded-2xl border border-white/10">
                <div className="w-16 h-16 bg-white/5 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={28} />
                </div>
                <p className="text-slate-400 text-sm">Belum ada metode pembayaran yang tersedia.</p>
                <p className="text-slate-500 text-xs mt-1">Silakan hubungi admin untuk informasi pembayaran.</p>
              </div>
            )}

            {!hasNoMethods && (
              <>
                <div className="space-y-3">
                  {/* Bank Transfer Methods */}
                  {paymentMethods.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => setSelectedMethod({ type: 'bank', data: bank })}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        selectedMethod?.type === 'bank' && selectedMethod?.data?.id === bank.id
                          ? 'bg-primary/20 border-primary'
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${selectedMethod?.type === 'bank' && selectedMethod?.data?.id === bank.id ? 'bg-primary/30 text-primary-light' : 'bg-white/10 text-slate-400'}`}>
                        <CreditCard size={20} />
                      </div>
                      <div className="text-left flex-1">
                        <span className="font-medium text-white block">Transfer {bank.bank_name}</span>
                        <span className="text-xs text-slate-500">{bank.account_number} a.n. {bank.account_holder}</span>
                      </div>
                      {selectedMethod?.type === 'bank' && selectedMethod?.data?.id === bank.id && (
                        <div className="ml-auto w-4 h-4 rounded-full border-4 border-primary bg-white" />
                      )}
                    </button>
                  ))}

                  {/* QRIS Method */}
                  {qrisData && (
                    <button
                      onClick={() => setSelectedMethod({ type: 'qris', data: qrisData })}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        selectedMethod?.type === 'qris'
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${selectedMethod?.type === 'qris' ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-slate-400'}`}>
                        <QrCode size={20} />
                      </div>
                      <span className="font-medium text-white">QRIS</span>
                      {selectedMethod?.type === 'qris' && (
                        <div className="ml-auto w-4 h-4 rounded-full border-4 border-purple-500 bg-white" />
                      )}
                    </button>
                  )}
                </div>

                {/* Transfer Instructions - Bank */}
                {selectedMethod?.type === 'bank' && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mt-4">
                    <p className="text-sm text-blue-200 mb-2">Silakan transfer sesuai nominal tagihan ke:</p>
                    <div className="font-bold text-lg text-white font-mono tracking-wider">
                      {selectedMethod.data.bank_name} {selectedMethod.data.account_number}
                    </div>
                    <div className="text-sm text-slate-300">
                      a.n. {selectedMethod.data.account_holder}
                    </div>
                  </div>
                )}

                {/* QRIS Display */}
                {selectedMethod?.type === 'qris' && qrisData?.qris_image && (
                  <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-xl mt-4">
                    <p className="text-sm text-purple-200 mb-4 text-center">Scan QRIS berikut untuk melakukan pembayaran:</p>
                    <div className="flex justify-center">
                      <div className="bg-white rounded-2xl p-3 shadow-2xl">
                        <img
                          src={qrisData.qris_image?.startsWith('http') ? qrisData.qris_image : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${qrisData.qris_image}`}
                          alt="QRIS Code"
                          className="w-56 h-auto rounded-xl"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-purple-300/60 text-center mt-3">
                      Pastikan nominal pembayaran sesuai dengan total tagihan
                    </p>
                  </div>
                )}

                {/* Payment Proof Form */}
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Nama Pengirim (A/N)</label>
                    <input 
                      type="text" 
                      value={paymentName}
                      onChange={(e) => setPaymentName(e.target.value)}
                      placeholder="Masukkan nama pemilik rekening" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Bukti Transfer</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setPaymentProof(e.target.files[0])}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={loading || !selectedMethod}
                  className="w-full py-4 mt-6 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                  {loading ? 'Mengirim Bukti...' : 'Saya Sudah Transfer'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
