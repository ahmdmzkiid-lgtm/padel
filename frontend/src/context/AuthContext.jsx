import { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import AuthAlert from '../components/AuthAlert';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, message: '', redirectTo: '', redirectState: null });

  const showAlert = (message, redirectTo = '/booking', redirectState = null) => {
    setAlertInfo({ isOpen: true, message, redirectTo, redirectState });
  };

  const hideAlert = () => {
    setAlertInfo({ isOpen: false, message: '', redirectTo: '', redirectState: null });
  };

  // Initialize user from token on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('padelzone_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('padelzone_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;
      
      localStorage.setItem('padelzone_token', token);
      setUser(user);
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login gagal. Silakan coba lagi.'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data;
      
      localStorage.setItem('padelzone_token', token);
      setUser(user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registrasi gagal. Silakan coba lagi.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('padelzone_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, showAlert, hideAlert }}>
      {children}
      <AuthAlert 
        isOpen={alertInfo.isOpen} 
        message={alertInfo.message} 
        redirectTo={alertInfo.redirectTo}
        redirectState={alertInfo.redirectState}
        onClose={hideAlert} 
      />
    </AuthContext.Provider>
  );
};
