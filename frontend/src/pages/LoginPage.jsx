import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoIcon from '../components/LogoIcon';
import api from '../utils/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Token Reset State
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect info from navigation state (set by AuthAlert or BookingPage)
  const redirectTo = location.state?.redirectTo || null;
  const redirectState = location.state?.redirectState || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      if (result.user.is_admin) {
        navigate('/admin');
      } else if (redirectTo) {
        // Redirect to the intended page (e.g., /booking) with any preserved state
        navigate(redirectTo, { state: redirectState });
      } else {
        navigate('/');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleTokenReset = async (e) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password-with-token', {
        token: resetToken,
        newPassword
      });
      setResetSuccess(response.data.message);
      setResetToken('');
      setNewPassword('');
      setTimeout(() => {
        setShowTokenForm(false);
        setResetSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('/banner-vertikal.jpg')] md:bg-[url('/banner.webp')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm" />
      
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 group mb-8">
          <LogoIcon className="w-12 h-12 transform group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <div>
            <span className="text-3xl font-bold font-display text-white tracking-tight">
              Padel<span className="text-primary-light">Zone</span>
            </span>
          </div>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-white font-display">
          Masuk ke Akun Anda
        </h2>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-white/10">
          
          {showTokenForm ? (
            <form className="space-y-6 animate-fade-in" onSubmit={handleTokenReset}>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
                <p className="text-sm text-slate-400">Masukkan kode verifikasi dari admin dan password baru Anda.</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                  {error}
                </div>
              )}
              {resetSuccess && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl text-sm text-center">
                  {resetSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Kode Verifikasi (6 Digit)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono tracking-widest text-center text-lg"
                    placeholder="------"
                    maxLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Password Baru
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTokenForm(false)}
                  className="flex-1 justify-center py-3 px-4 border border-white/10 rounded-xl shadow-sm text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-all focus:outline-none"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Memproses...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <form className="space-y-6 animate-fade-in" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm flex flex-col gap-2 w-full">
                  <a 
                    href="https://wa.me/6285183147625?text=Halo%20Admin%20PadelZone,%20saya%20lupa%20password%20akun%20saya.%20Mohon%20bantuannya%20untuk%20mereset." 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-medium text-primary hover:text-primary-light transition-colors text-right"
                  >
                    Lupa password?
                  </a>
                  <button 
                    type="button"
                    onClick={() => { setShowTokenForm(true); setError(''); setResetSuccess(''); }}
                    className="font-medium text-slate-400 hover:text-white transition-colors text-right text-xs"
                  >
                    Sudah punya kode reset?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-dark text-slate-400">
                    Belum punya akun?
                  </span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/register"
                  state={{ redirectTo, redirectState }}
                  className="font-medium text-primary hover:text-primary-light transition-colors"
                >
                  Daftar sekarang
                </Link>
              </div>
            </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
