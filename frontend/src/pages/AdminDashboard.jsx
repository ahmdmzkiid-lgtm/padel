import { useState, useEffect, useRef, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import socket from '../utils/socket';
import { 
  CheckCircle, XCircle, Clock, Camera, LogOut, User, MapPin, 
  ShieldCheck, XOctagon, Home, Search, ChevronDown, 
  LayoutDashboard, Receipt, BarChart2, Bell, Settings, 
  ChevronLeft, ChevronRight, FileDown, MoreHorizontal,
  CalendarDays, Plus, Trash2, Calendar, Users, DollarSign, TrendingUp, Activity,
  Megaphone, Mail, Send, Percent, Headset, MessageSquare, Folder, Layers, Box, Grid, Ticket, Copy, Heart,
  CreditCard, QrCode, Building2, Eye, EyeOff, Upload, Pencil, Image as ImageIcon, Ban, AlertTriangle, CalendarCheck
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments'); // payments, scanner, schedule
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleBookings, setScheduleBookings] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'admin', verifyPin: '' });
  const [changePasswordForm, setChangePasswordForm] = useState({ oldPassword: '', newPassword: '' });
  const [notificationsData, setNotificationsData] = useState({ payments: [], checkins: [], messages: [] });
  const [stats, setStats] = useState({
    revenueToday: 0,
    bookingsToday: 0,
    activeUsers: 0,
    dailyRevenue: [],
    peakHours: [],
    recentActivity: []
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courtFilter, setCourtFilter] = useState('all');
  const [closeCourtModal, setCloseCourtModal] = useState({
    show: false,
    court_name: '',
    booking_date: '',
    start_time: '',
    reason: 'Maintenance'
  });

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({
    show: false,
    bookingId: null,
    reason: ''
  });

  const handleCloseCourt = async () => {
    try {
      await api.post('/admin/close-court', {
        court_name: closeCourtModal.court_name,
        booking_date: closeCourtModal.booking_date,
        start_time: closeCourtModal.start_time,
        duration: 1,
        reason: closeCourtModal.reason
      });
      setCloseCourtModal({ ...closeCourtModal, show: false });
      fetchSchedule();
      showAlert('Lapangan berhasil ditutup', 'success');
    } catch (error) {
      showAlert(error.response?.data?.message || 'Gagal menutup lapangan', 'error');
    }
  };
  
  const promoTemplates = [
    {
      name: 'Diskon Weekend',
      title: '🔥 DISKON WEEKEND 20%: Main Padel Lebih Seru!',
      content: 'Halo Padel Lovers! Dapatkan potongan harga 20% khusus untuk booking di hari Sabtu & Minggu ini. Slot terbatas, yuk amankan jam mainmu sekarang!'
    },
    {
      name: 'Promo Member Baru',
      title: '🎁 Spesial Member Baru: Main Gratis 1 Jam!',
      content: 'Hai! Sebagai sambutan hangat, PadelZone memberikan promo main gratis 1 jam untuk booking pertamamu. Gunakan kesempatan ini untuk ajak teman-temanmu!'
    },
    {
      name: 'Flash Sale Malam',
      title: '🌙 Flash Sale: Main Malam Hanya Rp 500rb!',
      content: 'Ingin main padel setelah kerja? Nikmati tarif spesial Flash Sale khusus untuk jam 21.00 ke atas. Booking sekarang sebelum kehabisan!'
    },
    {
      name: 'Hadiah Voucher',
      title: '🎉 SELAMAT! Anda Mendapatkan Kode Voucher Khusus!',
      content: 'Halo! Sebagai bentuk apresiasi, kami telah menerbitkan kode voucher spesial hanya untuk Anda. Masukkan kode voucher yang Anda terima di halaman pembayaran untuk menikmati potongan harga langsung. Yuk, booking lapangan favoritmu sekarang!'
    }
  ];

  const [customerList, setCustomerList] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [promoMessage, setPromoMessage] = useState({ title: '', content: '' });
  const [offlineForm, setOfflineForm] = useState({
    court_name: 'Court A - Elite',
    booking_date: '',
    start_time: '08:00',
    duration: 1,
    user_name: ''
  });

  // State for scanner
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  // State for Chat Support
  const [chatList, setChatList] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [adminChatMessages, setAdminChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminAlias, setAdminAlias] = useState('');
  const [chatNotificationToast, setChatNotificationToast] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherForm, setVoucherForm] = useState({ code: '', discount_amount: '', user_id: '' });
  const chatEndRef = useRef(null);

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_holder: '' });
  const [editingBank, setEditingBank] = useState(null);
  const [qrisUploading, setQrisUploading] = useState(false);

  // Events State
  const [adminEvents, setAdminEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', content: '', date: '', location: '' });
  const [editingEvent, setEditingEvent] = useState(null);

  const isScanningRef = useRef(false);

  useEffect(() => {
    if (authLoading) return; // Wait for auth check to finish
    
    if (!user || !user.is_admin) {
      navigate('/');
      return;
    }
    if (!adminAlias) {
      setAdminAlias(user.name);
    }
    fetchBookings();
    fetchChatList();
    socket.emit('join', 'admins');
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchSchedule();
    }
    if (activeTab === 'promotions') {
      fetchCustomers();
    }
    if (activeTab === 'chat') {
      fetchChatList();
      fetchAdmins();
    }
    if (activeTab === 'vouchers') {
      fetchVouchers();
      fetchCustomers();
    }
    if (activeTab === 'admins') {
      fetchAdmins();
    }
    if (activeTab === 'notifications') {
      fetchNotifications();
    }
    if (activeTab === 'overview') {
      fetchStats();
    }
    if (activeTab === 'settings') {
      fetchPaymentSettings();
    }
    if (activeTab === 'events') {
      fetchAdminEvents();
    }
  }, [activeTab, scheduleDate]);

  const safeDateTimeString = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatBookingTime = (startTime, duration) => {
    if (!startTime) return '--:--';
    const start = startTime.slice(0, 5);
    const hour = parseInt(start.split(':')[0]);
    const minute = start.split(':')[1];
    const endHour = (hour + duration) % 24;
    const end = `${endHour.toString().padStart(2, '0')}:${minute}`;
    return `${start} - ${end}`;
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setNotifsLoading(true);
      const res = await api.get('/admin/notifications');
      setNotificationsData(res.data);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setNotifsLoading(false);
    }
  };

  useEffect(() => {
    const chatSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    
    const handleNewChat = (msg) => {
      // 1. If currently chatting with this user, update messages
      if (activeChatUser && msg.sender_id === activeChatUser.id) {
        setAdminChatMessages(prev => [...prev, msg]);
      } 
      
      // 2. If it's a message from customer (not admin reply)
      if (!msg.is_admin_sender) {
        // Play Sound
        chatSound.play().catch(e => console.log('Audio blocked until user interaction'));
        
        // 3. Show floating toast if not actively looking at this user's chat
        if (!activeChatUser || msg.sender_id !== activeChatUser.id) {
          setChatNotificationToast({
            userId: msg.sender_id,
            message: msg.message,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          });
          setTimeout(() => setChatNotificationToast(null), 8000);
        }
      }
      
      fetchChatList(); // Refresh sidebar list for last message preview and red dots
    };

    socket.on('new_chat_message', handleNewChat);
    return () => socket.off('new_chat_message');
  }, [activeChatUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [adminChatMessages]);

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      console.log('Fetching customers...');
      const response = await api.get('/admin/users');
      const data = response.data.users || [];
      console.log('Customers received:', data);
      setCustomerList(data);
      // Debug alert to confirm data
      if (activeTab === 'promotions') {
        setNotification({ 
          message: `Sistem mendeteksi ${data.length} pelanggan di database.`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setNotification({ message: 'Gagal mengambil data pelanggan.', type: 'error' });
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchChatList = async () => {
    try {
      const res = await api.get('/chat/admin/list');
      const sortedChats = res.data.chats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setChatList(sortedChats);
    } catch (err) {
      console.error('Fetch chat list error:', err);
    }
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const res = await api.get('/admin/staff');
      setAdminsList(res.data.admins);
    } catch (err) {
      console.error('Fetch admins error:', err);
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/staff', adminForm);
      showAlert('Akun admin berhasil diaktifkan.', 'success');
      setAdminForm({ name: '', email: '', password: '', role: 'admin', verifyPin: '' });
      fetchAdmins();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Gagal membuat akun admin.', 'error');
    }
  };

  const handleDeleteAdmin = async (id) => {
    showConfirm('Anda yakin ingin menghapus akun admin ini? Tindakan ini tidak dapat dibatalkan.', async () => {
      try {
        await api.delete(`/admin/staff/${id}`);
        fetchAdmins();
        showAlert('Akun admin berhasil dihapus.', 'success');
      } catch (err) {
        showAlert(err.response?.data?.message || 'Gagal menghapus admin.', 'error');
      }
    }, true);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/change-password', changePasswordForm);
      showAlert('PIN keamanan berhasil diperbarui.', 'success');
      setChangePasswordForm({ oldPassword: '', newPassword: '' });
    } catch (err) {
      showAlert(err.response?.data?.message || 'Gagal memperbarui PIN.', 'error');
    }
  };

  const fetchAdminChatHistory = async (userId) => {
    try {
      setChatLoading(true);
      const res = await api.get(`/chat/history/${userId}`);
      setAdminChatMessages(res.data.messages);
      fetchChatList(); // Refresh sidebar to clear unread counts
    } catch (err) {
      console.error('Fetch admin chat history error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAdminReply = async (e) => {
    e.preventDefault();
    const text = adminMessage.trim();
    if (!text || !activeChatUser) return;

    const finalMessage = adminAlias ? `${adminAlias} - ${text}` : text;

    const data = {
      receiver_id: activeChatUser.id,
      message: finalMessage
    };

    socket.emit('admin_reply', data);
    
    // Optimistic update
    setAdminChatMessages(prev => [...prev, { 
      message: finalMessage, 
      is_admin_sender: true, 
      created_at: new Date().toISOString() 
    }]);
    
    setAdminMessage('');
  };

  const handleAdminEndChat = () => {
    if (!activeChatUser) return;
    showConfirm(`Anda yakin ingin mengakhiri sesi chat dengan ${activeChatUser.name}? Riwayat percakapan akan dihapus dari sistem.`, async () => {
      try {
        await api.delete(`/chat/history/${activeChatUser.id}`);
        setActiveChatUser(null);
        setAdminChatMessages([]);
        fetchChatList(); // Refresh sidebar to remove the chat
        showAlert('Sesi percakapan berhasil diakhiri.', 'success');
      } catch (err) {
        console.error('Failed to end chat from admin:', err);
        showAlert('Gagal mengakhiri sesi chat.', 'error');
      }
    }, true);
  };

  useEffect(() => {
    // Sound for notification
    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    // Socket listeners for real-time updates
    socket.on('payment_uploaded', () => {
      fetchBookings();
      setNotification({
        type: 'payment',
        message: 'Seseorang baru saja mengunggah bukti pembayaran. Silakan cek dan konfirmasi sekarang.'
      });
      fetchBookings();
      
      // Play sound (may be blocked until first user interaction)
      notificationSound.play().catch(e => console.log('Audio play blocked until user interaction'));
    });

    socket.on('schedule_updated', () => {
      fetchSchedule();
      fetchBookings();
    });

    return () => {
      socket.off('payment_uploaded');
      socket.off('schedule_updated');
    };
  }, [scheduleDate]);

  const fetchSchedule = async () => {
    try {
      const response = await api.get(`/admin/schedule?date=${scheduleDate}`);
      setScheduleBookings(response.data.bookings);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await api.get('/admin/bookings');
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Failed to fetch admin bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffline = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/bookings/offline', offlineForm);
      setIsModalOpen(false);
      fetchSchedule();
      showAlert('Booking offline berhasil dibuat.', 'success');
    } catch (error) {
      showAlert(error.response?.data?.message || 'Gagal membuat booking offline.', 'error');
    }
  };

  const handleDeleteBooking = async (id) => {
    showConfirm('Tindakan ini tidak dapat dibatalkan. Jadwal akan dihapus secara permanen dari sistem.', async () => {
      try {
        await api.delete(`/admin/bookings/${id}`);
        fetchSchedule();
        fetchBookings();
        showAlert('Jadwal berhasil dihapus.', 'success');
      } catch (error) {
        showAlert('Gagal menghapus jadwal.', 'error');
      }
    }, true);
  };

  const handleConfirmPayment = async (id) => {
    showConfirm('Pastikan bukti transfer sudah sesuai dengan total tagihan sebelum mengonfirmasi.', async () => {
      try {
        await api.put(`/admin/payments/${id}/confirm`);
        fetchBookings();
        fetchSchedule();
        showAlert('Pembayaran berhasil dikonfirmasi.', 'success');
      } catch (error) {
        showAlert('Gagal mengkonfirmasi pembayaran.', 'error');
      }
    });
  };

  const handleRejectPayment = async () => {
    if (!rejectModal.reason.trim()) {
      showAlert('Alasan penolakan wajib diisi.', 'error');
      return;
    }
    try {
      await api.put(`/admin/payments/${rejectModal.bookingId}/reject`, {
        reason: rejectModal.reason
      });
      fetchBookings();
      fetchSchedule();
      setRejectModal({ show: false, bookingId: null, reason: '' });
      showAlert('Pembayaran berhasil ditolak.', 'success');
    } catch (error) {
      showAlert(error.response?.data?.message || 'Gagal menolak pembayaran.', 'error');
    }
  };

  const scannerRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'scanner') {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 15, // 15 FPS is the sweet spot for responsiveness without lagging the UI
            qrbox: 250,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], 
            rememberLastUsedCamera: true,
            disableFlip: false // Important for front-facing / mirrored cameras
          },
          /* verbose= */ false
        );

        scannerRef.current.render(
          (decodedText) => {
            processScan(decodedText);
          },
          (error) => {
            // Ignore scanning errors
          }
        );
      }
    } else {
      // Clear scanner only when actually leaving the scanner tab
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }
    
    // Explicitly DO NOT clear on every unmount to survive React StrictMode double-invocations
  }, [activeTab]);

  // Optimize schedule rendering by pre-grouping bookings
  const memoizedSchedule = useMemo(() => {
    const grid = {};
    scheduleBookings.forEach(b => {
      const startHour = parseInt(b.start_time.split(':')[0]);
      const duration = Number(b.duration);
      for (let h = startHour; h < startHour + duration; h++) {
        grid[`${b.court_name}-${h}`] = b;
      }
    });
    return grid;
  }, [scheduleBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = 
        (b.id.toString().includes(searchQuery)) ||
        (b.user_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.court_name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesCourt = courtFilter === 'all' || b.court_name.includes(courtFilter);

      return matchesSearch && matchesStatus && matchesCourt;
    });
  }, [bookings, searchQuery, statusFilter, courtFilter]);

  const processScan = async (barcodeData) => {
    if (!barcodeData || isScanningRef.current) return;
    
    isScanningRef.current = true;
    setScanLoading(true);
    setScanResult(null);

    try {
      const response = await api.post('/admin/scan', { barcode: barcodeData });
      setScanResult({ success: true, data: response.data });
    } catch (error) {
      setScanResult({ 
        success: false, 
        message: error.response?.data?.message || 'Barcode tidak valid atau terjadi kesalahan.' 
      });
    } finally {
      setScanLoading(false);
      setBarcodeInput('');
      // Delay before next scan is allowed
      setTimeout(() => {
        isScanningRef.current = false;
      }, 3000);
    }
  };

  const handleManualScan = (e) => {
    e.preventDefault();
    processScan(barcodeInput);
  };

  const handleConfirmCheckin = async (bookingId) => {
    try {
      setScanLoading(true);
      await api.post('/admin/confirm-checkin', { booking_id: bookingId });
      showAlert('Check-in berhasil dikonfirmasi!', 'success');
      setScanResult(null); // Clear result after confirm
      fetchNotifications(); // Refresh audit log
    } catch (err) {
      showAlert(err.response?.data?.message || 'Gagal konfirmasi check-in.', 'error');
    } finally {
      setScanLoading(false);
    }
  };

  const fetchVouchers = async () => {
    setVouchersLoading(true);
    try {
      const response = await api.get('/vouchers');
      setVouchers(response.data);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setVouchersLoading(false);
    }
  };

  const fetchPaymentSettings = async () => {
    setPaymentSettingsLoading(true);
    try {
      const response = await api.get('/admin/payment-settings');
      setPaymentSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    } finally {
      setPaymentSettingsLoading(false);
    }
  };

  const fetchAdminEvents = async () => {
    setEventsLoading(true);
    try {
      const response = await api.get('/admin/events');
      setAdminEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    if (!voucherForm.code || !voucherForm.discount_amount || !voucherForm.user_id) {
      showAlert('Harap isi semua field voucher.', 'error');
      return;
    }
    try {
      await api.post('/vouchers', voucherForm);
      showAlert('Voucher berhasil dibuat.', 'success');
      setVoucherForm({ code: '', discount_amount: '', user_id: '' });
      fetchVouchers();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Gagal membuat voucher.', 'error');
    }
  };

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PZ-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVoucherForm({ ...voucherForm, code });
  };

  if (loading) return <div className="min-h-screen bg-dark flex justify-center pt-32"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-auto flex flex-row h-screen sticky top-0 shrink-0 z-50">
        {/* Secondary Sidebar (Sub-menus) */}
        <div className="w-full md:w-[240px] bg-[#11181C] border-r border-white/5 flex flex-col shrink-0">
          <div className="p-6 shrink-0">
            <h2 className="text-white font-bold text-lg mb-1 tracking-tight">AdminPanel</h2>
            <p className="text-xs text-slate-500 truncate">padelzone.com</p>
          </div>

          <div className="px-4 flex-1 overflow-y-auto custom-scrollbar">
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <LayoutDashboard size={18} className="shrink-0" />
                <span className="text-sm">Overview</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('payments')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'payments' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Receipt size={18} className="shrink-0" />
                <span className="text-sm">Konfirmasi Bayar</span>
                {bookings.filter(b => b.payment_status === 'waiting_confirmation').length > 0 && (
                  <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {bookings.filter(b => b.payment_status === 'waiting_confirmation').length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('scanner')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'scanner' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Camera size={18} className="shrink-0" />
                <span className="text-sm">Scan E-Ticket</span>
              </button>

              <button 
                onClick={() => setActiveTab('schedule')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'schedule' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <CalendarDays size={18} className="shrink-0" />
                <span className="text-sm">Jadwal Lapangan</span>
              </button>

              <button 
                onClick={() => setActiveTab('promotions')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'promotions' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Megaphone size={18} className="shrink-0" />
                <span className="text-sm">Promosi</span>
              </button>

              <button 
                onClick={() => setActiveTab('chat')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Headset size={18} className="shrink-0" />
                <span className="text-sm">Customer Service</span>
                {chatList.length > 0 && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>

              <button 
                onClick={() => setActiveTab('vouchers')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'vouchers' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Ticket size={18} className="shrink-0" />
                <span className="text-sm">Voucher Diskon</span>
              </button>

              {user?.role === 'owner' && (
                <button 
                  onClick={() => setActiveTab('admins')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'admins' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <ShieldCheck size={18} className="shrink-0" />
                  <span className="text-sm">Kelola Admin</span>
                </button>
              )}
            </nav>

            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-8 mb-4 px-3">Pengaturan</div>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'notifications' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Bell size={18} className="shrink-0" />
                <span className="text-sm">Notifikasi</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Settings size={18} className="shrink-0" />
                <span className="text-sm">Settings</span>
              </button>
              <button 
                onClick={() => setActiveTab('events')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'events' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <CalendarCheck size={18} className="shrink-0" />
                <span className="text-sm">Event</span>
              </button>
            </nav>
          </div>

          {/* User Footer inside secondary sidebar */}
          <div className="p-4 border-t border-white/5 shrink-0 mt-auto bg-black/20">
            <div className="flex items-center gap-3 w-full group p-2 rounded-xl transition-all">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-lg shadow-primary/20">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter font-black">{user?.role || 'Staff'}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => { logout(); navigate('/login'); }} 
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-md transition-all"
                  title="Switch Account / Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0F161A]">
        {/* Header Breadcrumbs */}
        <header className="px-6 md:px-10 py-6 shrink-0">
          <div className="flex items-center text-sm text-slate-400 mb-6 gap-2 font-medium">
            <Home size={16} />
            <span className="mx-1">/</span>
            <span>Dashboard</span>
            <span className="mx-1">/</span>
            <span className="text-primary font-bold">
              {activeTab === 'payments' ? 'Konfirmasi Bayar' : 
               activeTab === 'scanner' ? 'Scan E-Ticket' : 
               activeTab === 'schedule' ? 'Jadwal Lapangan' : 
               activeTab === 'overview' ? 'Overview' : 
               activeTab === 'promotions' ? 'Promosi & Diskon' : 
               activeTab === 'admins' ? 'Kelola Admin' :
               activeTab === 'settings' ? 'Pengaturan Pembayaran' :
               activeTab === 'events' ? 'Kelola Event' : 'Notifikasi'}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight capitalize">
                {activeTab === 'promotions' ? 'Promosi Pelanggan' : activeTab.replace('-', ' ')}
              </h1>
              <p className="text-slate-400 mt-2 text-sm">
                {activeTab === 'payments' ? 'Kelola dan verifikasi pembayaran pelanggan.' : 
                 activeTab === 'scanner' ? 'Scan barcode tiket pelanggan di lokasi lapangan.' : 
                 activeTab === 'schedule' ? 'Monitor dan kelola okupansi lapangan secara real-time.' : 
                 activeTab === 'overview' ? 'Ringkasan performa bisnis PadelZone hari ini.' : 
                 activeTab === 'promotions' ? 'Kirim info diskon dan kelola database email pelanggan.' :
                 activeTab === 'admins' ? 'Kelola akses dan akun staf admin PadelZone.' :
                 activeTab === 'settings' ? 'Kelola rekening bank dan QRIS untuk pembayaran pelanggan.' :
                 activeTab === 'events' ? 'Buat dan kelola event, turnamen, dan kegiatan PadelZone.' :
                 'Halaman sedang dalam pengembangan.'}
              </p>
            </div>
            
            {activeTab === 'payments' && (
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all">
                <FileDown size={18} />
                Download Laporan
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 [&::-webkit-scrollbar]:hidden">
          
          {activeTab === 'payments' && (
            <div className="flex flex-col h-full space-y-6">
              {/* Utility Bar */}
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[#151C21] p-2 rounded-2xl border border-white/5">
                <div className="relative w-full lg:w-96 shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari Order ID atau nama..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500"
                  />
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto px-2 lg:px-0 pb-2 lg:pb-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  <div className="flex items-center gap-2 shrink-0 border-l border-white/10 pl-4">
                    <span className="text-sm text-slate-400">Status:</span>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none [&>option]:bg-slate-900 [&>option]:text-white cursor-pointer"
                    >
                      <option value="all">Semua Status</option>
                      <option value="waiting_confirmation">Menunggu</option>
                      <option value="confirmed">Lunas / Terkonfirmasi</option>
                      <option value="rejected">Ditolak</option>
                      <option value="checked_in">Sudah Check-in</option>
                      <option value="pending">Pending</option>
                      <option value="closed">Tutup Lapangan</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 border-l border-white/10 pl-4">
                    <span className="text-sm text-slate-400">Lapangan:</span>
                    <select 
                      value={courtFilter}
                      onChange={(e) => setCourtFilter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none [&>option]:bg-slate-900 [&>option]:text-white cursor-pointer"
                    >
                      <option value="all">Semua Lapangan</option>
                      <option value="Court A">Court A - Elite</option>
                      <option value="Court B">Court B - Premium</option>
                      <option value="Court C">Court C - Standard</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-[#151C21] rounded-2xl border border-white/5 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold w-12"><div className="w-4 h-4 rounded border border-white/20"></div></th>
                        <th className="px-6 py-4 font-semibold">Booking ID</th>
                        <th className="px-6 py-4 font-semibold">Jadwal Main</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Pelanggan</th>
                        <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-500">Tidak ada data yang cocok dengan filter.</td>
                        </tr>
                      ) : (
                        filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4"><div className="w-4 h-4 rounded border border-white/20"></div></td>
                            <td className="px-6 py-4">
                              <div className="font-mono text-sm text-white font-medium">PZ-{b.id}</div>
                              <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[120px]">{b.court_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-white">
                                {b.booking_date ? new Date(b.booking_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {formatBookingTime(b.start_time, b.duration)} WIB
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {b.status === 'waiting_confirmation' ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold border border-yellow-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Review
                                </div>
                              ) : b.status === 'confirmed' ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Lunas
                                </div>
                              ) : b.status === 'rejected' ? (
                                <div>
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Ditolak
                                  </div>
                                  {b.rejection_reason && (
                                    <div className="text-[10px] text-red-400/70 mt-1.5 max-w-[180px] leading-relaxed bg-red-500/5 px-2 py-1 rounded-lg border border-red-500/10">
                                      <AlertTriangle size={9} className="inline mr-1" />{b.rejection_reason}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-bold border border-slate-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {b.status}
                                </div>
                              )}
                              {b.confirmed_by_name && (
                                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                  <User size={10} /> {b.confirmed_by_name}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                  {b.user_name ? b.user_name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-white font-medium truncate">{b.user_name || 'Guest'}</div>
                                  <div className="text-xs text-slate-500 truncate">Rp {Number(b.total_price).toLocaleString('id-ID')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {b.payment_status === 'waiting_confirmation' && (
                                  <>
                                    {b.payment_proof && (
                                      <a href={`http://localhost:5000${b.payment_proof}`} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Lihat Bukti Transfer">
                                        <Search size={16} />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleConfirmPayment(b.id)}
                                      className="px-3 py-1.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-primary/20"
                                    >
                                      Konfirmasi
                                    </button>
                                    <button
                                      onClick={() => setRejectModal({ show: true, bookingId: b.id, reason: '' })}
                                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-all border border-red-500/20"
                                    >
                                      Tolak
                                    </button>
                                  </>
                                )}
                                {(b.status === 'pending' || b.status === 'waiting_confirmation') && (
                                  <button
                                    onClick={() => handleDeleteBooking(b.id)}
                                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Batalkan / Hapus"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                {b.status !== 'pending' && b.status !== 'waiting_confirmation' && (
                                  <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <MoreHorizontal size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                <div className="mt-auto p-4 border-t border-white/5 flex items-center justify-between text-sm text-slate-400">
                  <button className="flex items-center gap-2 px-3 py-1.5 hover:text-white transition-colors">
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="flex items-center gap-1 hidden sm:flex">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white font-medium">1</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">2</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">3</button>
                    <span className="px-1">...</span>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">8</button>
                  </div>
                  <button className="flex items-center gap-2 px-3 py-1.5 hover:text-white transition-colors">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
              <div className="w-full lg:w-1/2 bg-[#151C21] p-6 md:p-8 rounded-3xl border border-white/5 text-center shadow-xl">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Camera size={32} />
                </div>
                <h2 className="text-xl font-bold mb-6">Arahkan Kamera ke QR Code</h2>
                <div id="reader" className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden mb-8 bg-black shadow-inner"></div>
                
                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Input Manual</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <form onSubmit={handleManualScan} className="flex gap-3 mt-4">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Contoh: PZ-12-123456"
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary text-sm"
                  />
                  <button
                    type="submit"
                    disabled={scanLoading || !barcodeInput}
                    className="px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-light transition-all disabled:opacity-50"
                  >
                    {scanLoading ? '...' : 'Proses'}
                  </button>
                </form>
              </div>

              {scanResult && (
                <div className="w-full lg:w-1/2">
                  {scanResult.success ? (
                    <div className="relative overflow-hidden bg-gradient-to-b from-green-500/10 to-[#151C21] border border-green-500/20 rounded-3xl p-1 animate-scale-in shadow-2xl">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-green-500/20 blur-[60px] pointer-events-none" />
                      <div className="bg-[#0B1215]/90 backdrop-blur-xl rounded-[22px] p-6 text-center relative z-10 border border-white/5 shadow-2xl">
                        <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                          <ShieldCheck size={32} />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-1">Tiket Valid</h3>
                        <p className="text-slate-500 mb-6 text-sm">Silakan konfirmasi kedatangan pelanggan.</p>
                        
                        <div className="bg-[#151C21] border border-white/5 rounded-xl p-4 text-left space-y-3 mb-6">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pemesan</span>
                            <span className="text-white font-bold text-sm">{scanResult.data.booking.user_name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lapangan</span>
                            <span className="text-slate-300 font-medium text-xs">{scanResult.data.booking.court_name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Waktu</span>
                            <span className="text-slate-300 font-medium text-xs">{scanResult.data.booking.start_time?.slice(0,5)} WIB</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleConfirmCheckin(scanResult.data.booking.id)}
                          disabled={scanLoading}
                          className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group"
                        >
                          {scanLoading ? '...' : (
                            <>
                              <CheckCircle size={18} className="group-hover:scale-110 transition-transform" />
                              KONFIRMASI CHECK-IN
                            </>
                          )}
                        </button>
                        
                        <button 
                          onClick={() => setScanResult(null)}
                          className="w-full mt-3 py-2 text-slate-500 hover:text-white transition-colors text-xs font-bold"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden bg-gradient-to-b from-red-500/10 to-[#151C21] border border-red-500/20 rounded-3xl p-1 animate-scale-in shadow-2xl">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/20 blur-[60px] pointer-events-none" />
                      <div className="bg-[#0B1215]/80 backdrop-blur-xl rounded-[22px] p-6 sm:p-10 text-center relative z-10">
                        <div className="w-24 h-24 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                          <XOctagon size={48} />
                        </div>
                        <h3 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-300 mb-4">Akses Ditolak</h3>
                        <p className="text-red-300 bg-red-500/10 border border-red-500/20 py-4 px-6 rounded-2xl text-lg inline-block">
                          {scanResult.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}


            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#151C21] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  {/* Custom Professional Date Picker */}
                  <div className="relative group/datepicker">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 transition-all cursor-pointer">
                      <Calendar size={18} className="text-primary" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Tanggal Jadwal</span>
                        <span className="text-sm font-bold text-white">
                          {new Date(scheduleDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <ChevronDown size={16} className="text-slate-500 ml-2 group-hover/datepicker:text-primary transition-colors" />
                    </div>
                    
                    {/* Hidden Native Input for Logic (Triggered by div click or invisible overlay) */}
                    <input 
                      type="date" 
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                  </div>

                  <div className="hidden lg:flex items-center gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                    {[-1, 0, 1].map((offset) => {
                      const d = new Date();
                      d.setDate(d.getDate() + offset);
                      const dStr = d.toISOString().split('T')[0];
                      const isActive = scheduleDate === dStr;
                      return (
                        <button
                          key={offset}
                          onClick={() => setScheduleDate(dStr)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          {offset === 0 ? 'Hari Ini' : offset === -1 ? 'Kemarin' : 'Besok'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setOfflineForm({
                      ...offlineForm,
                      booking_date: scheduleDate,
                      start_time: '08:00'
                    });
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light transition-all shadow-lg shadow-primary/20"
                >
                  <Plus size={18} />
                  Booking Manual
                </button>
              </div>

              <div className="bg-[#151C21] rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-white/[0.04] border-b border-white/10">
                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-widest border-r-2 border-white/15 w-[120px]">Waktu</th>
                        <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-r border-white/10">Court A</th>
                        <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-r border-white/10">Court B</th>
                        <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Court C</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {Array.from({ length: 16 }, (_, i) => {
                        const hour = i + 8;
                        const displayTime = `${hour.toString().padStart(2, '0')}:00`;
                        
                        return (
                          <tr key={hour} className="group hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-5 font-mono text-sm text-slate-400 font-medium bg-black/5">{displayTime}</td>
                            {['Court A - Elite', 'Court B - Premium', 'Court C - Standard'].map(court => {
                              const booking = memoizedSchedule[`${court}-${hour}`];
                              const today = new Date().toLocaleDateString('en-CA');
                              const isPast = scheduleDate === today && hour <= new Date().getHours();
                              
                              if (booking) {
                                const startHour = parseInt(booking.start_time.split(':')[0]);
                                const isStart = startHour === hour;
                                
                                // Only render the cell if it's the START of the booking
                                if (isStart) {
                                  return (
                                    <td 
                                      key={court} 
                                      rowSpan={booking.duration}
                                      className="px-3 py-2 border-r border-white/10"
                                    >
                                      <div className={`w-full h-full min-h-[48px] rounded-2xl ${booking.status === 'closed' ? 'bg-red-500/10 border-red-500/20' : (booking.status === 'pending' || booking.status === 'waiting_confirmation') ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-primary/10 border-primary/20'} border p-3 flex flex-col justify-center relative overflow-hidden group/card shadow-lg ${booking.status === 'closed' ? '' : (booking.status === 'pending' || booking.status === 'waiting_confirmation') ? 'shadow-yellow-500/5' : 'shadow-primary/5'}`}>
                                        <div className="absolute top-1 right-1 z-10">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteBooking(booking.id);
                                            }}
                                            className={`p-1.5 ${booking.status === 'closed' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg transition-all shadow-lg`}
                                            title={booking.status === 'closed' ? 'Buka Lapangan' : 'Hapus Jadwal'}
                                          >
                                            {booking.status === 'closed' ? <XCircle size={12} /> : <Trash2 size={12} />}
                                          </button>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className={`w-2 h-2 rounded-full ${booking.status === 'closed' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : (booking.status === 'pending' || booking.status === 'waiting_confirmation') ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
                                          <span className="text-xs font-bold text-white truncate">
                                            {booking.status === 'closed' ? 'CLOSED: ' + (booking.guest_name || 'Maintenance') : booking.status === 'pending' ? 'PENDING: ' + (booking.user_name || 'Booked') : booking.status === 'waiting_confirmation' ? 'WAITING: ' + (booking.user_name || 'Booked') : (booking.user_name || 'Booked')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                          <Clock size={10} />
                                          <span>{booking.duration} Jam {booking.is_membership && '(Member)'}</span>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                }
                                // If it's NOT the start, we return nothing, but the browser's rowSpan 
                                // from the previous row will correctly "fill" this column slot.
                                return null;
                              }
                              
                              // Check if this slot is covered by a rowSpan from ABOVE
                              // We need this check because if we don't render a <td>, the next one shifts left.
                              // HOWEVER, HTML rowSpan handles this automatically IF the rowSpan <td> is actually above it.
                              
                              return (
                                <td key={court} className="px-3 py-2 border-r border-white/10">
                                  {isPast ? (
                                    <div className="w-full h-12 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-center gap-2 text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                                      <XCircle size={14} />
                                      Closed
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => {
                                          setOfflineForm({
                                            ...offlineForm, 
                                            court_name: court, 
                                            start_time: displayTime,
                                            booking_date: scheduleDate
                                          });
                                          setIsModalOpen(true);
                                        }}
                                        title="Booking Manual"
                                        className="flex-1 h-12 rounded-xl border border-dashed border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center group/btn"
                                      >
                                        <Plus size={16} className="text-white/10 group-hover/btn:text-primary transition-colors" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setCloseCourtModal({
                                            show: true,
                                            court_name: court,
                                            booking_date: scheduleDate,
                                            start_time: displayTime,
                                            reason: 'Maintenance'
                                          });
                                        }}
                                        title="Tutup Lapangan"
                                        className="w-12 h-12 rounded-xl border border-dashed border-white/5 hover:border-red-500/30 hover:bg-red-500/5 transition-all flex items-center justify-center group/close"
                                      >
                                        <XOctagon size={16} className="text-white/10 group-hover/close:text-red-500 transition-colors" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'promotions' && (
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Main Promotion Panel */}
              <div className="bg-[#151C21] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48" />
                
                {/* Header Section */}
                <div className="p-8 border-b border-white/5 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <Megaphone size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Kirim Pengumuman Member</h3>
                        <p className="text-slate-400">Pilih pelanggan untuk dikirimi pesan diskon/info di website</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <select 
                        onChange={(e) => {
                          const template = promoTemplates.find(t => t.name === e.target.value);
                          if (template) {
                            setPromoMessage({ title: template.title, content: template.content });
                          }
                        }}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer hover:bg-white/10 transition-all appearance-none [&>option]:bg-[#1A2127]"
                      >
                        <option value="">-- Pilih Template --</option>
                        {promoTemplates.map((t, i) => (
                          <option key={i} value={t.name}>{t.name}</option>
                        ))}
                      </select>

                      <button 
                        onClick={fetchCustomers}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
                      >
                        <Activity size={18} className={customersLoading ? 'animate-spin' : ''} />
                        Refresh Data
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-8 relative z-10">
                  {/* Step 1: Select Recipients */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-sm font-bold">1</div>
                        <h4 className="font-bold text-white uppercase tracking-wider text-sm">Pilih Target Member</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
                            checked={customerList.length > 0 && selectedUsers.length === customerList.length}
                            onChange={() => {
                              if (selectedUsers.length === customerList.length) {
                                setSelectedUsers([]);
                              } else {
                                setSelectedUsers(customerList.map(u => u.id));
                              }
                            }}
                          />
                          <span className="text-[10px] font-bold text-slate-300 uppercase">Pilih Semua ({customerList.length})</span>
                        </label>
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 z-20 bg-[#1A2127] shadow-sm">
                            <tr className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-white/5">
                              <th className="px-6 py-4 font-bold w-12 text-center">Pilih</th>
                              <th className="px-6 py-4 font-bold">Nama Pelanggan (Username)</th>
                              <th className="px-6 py-4 font-bold">No. Telp</th>
                              <th className="px-6 py-4 font-bold">Status Member</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {customersLoading ? (
                              <tr>
                                <td colSpan="4" className="px-6 py-20 text-center">
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <span className="text-sm text-slate-400">Menghubungkan ke database...</span>
                                  </div>
                                </td>
                              </tr>
                            ) : customerList.length === 0 ? (
                              <tr>
                                <td colSpan="4" className="px-6 py-20 text-center">
                                  <div className="opacity-20 flex flex-col items-center gap-2">
                                    <Users size={40} />
                                    <p className="font-bold">Tidak ada data ditemukan</p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              customerList.map((u) => (
                                <tr 
                                  key={u.id} 
                                  onClick={() => {
                                    if (selectedUsers.includes(u.id)) {
                                      setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                    } else {
                                      setSelectedUsers([...selectedUsers, u.id]);
                                    }
                                  }}
                                  className={`hover:bg-white/[0.04] transition-all cursor-pointer group ${selectedUsers.includes(u.id) ? 'bg-primary/5' : ''}`}
                                >
                                  <td className="px-6 py-4 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedUsers.includes(u.id)}
                                      readOnly
                                      className="w-5 h-5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary pointer-events-none"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                        {u.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-sm text-white font-medium truncate">{u.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">{u.phone || '-'}</td>
                                  <td className="px-6 py-4">
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                                      VERIFIED
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Compose Message */}
                  <div className="space-y-6 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-sm font-bold">2</div>
                      <h4 className="font-bold text-white uppercase tracking-wider text-sm">Isi Pengumuman / Diskon</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest ml-1">Judul Info / Promo</label>
                        <input 
                          type="text" 
                          placeholder="Misal: Diskon Weekend 20% khusus hari ini!"
                          value={promoMessage.title}
                          onChange={(e) => setPromoMessage({...promoMessage, title: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary transition-all shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest ml-1">Konten Promosi</label>
                        <textarea 
                          rows="6"
                          placeholder="Halo Padel Lovers! Kami punya penawaran spesial untuk Anda..."
                          value={promoMessage.content}
                          onChange={(e) => setPromoMessage({...promoMessage, content: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary transition-all resize-none shadow-inner"
                        ></textarea>
                      </div>
                    </div>

                    {/* Submit Area */}
                    <div className="bg-primary/5 rounded-[2rem] p-8 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 mt-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                          <Users size={24} />
                        </div>
                        <div>
                          <div className="text-xl font-bold text-white">{selectedUsers.length} Member Terpilih</div>
                          <div className="text-sm text-slate-400">Pesan akan muncul di lonceng notifikasi website mereka.</div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={async () => {
                          if (selectedUsers.length === 0) {
                            showAlert('Harap pilih setidaknya satu member dari daftar di atas!', 'error');
                            return;
                          }
                          if (!promoMessage.title || !promoMessage.content) {
                            showAlert('Harap isi Judul dan Konten pengumuman!', 'error');
                            return;
                          }
                          
                          try {
                            setCustomersLoading(true);
                            await api.post('/admin/promotions', {
                              title: promoMessage.title,
                              content: promoMessage.content,
                              user_ids: selectedUsers
                            });
                            
                            setNotification({ 
                              message: `Berhasil! Info "${promoMessage.title}" telah disiarkan ke website utama.`, 
                              type: 'success' 
                            });
                            
                            setPromoMessage({ title: '', content: '' });
                            setSelectedUsers([]);
                          } catch (error) {
                            console.error('Failed to send promotion:', error);
                            showAlert('Gagal mengirim promosi. Pastikan server backend Anda menyala.', 'error');
                          } finally {
                            setCustomersLoading(false);
                          }
                        }}
                        disabled={selectedUsers.length === 0 || customersLoading}
                        className="flex items-center justify-center gap-3 px-10 py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        KIRIM PROMOSI SEKARANG
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Marketing Note */}
              <div className="flex items-center gap-3 justify-center text-slate-500 text-sm italic">
                <Percent size={16} />
                <span>Tips: Gunakan kata-kata yang mengajak pelanggan untuk segera booking lapangan!</span>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex h-[calc(100vh-140px)] gap-4 animate-fade-in">
              {/* Chat List Sidebar */}
              <div className="w-72 bg-[#151C21] rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-xl">
                <div className="p-5 border-b border-white/5">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2.5 text-sm">
                    <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center text-primary">
                      <MessageSquare size={16} />
                    </div>
                    Pesan Masuk
                  </h4>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text" 
                      placeholder="Cari member..." 
                      className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-all placeholder-slate-600"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {chatList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-3 opacity-30">
                        <MessageSquare size={24} className="text-slate-500" />
                      </div>
                      <p className="text-slate-600 text-xs font-medium">Belum ada chat masuk dari pelanggan.</p>
                    </div>
                  ) : (
                    chatList.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => {
                          setActiveChatUser(chat);
                          fetchAdminChatHistory(chat.id);
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-all border-b border-white/[0.03] hover:bg-white/[0.04] ${
                          activeChatUser?.id === chat.id ? 'bg-primary/10 border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                          activeChatUser?.id === chat.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white/5 text-slate-400'
                        }`}>
                          <User size={14} />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-semibold text-white text-xs truncate">{chat.name}</span>
                            <span className="text-[9px] text-slate-500 font-medium ml-2 shrink-0">
                              {new Date(chat.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <p className="text-[10px] text-slate-500 truncate flex-1">{chat.last_message}</p>
                            {chat.unread_count > 0 && (
                              <span className="bg-primary text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 shadow-sm shadow-primary/30 animate-bounce-subtle">
                                {chat.unread_count > 9 ? '9+' : chat.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Window */}
              <div className="flex-1 bg-[#151C21] rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-xl">
                {activeChatUser ? (
                  <>
                    {/* Chat Header - Fixed */}
                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shadow-lg shadow-primary/15">
                          <User size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white">{activeChatUser.name}</h4>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-[10px] text-green-400 uppercase font-bold tracking-widest">Sesi Aktif</span>
                            <span className="mx-1 text-white/10">•</span>
                            <span className="text-xs text-slate-500">{activeChatUser.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* End Chat Button */}
                      <button 
                        onClick={handleAdminEndChat}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20 hover:border-red-500/30 text-xs font-bold"
                        title="Akhiri Sesi & Hapus Riwayat"
                      >
                        <Trash2 size={14} />
                        Akhiri Sesi
                      </button>
                    </div>

                    {/* Messages Area - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0d1117]">
                      {chatLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <span className="text-xs text-slate-500 font-medium">Memuat pesan...</span>
                        </div>
                      ) : adminChatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 opacity-20">
                            <MessageSquare size={28} className="text-slate-500" />
                          </div>
                          <p className="text-slate-600 text-sm">Belum ada pesan dalam percakapan ini.</p>
                        </div>
                      ) : (
                        adminChatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.is_admin_sender ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 text-xs leading-relaxed ${
                              msg.is_admin_sender 
                                ? 'bg-primary text-white rounded-xl rounded-tr-sm shadow-sm shadow-primary/10' 
                                : 'bg-white/[0.06] text-slate-200 border border-white/5 rounded-xl rounded-tl-sm'
                            }`}>
                              {msg.is_admin_sender && msg.message.includes(' - ') ? (
                                <>
                                  <span className="font-black text-[10px] opacity-70 uppercase tracking-tighter mr-1.5 border-b border-white/20 pb-0.5 block mb-1">
                                    {msg.message.split(' - ')[0]}
                                  </span>
                                  <span>{msg.message.split(' - ').slice(1).join(' - ')}</span>
                                </>
                              ) : (
                                msg.message
                              )}
                              <div className={`text-[9px] mt-1.5 ${msg.is_admin_sender ? 'text-white/50' : 'text-slate-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Reply Input - Fixed at bottom */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 shrink-0">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 border-b border-white/5 pb-2">
                        {/* Admin Alias Configuration */}
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Balas Sebagai:</label>
                          <div className="relative group/alias">
                            <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary" />
                            <select 
                              value={adminAlias}
                              onChange={(e) => setAdminAlias(e.target.value)}
                              className="w-32 sm:w-40 bg-primary/10 border border-primary/30 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-primary/20 shadow-inner"
                            >
                              <option value={user?.name}>{user?.name} (You)</option>
                              {adminsList.filter(a => a.name !== user?.name).map(adm => (
                                <option key={adm.id} value={adm.name}>{adm.name}</option>
                              ))}
                              <option value="">No Name</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover/alias:text-primary transition-colors" />
                          </div>
                        </div>

                        {/* Admin Quick Replies */}
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar w-full sm:w-auto pb-1">
                          {[
                            { text: 'Halo, ada yang bisa dibantu?', icon: MessageSquare, label: 'Sapa' },
                            { text: 'Silakan cek menu Booking di atas', icon: Calendar, label: 'Booking' },
                            { text: 'Bisa dilihat di halaman Pricing', icon: DollarSign, label: 'Harga' },
                            { text: 'Terima kasih!', icon: Heart, label: 'Terima Kasih' }
                          ].map((t, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setAdminMessage(t.text)}
                              className="whitespace-nowrap px-3 py-1.5 bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/30 rounded-xl text-[10px] text-slate-300 transition-all flex items-center gap-1.5 shrink-0"
                            >
                              <t.icon size={12} className="text-primary" />
                              <span className="font-bold">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <form onSubmit={handleAdminReply} className="flex gap-2">
                        <input 
                          name="message"
                          type="text" 
                          value={adminMessage}
                          onChange={(e) => setAdminMessage(e.target.value)}
                          autoComplete="off"
                          placeholder={`Tulis balasan untuk ${activeChatUser.name.split(' ')[0]}...`}
                          className="flex-1 bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-all placeholder-slate-600"
                        />
                        <button 
                          type="submit"
                          className="px-5 bg-primary text-white font-bold rounded-lg hover:bg-primary-light transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5 text-xs"
                        >
                          <Send size={14} />
                          Balas
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
                    <div className="w-24 h-24 bg-white/[0.03] rounded-2xl flex items-center justify-center mb-6">
                      <Headset size={48} className="text-slate-700" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Pusat Bantuan Pelanggan</h4>
                    <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                      Pilih percakapan di sebelah kiri untuk memberikan dukungan real-time kepada member PadelZone.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'vouchers' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Create Voucher Form */}
                <div className="w-full lg:w-1/3 glass p-6 rounded-3xl border border-white/10 h-fit">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Plus className="text-primary" /> Buat Voucher Baru
                  </h3>
                  <form onSubmit={handleCreateVoucher} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Pilih Pelanggan</label>
                      <select 
                        value={voucherForm.user_id}
                        onChange={(e) => setVoucherForm({ ...voucherForm, user_id: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm"
                      >
                        <option value="">-- Pilih User --</option>
                        {customerList.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Kode Voucher</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={voucherForm.code}
                          onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
                          placeholder="PZ-DISC50K"
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm font-mono"
                        />
                        <button 
                          type="button"
                          onClick={generateVoucherCode}
                          className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-all text-xs font-bold"
                          title="Generate Kode Otomatis"
                        >
                          Auto
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Nominal Diskon (Rp)</label>
                      <input 
                        type="number" 
                        value={voucherForm.discount_amount}
                        onChange={(e) => setVoucherForm({ ...voucherForm, discount_amount: e.target.value })}
                        placeholder="50000"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
                    >
                      <Ticket size={18} />
                      Terbitkan Voucher
                    </button>
                  </form>
                </div>

                {/* Voucher List Table */}
                <div className="flex-1 glass p-6 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Ticket className="text-primary" /> Daftar Voucher Aktif
                    </h3>
                    <button onClick={fetchVouchers} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all">
                      <Clock size={16} className={vouchersLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                          <th className="px-4 py-4">Kode Token</th>
                          <th className="px-4 py-4">Pelanggan</th>
                          <th className="px-4 py-4">Nominal</th>
                          <th className="px-4 py-4">Status</th>
                          <th className="px-4 py-4 text-right">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {vouchers.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-12 text-center text-slate-500 text-sm">Belum ada voucher yang diterbitkan.</td>
                          </tr>
                        ) : (
                          vouchers.map((v) => (
                            <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-4 py-4 font-mono text-xs font-bold text-primary-light flex items-center gap-2">
                                {v.code}
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(v.code);
                                    showAlert('Kode voucher disalin ke clipboard!', 'success');
                                  }}
                                  className="p-1.5 bg-white/5 hover:bg-primary/20 rounded-md text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                                  title="Salin Kode"
                                >
                                  <Copy size={12} />
                                </button>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-xs font-bold text-white">{v.user_name}</div>
                                <div className="text-[10px] text-slate-500">{v.user_email}</div>
                              </td>
                              <td className="px-4 py-4 text-xs font-bold text-white">Rp {Number(v.discount_amount).toLocaleString('id-ID')}</td>
                              <td className="px-4 py-4">
                                {v.is_used ? (
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-wider">Sudah Terpakai</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-md text-[9px] font-bold uppercase tracking-wider">Tersedia</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right text-[10px] text-slate-500">
                                {new Date(v.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'admins' && (
            <div className="flex flex-col h-full space-y-8 animate-fade-in">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Create Admin Form */}
                <div className="w-full lg:w-[400px] glass p-8 rounded-3xl border border-white/10 shrink-0">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                      <Plus size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Tambah Admin</h3>
                  </div>
                  
                  <form onSubmit={handleCreateAdmin} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Nama Lengkap Admin</label>
                      <input 
                        type="text" 
                        required
                        value={adminForm.name}
                        onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                        placeholder="Contoh: Admin Budi"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all text-sm shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">PIN Admin Baru</label>
                      <input 
                        type="password" 
                        required
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                        placeholder="PIN untuk staf baru"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all text-sm shadow-inner"
                      />
                    </div>
                    
                    <div className="pt-4 border-t border-white/5">
                      <label className="block text-[10px] font-bold text-primary uppercase mb-2 tracking-widest ml-1 flex items-center gap-1.5">
                        <ShieldCheck size={12} /> Verifikasi PIN Owner (Anda)
                      </label>
                      <input 
                        type="password" 
                        required
                        value={adminForm.verifyPin}
                        onChange={(e) => setAdminForm({ ...adminForm, verifyPin: e.target.value })}
                        placeholder="Masukkan PIN Anda untuk konfirmasi"
                        className="w-full bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all text-sm shadow-inner font-bold tracking-widest"
                      />
                      <p className="text-[9px] text-slate-500 mt-2 italic px-1">Wajib diisi untuk memverifikasi bahwa Anda adalah pemilik akses.</p>
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-5 bg-primary text-white font-black rounded-[2rem] hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-6 group"
                    >
                      <ShieldCheck size={20} className="group-hover:rotate-12 transition-transform" />
                      AKTIFKAN AKUN ADMIN
                    </button>
                  </form>
                </div>

                {/* Admin List Table */}
                <div className="flex-1 bg-[#151C21] rounded-3xl border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Daftar Admin & Staf</h3>
                    <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                      {adminsList.length} Personnel
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                          <th className="px-6 py-4">Nama Staf</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {adminsLoading ? (
                          <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500">Memuat data...</td></tr>
                        ) : adminsList.map((adm) => (
                          <tr key={adm.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold text-xs">
                                  {adm.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white">{adm.name}</div>
                                  <div className="text-[11px] text-slate-500">{adm.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${adm.role === 'owner' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                {adm.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-xs text-green-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                Active
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {adm.id !== user?.id ? (
                                <button 
                                  onClick={() => handleDeleteAdmin(adm.id)}
                                  className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                  title="Hapus Akun"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-600 italic px-2">You</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Floating Chat Notification Toast */}
          {chatNotificationToast && (
            <div className="fixed top-8 right-8 z-[300] w-80 bg-[#1A2127] border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50 animate-slide-up flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <MessageSquare size={16} />
                  Pesan Baru Masuk
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{chatNotificationToast.time}</span>
              </div>
              <p className="text-sm text-white line-clamp-2 leading-relaxed">
                {chatNotificationToast.message}
              </p>
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={() => {
                    let chatUser = chatList.find(c => c.id === chatNotificationToast.userId);
                    if (!chatUser) {
                      // Fallback in case chatList hasn't fully updated yet
                      chatUser = { id: chatNotificationToast.userId, name: 'Pelanggan Baru' };
                    }
                    setActiveTab('chat');
                    setActiveChatUser(chatUser);
                    fetchAdminChatHistory(chatUser.id);
                    setChatNotificationToast(null);
                  }}
                  className="flex-1 py-2 bg-primary/20 text-primary font-bold rounded-xl text-xs hover:bg-primary hover:text-white transition-all text-center"
                >
                  Buka Chat
                </button>
                <button 
                  onClick={() => setChatNotificationToast(null)}
                  className="px-4 py-2 bg-white/5 text-slate-300 font-bold rounded-xl text-xs hover:bg-white/10 transition-all text-center"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

      {/* Dynamic Notification Overlay */}
      {notification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setNotification(null)} />
          <div className="relative w-full max-w-sm glass-card p-8 text-center rounded-[32px] border border-white/10 shadow-2xl animate-scale-in">
            <div className={`w-20 h-20 ${notification.type === 'success' ? 'bg-green-500/20' : 'bg-primary/20'} rounded-full flex items-center justify-center mx-auto mb-6 relative`}>
              <div className={`absolute inset-0 ${notification.type === 'success' ? 'bg-green-500/40' : 'bg-primary/40'} rounded-full animate-ping opacity-20`} />
              {notification.type === 'success' ? (
                <CheckCircle size={40} className="text-green-400" />
              ) : (
                <Bell size={40} className="text-primary animate-bounce-subtle" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 font-display">
              {notification.type === 'success' ? 'Berhasil!' : 'Pembayaran Masuk!'}
            </h3>
            <p className="text-slate-400 mb-8 leading-relaxed">
              {notification.message}
            </p>
            <div className="flex flex-col gap-3">
              {notification.type !== 'success' && (
                <button 
                  onClick={() => {
                    setActiveTab('payments');
                    setNotification(null);
                  }}
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/20"
                >
                  Lihat Sekarang
                </button>
              )}
              <button 
                onClick={() => setNotification(null)}
                className={`w-full ${notification.type === 'success' ? 'py-4 bg-green-500 hover:bg-green-600' : 'py-3 text-slate-500 hover:text-white'} font-bold rounded-2xl transition-all shadow-lg`}
              >
                {notification.type === 'success' ? 'Selesai' : 'Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Booking Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
              <div className="relative bg-[#151C21] w-full max-w-md rounded-3xl border border-white/10 p-8 shadow-2xl animate-scale-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <Plus size={24} />
                  </div>
                  <h2 className="text-2xl font-bold font-display">Booking Offline</h2>
                </div>

                <form onSubmit={handleCreateOffline} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nama Pelanggan</label>
                    <input 
                      type="text" 
                      required
                      value={offlineForm.user_name}
                      onChange={(e) => setOfflineForm({...offlineForm, user_name: e.target.value})}
                      placeholder="Masukkan nama..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lapangan</label>
                      <select 
                        value={offlineForm.court_name}
                        onChange={(e) => setOfflineForm({...offlineForm, court_name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-primary appearance-none [&>option]:bg-slate-900 [&>option]:text-white"
                      >
                        <option value="Court A - Elite">Court A</option>
                        <option value="Court B - Premium">Court B</option>
                        <option value="Court C - Standard">Court C</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Durasi (Jam)</label>
                      <select 
                        value={offlineForm.duration}
                        onChange={(e) => setOfflineForm({...offlineForm, duration: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-primary appearance-none [&>option]:bg-slate-900 [&>option]:text-white"
                      >
                        <option value="1">1 Jam</option>
                        <option value="2">2 Jam</option>
                        <option value="3">3 Jam</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tanggal</label>
                      <input 
                        type="date" 
                        required
                        value={offlineForm.booking_date}
                        onChange={(e) => setOfflineForm({...offlineForm, booking_date: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mulai</label>
                      <input 
                        type="time" 
                        required
                        value={offlineForm.start_time}
                        onChange={(e) => setOfflineForm({...offlineForm, start_time: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-light transition-all shadow-lg shadow-primary/20"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in pb-10">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    label: 'Revenue Hari Ini', 
                    value: `Rp ${Number(stats.revenueToday).toLocaleString('id-ID')}`, 
                    icon: DollarSign, 
                    color: 'text-green-400', 
                    bg: 'bg-green-500/10',
                    desc: 'Total pendapatan lunas hari ini'
                  },
                  { 
                    label: 'Booking Hari Ini', 
                    value: stats.bookingsToday, 
                    icon: CheckCircle, 
                    color: 'text-primary', 
                    bg: 'bg-primary/10',
                    desc: 'Total pesanan lunas & check-in'
                  },
                  { 
                    label: 'User Aktif', 
                    value: stats.activeUsers, 
                    icon: Users, 
                    color: 'text-blue-400', 
                    bg: 'bg-blue-500/10',
                    desc: 'User unik dalam 30 hari terakhir'
                  },
                  { 
                    label: 'Okupansi Lapangan', 
                    value: `${Math.round((stats.bookingsToday / 48) * 100)}%`, 
                    icon: TrendingUp, 
                    color: 'text-purple-400', 
                    bg: 'bg-purple-500/10',
                    desc: 'Rata-rata penggunaan lapangan'
                  },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#151C21] p-6 rounded-[32px] border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col justify-between h-full">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:bg-primary/5 transition-colors" />
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                          <stat.icon size={24} />
                        </div>
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</div>
                      <div className="text-2xl font-black text-white tracking-tight mb-2 flex items-baseline gap-1 flex-wrap">
                        {stat.label.includes('Revenue') ? (
                          <>
                            <span className="text-xs text-slate-500 font-bold">Rp</span>
                            <span>{Number(stats.revenueToday).toLocaleString('id-ID')}</span>
                          </>
                        ) : (
                          <span>{stat.value}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{stat.desc}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Daily Revenue Bar Chart */}
                <div className="lg:col-span-2 bg-[#151C21] rounded-[32px] border border-white/5 p-8 flex flex-col h-[450px]">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Revenue (30 Days)</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">
                          Rp {(stats.dailyRevenue.reduce((sum, d) => sum + Number(d.revenue), 0) / 1000000).toFixed(1)}M
                        </span>
                        <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <TrendingUp size={12} /> +8.4%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Akumulasi pendapatan kotor bulan ini.</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dailyRevenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          stroke="#475569" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                          dy={10}
                          interval={4} // Show every 5th label to avoid crowding
                        />
                        <YAxis 
                          stroke="#475569" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => `${value >= 1000000 ? (value/1000000).toFixed(0) + 'M' : (value/1000).toFixed(0) + 'k'}`}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{ backgroundColor: '#1A2127', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                          labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                        />
                        <Bar 
                          dataKey="revenue" 
                          radius={[6, 6, 6, 6]} 
                          barSize={12}
                        >
                          {stats.dailyRevenue.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === stats.dailyRevenue.length - 1 ? '#7C3AED' : '#2C353D'} 
                              className="transition-all duration-300 hover:opacity-80"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Peak Hours Chart */}
                <div className="bg-[#151C21] rounded-[32px] border border-white/5 p-8 flex flex-col h-[450px]">
                  <h3 className="text-xl font-bold text-white mb-1">Jam Ramai</h3>
                  <p className="text-xs text-slate-500 mb-8">Waktu paling favorit pelanggan.</p>
                  
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.peakHours} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="start_time" 
                          type="category" 
                          stroke="#64748b" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          width={60}
                          tickFormatter={(t) => t.slice(0,5)}
                        />
                        <Tooltip 
                          cursor={{fill: 'rgba(255,255,255,0.05)'}}
                          contentStyle={{ backgroundColor: '#1A2127', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                        />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                          {stats.peakHours.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#22C55E' : 'rgba(34, 197, 94, 0.4)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/5 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Saran Operasional</p>
                    <p className="text-xs text-slate-400 mt-2 italic">"Tingkatkan staf pada jam {stats.peakHours[0]?.start_time?.slice(0,5)} untuk pelayanan terbaik."</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity Feed */}
              <div className="bg-[#151C21] rounded-[32px] border border-white/5 p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-white">Riwayat Aktivitas User</h3>
                  <button className="text-xs text-primary font-bold hover:underline" onClick={fetchNotifications}>Lihat Semua</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {stats.recentActivity.map((act, i) => (
                    <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {act.user_name?.charAt(0) || 'G'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{act.user_name || 'Guest'}</div>
                          <div className="text-[9px] text-slate-500">{new Date(act.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded w-fit ${
                          act.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : 
                          act.status === 'checked_in' ? 'bg-purple-500/10 text-purple-400' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {act.status}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate">{act.court_name}</div>
                      </div>
                    </div>
                  ))}
                  {stats.recentActivity.length === 0 && (
                    <div className="col-span-full py-10 text-center text-slate-600 italic text-sm">Belum ada aktivitas hari ini.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
              {/* Profile Card */}
              <div className="bg-[#151C21] rounded-3xl border border-white/5 p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary/20">
                    {user?.name?.charAt(0) || 'A'}
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                      <h2 className="text-3xl font-black text-white tracking-tight">{user?.name}</h2>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full border border-primary/20 w-fit mx-auto md:mx-0">
                        {user?.role}
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">{user?.email}</p>
                    <div className="flex items-center gap-4 mt-4 justify-center md:justify-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">ID Account</span>
                        <span className="text-sm font-mono text-slate-400">#PZ-{user?.id?.toString().padStart(4, '0')}</span>
                      </div>
                      <div className="w-px h-8 bg-white/5" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Member Since</span>
                        <span className="text-sm text-slate-400">Apr 2024</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="bg-[#151C21] rounded-3xl border border-white/5 p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Keamanan & PIN</h3>
                    <p className="text-xs text-slate-500">Kelola PIN 6-angka untuk akses dashboard Anda.</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">PIN Saat Ini</label>
                      <input 
                        type="password" 
                        required
                        value={changePasswordForm.oldPassword}
                        onChange={(e) => setChangePasswordForm({ ...changePasswordForm, oldPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all text-sm shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">PIN Baru (6 Angka)</label>
                      <input 
                        type="password" 
                        required
                        maxLength={8}
                        value={changePasswordForm.newPassword}
                        onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                        placeholder="Min. 6 angka"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all text-sm shadow-inner tracking-[0.2em]"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                    <p className="text-[11px] text-slate-600 leading-relaxed max-w-sm">
                      <span className="text-primary font-bold">Penting:</span> Pastikan PIN Anda tidak mudah ditebak. PIN ini digunakan untuk login dan tindakan administratif penting lainnya.
                    </p>
                    <button 
                      type="submit"
                      className="w-full md:w-auto px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Simpan PIN Baru
                    </button>
                  </div>
                </form>
              </div>

              {/* Logout Option */}
              <div className="bg-red-500/5 rounded-3xl border border-red-500/10 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-white mb-1">Akhiri Sesi Dashboard</h4>
                  <p className="text-xs text-slate-500">Keluar dari semua perangkat yang terhubung dengan akun ini.</p>
                </div>
                <button 
                  onClick={() => { logout(); navigate('/login'); }}
                  className="px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all font-bold text-sm"
                >
                  Keluar Sekarang
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Audit Log & Notifikasi</h2>
                  <p className="text-slate-500 font-medium">Pantau seluruh aktivitas operasional secara real-time.</p>
                </div>
                <button 
                  onClick={fetchNotifications}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white border border-white/5"
                >
                  <TrendingUp size={20} className="rotate-90" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Pesan Masuk */}
                <div className="bg-[#151C21] rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-[70vh] shadow-2xl">
                  <div className="p-6 bg-blue-500/10 border-b border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white leading-none">Pesan Masuk</h3>
                      <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Customer Support</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {notificationsData.messages.map((msg, i) => (
                      <div key={i} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{msg.sender_name}</span>
                          <span className="text-[9px] text-slate-600">{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 italic">"{msg.message}"</p>
                      </div>
                    ))}
                    {notificationsData.messages.length === 0 && <p className="text-center py-20 text-slate-600 text-xs italic">Belum ada pesan baru.</p>}
                  </div>
                </div>

                {/* Column 2: Pembayaran */}
                <div className="bg-[#151C21] rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-[70vh] shadow-2xl">
                  <div className="p-6 bg-green-500/10 border-b border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400 shadow-inner">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white leading-none">Pembayaran</h3>
                      <span className="text-[10px] text-green-400 font-black uppercase tracking-widest">Transaksi Terbaru</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {notificationsData.payments.map((p, i) => (
                      <div key={i} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-green-500/30 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-white">{p.user_name}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${p.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-green-400">Rp {Number(p.total_price).toLocaleString()}</span>
                          <span className="text-[9px] text-slate-600">{new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                        {p.admin_name && (
                          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[9px] text-slate-500">
                            <ShieldCheck size={10} /> Dikonfirmasi oleh: <span className="text-slate-300 font-bold">{p.admin_name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {notificationsData.payments.length === 0 && <p className="text-center py-20 text-slate-600 text-xs italic">Belum ada transaksi.</p>}
                  </div>
                </div>

                {/* Column 3: Check-in / Scan */}
                <div className="bg-[#151C21] rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-[70vh] shadow-2xl">
                  <div className="p-6 bg-purple-500/10 border-b border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 shadow-inner">
                      <Camera size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white leading-none">Check-in</h3>
                      <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Riwayat Scan Tiket</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {notificationsData.checkins.map((c, i) => (
                      <div key={i} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-purple-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{c.user_name}</span>
                          <div className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-black rounded-full border border-purple-500/30">CHECKED IN</div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
                          <Calendar size={10} /> {new Date(c.booking_date).toLocaleDateString()} • {c.start_time}
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[9px] text-slate-500">
                          <User size={10} /> Di-scan oleh: <span className="text-slate-300 font-bold">{c.admin_name}</span>
                        </div>
                        <div className="text-[8px] text-slate-600 mt-1 italic">{new Date(c.checkin_time).toLocaleTimeString()}</div>
                      </div>
                    ))}
                    {notificationsData.checkins.length === 0 && <p className="text-center py-20 text-slate-600 text-xs italic">Belum ada aktivitas scan.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== SETTINGS TAB: Payment Settings ===== */}
          {activeTab === 'settings' && (
            <div className="space-y-8 max-w-5xl">
              {/* Bank Accounts Section */}
              <div className="bg-[#151C21] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 bg-blue-500/10 border-b border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-none">Rekening Bank</h3>
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Kelola Rekening Transfer</span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Add Bank Form */}
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (editingBank) {
                      // Update existing
                      try {
                        await api.put(`/admin/payment-settings/${editingBank.id}`, bankForm);
                        showAlert('Rekening berhasil diperbarui.', 'success');
                        setEditingBank(null);
                        setBankForm({ bank_name: '', account_number: '', account_holder: '' });
                        fetchPaymentSettings();
                      } catch (err) {
                        showAlert(err.response?.data?.message || 'Gagal memperbarui rekening.', 'error');
                      }
                    } else {
                      // Create new
                      try {
                        await api.post('/admin/payment-settings', { type: 'bank', ...bankForm });
                        showAlert('Rekening berhasil ditambahkan.', 'success');
                        setBankForm({ bank_name: '', account_number: '', account_holder: '' });
                        fetchPaymentSettings();
                      } catch (err) {
                        showAlert(err.response?.data?.message || 'Gagal menambahkan rekening.', 'error');
                      }
                    }
                  }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Nama Bank</label>
                      <input
                        type="text"
                        value={bankForm.bank_name}
                        onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                        placeholder="contoh: BCA"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Nomor Rekening</label>
                      <input
                        type="text"
                        value={bankForm.account_number}
                        onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                        placeholder="1234567890"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all shadow-inner font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Atas Nama</label>
                      <input
                        type="text"
                        value={bankForm.account_holder}
                        onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })}
                        placeholder="Nama pemilik rekening"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 text-sm"
                      >
                        {editingBank ? <><Pencil size={14} /> Update</> : <><Plus size={14} /> Tambah</>}
                      </button>
                      {editingBank && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBank(null);
                            setBankForm({ bank_name: '', account_number: '', account_holder: '' });
                          }}
                          className="py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10 text-sm"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Bank List */}
                  {paymentSettingsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentSettings.filter(s => s.type === 'bank').length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-white/5 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <CreditCard size={28} />
                          </div>
                          <p className="text-slate-500 text-sm">Belum ada rekening bank yang ditambahkan.</p>
                          <p className="text-slate-600 text-xs mt-1">Tambahkan rekening bank di atas untuk ditampilkan di halaman pembayaran.</p>
                        </div>
                      )}
                      {paymentSettings.filter(s => s.type === 'bank').map((bank) => (
                        <div key={bank.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                          bank.is_active ? 'bg-white/[0.03] border-white/5 hover:border-blue-500/30' : 'bg-white/[0.01] border-white/5 opacity-50'
                        }`}>
                          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
                            <CreditCard size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-white">{bank.bank_name}</span>
                              {bank.is_active ? (
                                <span className="text-[8px] font-black uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Aktif</span>
                              ) : (
                                <span className="text-[8px] font-black uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Nonaktif</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono tracking-wider">{bank.account_number}</div>
                            <div className="text-[11px] text-slate-500">a.n. {bank.account_holder}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={async () => {
                                try {
                                  await api.put(`/admin/payment-settings/${bank.id}`, { is_active: !bank.is_active });
                                  fetchPaymentSettings();
                                } catch (err) {
                                  showAlert('Gagal mengubah status.', 'error');
                                }
                              }}
                              className={`p-2 rounded-xl transition-all border ${
                                bank.is_active 
                                  ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' 
                                  : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
                              }`}
                              title={bank.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                              {bank.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingBank(bank);
                                setBankForm({
                                  bank_name: bank.bank_name,
                                  account_number: bank.account_number,
                                  account_holder: bank.account_holder
                                });
                              }}
                              className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/10"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => {
                                showConfirm('Hapus rekening bank ini? Rekening tidak akan ditampilkan lagi di halaman pembayaran.', async () => {
                                  try {
                                    await api.delete(`/admin/payment-settings/${bank.id}`);
                                    fetchPaymentSettings();
                                    showAlert('Rekening berhasil dihapus.', 'success');
                                  } catch (err) {
                                    showAlert('Gagal menghapus rekening.', 'error');
                                  }
                                }, true);
                              }}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/20"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* QRIS Section */}
              <div className="bg-[#151C21] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 bg-purple-500/10 border-b border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 shadow-inner">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-none">QRIS</h3>
                    <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Upload Gambar QRIS</span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-8 items-start">
                    {/* QRIS Preview */}
                    <div className="flex flex-col items-center gap-4">
                      {(() => {
                        const qrisData = paymentSettings.find(s => s.type === 'qris');
                        if (qrisData?.qris_image) {
                          return (
                            <div className="relative group">
                              <div className="w-full max-w-[280px] bg-white rounded-3xl p-4 shadow-2xl">
                                <img
                                  src={`http://localhost:5000${qrisData.qris_image}`}
                                  alt="QRIS Code"
                                  className="w-full h-auto rounded-2xl"
                                />
                              </div>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all rounded-3xl flex items-center justify-center">
                                <span className="text-white text-sm font-bold">Klik Upload untuk mengganti</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="w-full max-w-[280px] aspect-square bg-white/[0.03] border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400">
                              <QrCode size={32} />
                            </div>
                            <p className="text-slate-500 text-sm text-center px-4">Belum ada QRIS yang diunggah</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Upload Form */}
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                          Upload gambar QRIS Anda untuk ditampilkan sebagai opsi pembayaran di halaman checkout. Format yang didukung: JPG, PNG, WEBP.
                        </p>
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl mb-6">
                          <div className="flex items-start gap-3">
                            <ImageIcon size={16} className="text-purple-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-purple-300 leading-relaxed">
                              Pastikan gambar QRIS jelas dan tidak terpotong. Gambar akan ditampilkan langsung ke pelanggan saat proses pembayaran.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest ml-1">Upload Gambar QRIS</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setQrisUploading(true);
                            try {
                              const formData = new FormData();
                              formData.append('qris_image', file);
                              await api.post('/admin/payment-settings/qris', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              showAlert('QRIS berhasil diperbarui!', 'success');
                              fetchPaymentSettings();
                            } catch (err) {
                              showAlert(err.response?.data?.message || 'Gagal mengunggah QRIS.', 'error');
                            } finally {
                              setQrisUploading(false);
                              e.target.value = '';
                            }
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-all shadow-inner file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
                          disabled={qrisUploading}
                        />
                        {qrisUploading && (
                          <div className="flex items-center gap-2 mt-3 text-purple-400 text-xs">
                            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            Mengunggah gambar QRIS...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== EVENTS TAB ===== */}
          {activeTab === 'events' && (
            <div className="space-y-8 max-w-5xl">
              {/* Create/Edit Event Form */}
              <div className="bg-[#151C21] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 bg-amber-500/10 border-b border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner">
                    <CalendarCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-none">{editingEvent ? 'Edit Event' : 'Buat Event Baru'}</h3>
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Formulir Event</span>
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!eventForm.title.trim()) { showAlert('Judul event wajib diisi.', 'error'); return; }
                  try {
                    if (editingEvent) {
                      await api.put(`/admin/events/${editingEvent.id}`, eventForm);
                      showAlert('Event berhasil diperbarui.', 'success');
                    } else {
                      await api.post('/admin/events', eventForm);
                      showAlert('Event berhasil dibuat.', 'success');
                    }
                    setEventForm({ title: '', description: '', content: '', date: '', location: '' });
                    setEditingEvent(null);
                    fetchAdminEvents();
                  } catch (err) {
                    showAlert(err.response?.data?.message || 'Gagal menyimpan event.', 'error');
                  }
                }} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Judul Event *</label>
                      <input type="text" value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} placeholder="Contoh: Turnamen Padel Cup 2026" required className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Tanggal</label>
                        <input type="date" value={eventForm.date} onChange={(e) => setEventForm({...eventForm, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Lokasi</label>
                        <input type="text" value={eventForm.location} onChange={(e) => setEventForm({...eventForm, location: e.target.value})} placeholder="PadelZone Court" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Deskripsi Singkat</label>
                    <input type="text" value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} placeholder="Ringkasan event yang menarik..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Konten / Artikel</label>
                    <textarea value={eventForm.content} onChange={(e) => setEventForm({...eventForm, content: e.target.value})} placeholder="Tulis detail artikel event di sini..." rows={5} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-all shadow-inner resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 text-sm">
                      {editingEvent ? <><Pencil size={14} /> Update Event</> : <><Plus size={14} /> Buat Event</>}
                    </button>
                    {editingEvent && (
                      <button type="button" onClick={() => { setEditingEvent(null); setEventForm({ title: '', description: '', content: '', date: '', location: '' }); }} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10 text-sm">
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Event List */}
              <div className="bg-[#151C21] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
                      <Layers size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white leading-none">Daftar Event</h3>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{adminEvents.length} Event</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {eventsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : adminEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-white/5 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CalendarCheck size={28} />
                      </div>
                      <p className="text-slate-500 text-sm">Belum ada event yang dibuat.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {adminEvents.map((ev) => (
                        <div key={ev.id} className={`flex flex-col md:flex-row gap-4 p-4 rounded-2xl border transition-all ${ev.is_active ? 'bg-white/[0.03] border-white/5 hover:border-amber-500/30' : 'bg-white/[0.01] border-white/5 opacity-50'}`}>
                          {/* Thumbnail */}
                          <div className="w-full md:w-32 h-24 rounded-xl overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
                            {ev.image ? (
                              <img src={`http://localhost:5000${ev.image}`} alt={ev.title} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={24} className="text-slate-600" />
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-white truncate">{ev.title}</span>
                              {ev.is_active ? (
                                <span className="text-[8px] font-black uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full shrink-0">Aktif</span>
                              ) : (
                                <span className="text-[8px] font-black uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full shrink-0">Nonaktif</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">{ev.description || 'Tanpa deskripsi'}</p>
                            <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                              {ev.date && <span className="flex items-center gap-1"><Calendar size={10} className="text-amber-400" />{new Date(ev.date).toLocaleDateString('id-ID')}</span>}
                              {ev.location && <span className="flex items-center gap-1"><MapPin size={10} className="text-amber-400" />{ev.location}</span>}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Upload Image */}
                            <label className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl transition-all border border-amber-500/20 cursor-pointer" title="Upload Gambar">
                              <ImageIcon size={14} />
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                try {
                                  const formData = new FormData();
                                  formData.append('event_image', file);
                                  await api.post(`/admin/events/${ev.id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                                  showAlert('Gambar event berhasil diunggah.', 'success');
                                  fetchAdminEvents();
                                } catch (err) { showAlert('Gagal mengunggah gambar.', 'error'); }
                                e.target.value = '';
                              }} />
                            </label>
                            <button onClick={async () => { try { await api.put(`/admin/events/${ev.id}`, { is_active: !ev.is_active }); fetchAdminEvents(); } catch (err) { showAlert('Gagal mengubah status.', 'error'); } }} className={`p-2 rounded-xl transition-all border ${ev.is_active ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`} title={ev.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                              {ev.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button onClick={() => { setEditingEvent(ev); setEventForm({ title: ev.title, description: ev.description || '', content: ev.content || '', date: ev.date ? ev.date.split('T')[0] : '', location: ev.location || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/10" title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => { showConfirm('Hapus event ini secara permanen?', async () => { try { await api.delete(`/admin/events/${ev.id}`); fetchAdminEvents(); showAlert('Event berhasil dihapus.', 'success'); } catch (err) { showAlert('Gagal menghapus event.', 'error'); } }, true); }} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/20" title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {['analytics'].includes(activeTab) && (
            <div className="h-full flex items-center justify-center p-20 text-center">
              <div className="max-w-md">
                <div className="w-20 h-20 bg-white/5 text-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Activity size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 capitalize">{activeTab} Page</h3>
                <p className="text-slate-500">Halaman ini sedang dalam proses pengembangan untuk memberikan data yang lebih akurat dan fungsionalitas penuh.</p>
              </div>
            </div>
          )}
        </main>
      </div>


      {/* Close Court Reason Modal */}
      {closeCourtModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A2127] w-full max-w-md rounded-[32px] border border-white/10 p-8 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner mx-auto">
              <XOctagon size={32} />
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-2">Tutup Lapangan</h3>
            <p className="text-slate-500 text-center text-sm mb-8">Tentukan alasan penutupan slot <span className="text-white font-bold">{closeCourtModal.start_time}</span> di <span className="text-white font-bold">{closeCourtModal.court_name}</span>.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Alasan Penutupan</label>
                <input 
                  type="text" 
                  value={closeCourtModal.reason}
                  onChange={(e) => setCloseCourtModal({ ...closeCourtModal, reason: e.target.value })}
                  placeholder="Contoh: Maintenance Lapangan"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-red-500 transition-all text-sm shadow-inner"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setCloseCourtModal({ ...closeCourtModal, show: false })}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleCloseCourt}
                  className="flex-[2] py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-500/20"
                >
                  Tutup Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A2127] w-full max-w-md rounded-[32px] border border-white/10 p-8 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner mx-auto">
              <Ban size={32} />
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-2">Tolak Pembayaran</h3>
            <p className="text-slate-500 text-center text-sm mb-8">Berikan alasan penolakan agar pelanggan mengetahui mengapa pembayarannya ditolak.</p>
            
            <div className="space-y-6">
              {/* Quick Reasons */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest ml-1">Alasan Cepat</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Bukti transfer palsu / tidak valid',
                    'Nominal tidak sesuai',
                    'Bukti transfer buram / tidak jelas',
                    'Transfer ke rekening yang salah',
                    'Duplikasi pembayaran'
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectModal({ ...rejectModal, reason })}
                      className={`px-3 py-1.5 text-[11px] rounded-xl border transition-all ${
                        rejectModal.reason === reason 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30 font-bold' 
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ml-1">Alasan Penolakan</label>
                <textarea 
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="Tuliskan alasan penolakan pembayaran..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-red-500 transition-all text-sm shadow-inner resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setRejectModal({ show: false, bookingId: null, reason: '' })}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleRejectPayment}
                  disabled={!rejectModal.reason.trim()}
                  className="flex-[2] py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tolak Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
