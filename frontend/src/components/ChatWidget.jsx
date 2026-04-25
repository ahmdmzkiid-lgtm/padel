import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Headset, Loader, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { useModal } from '../context/ModalContext';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const scrollRef = useRef(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (user && !user.is_admin) {
      socket.emit('join', `user_${user.id}`);
    }

    const handleNewMessage = (msg) => {
      setChatHistory(prev => [...prev, msg]);
    };

    socket.on('new_chat_message', handleNewMessage);

    return () => {
      socket.off('new_chat_message');
    };
  }, [user]);

  // Fetch chat history once when widget is opened
  useEffect(() => {
    if (isOpen && user && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchHistory();
    }
  }, [isOpen, user]);

  // Reset fetched flag when widget closes so it refetches on next open
  useEffect(() => {
    if (!isOpen) {
      hasFetchedRef.current = false;
    }
  }, [isOpen]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/chat/history/${user.id}`);
      setChatHistory(res.data.messages);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndChat = () => {
    showConfirm('Anda yakin ingin mengakhiri sesi ini? Riwayat percakapan akan dihapus.', async () => {
      try {
        await api.delete(`/chat/history/${user.id}`);
        setChatHistory([]);
        setIsOpen(false);
        showAlert('Sesi percakapan berhasil diakhiri.', 'success');
      } catch (err) {
        console.error('Failed to end chat:', err);
        showAlert('Gagal mengakhiri percakapan.', 'error');
      }
    }, true); // isDanger = true
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    const data = {
      sender_id: user.id,
      message: message.trim()
    };

    socket.emit('send_message', data);
    
    // Optimistic update
    setChatHistory(prev => [...prev, { 
      message: message.trim(), 
      is_admin_sender: false, 
      created_at: new Date().toISOString() 
    }]);
    
    setMessage('');
  };

  if (!user || user.is_admin) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[350px] sm:w-[400px] h-[500px] max-h-[calc(100vh-120px)] bg-[#151C21] rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-primary to-accent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <Headset size={20} />
              </div>
              <div>
                <div className="font-bold text-white text-[13px]">Customer Service</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[9px] text-white/70 uppercase font-bold tracking-widest">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatHistory.length > 0 && (
                <button 
                  onClick={handleEndChat} 
                  title="Akhiri Sesi"
                  className="p-2 hover:bg-red-500/80 rounded-lg text-white transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                <Loader size={18} className="animate-spin" />
                <span className="text-sm">Memuat percakapan...</span>
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                  <MessageCircle size={32} className="text-slate-500" />
                </div>
                <p className="text-slate-500 text-[13px] italic">Halo! Ada yang bisa kami bantu? Silakan kirim pesan di bawah.</p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.is_admin_sender ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-[13px] ${
                    msg.is_admin_sender 
                      ? 'bg-white/5 text-slate-300 border border-white/5 rounded-tl-none' 
                      : 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10'
                  }`}>
                    {msg.message}
                    <div className={`text-[9px] mt-1.5 ${msg.is_admin_sender ? 'text-slate-500' : 'text-white/60'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={scrollRef} />
          </div>

          {/* Quick Replies */}
          <div className="px-4 py-3 bg-black/20 flex gap-2 overflow-x-auto custom-scrollbar border-t border-white/5">
            {['Cek harga sewa', 'Jadwal kosong hari ini', 'Cara jadi member', 'Info fasilitas'].map((template, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMessage(template)}
                className="whitespace-nowrap px-3 py-1.5 bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/30 rounded-full text-[11px] text-slate-300 transition-all"
              >
                {template}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 bg-black/20 border-t border-white/5 flex gap-2">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis pesan..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-primary transition-all"
            />
            <button 
              type="submit"
              disabled={!message.trim()}
              className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-light transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 hover:-translate-y-2 z-50 ${
          isOpen ? 'bg-white/10 text-white border border-white/10' : 'bg-primary text-white shadow-primary/30'
        }`}
      >
        {isOpen ? <X size={24} /> : <Headset size={28} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-dark flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
            !
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
