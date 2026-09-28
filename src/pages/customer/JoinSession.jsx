import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { useQuery } from '@tanstack/react-query';
import { Clock, Menu as MenuIcon, User } from 'lucide-react';
import { toast } from 'sonner';

export default function JoinSession() {
  const { sessionId, sessionToken, status, table, branchId, participantId, setSession } = useSessionStore();
  const navigate = useNavigate();
  const [guestCount, setGuestCount] = useState(2);
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll session status every 3 seconds if status is 0
  useQuery({
    queryKey: ['sessionStatus', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await apiClient.get(`/sessions/${sessionId}`);
      const sessionData = res.data.data || res.data;
      if (sessionData.Status === 1 && participantId) {
        // Table opened! Update store and navigate
        setSession({ status: 1 });
        navigate('/customer/menu');
      }
      return sessionData;
    },
    refetchInterval: status === 0 ? 3000 : false, // Poll only if pending
    enabled: status === 0,
  });

  useEffect(() => {
    if (status === 1 && participantId) {
      navigate('/customer/menu');
    }
  }, [status, participantId, navigate]);

  if (!sessionToken) {
    navigate('/customer/qr');
    return null;
  }

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/sessions/join', {
        sessionCode: sessionToken,
        guestName: guestName.trim(),
        branchId
      });
      
      setSession({
        participantId: res.data.participantId,
        guestName: res.data.guestName
      });
      // Now participantId is set. 
      // If status is 1 (open), the useEffect will redirect to menu.
      // If status is 0, it will render the Waiting UI.
    } catch (err) {
      toast.error(err.message || 'Không thể tham gia bàn');
    } finally {
      setIsSubmitting(false);
    }
  };

  // State 1: Need to join
  if (!participantId) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-page relative">
        {/* Top Orange Header */}
        <div className="bg-primary pt-12 pb-24 px-6 flex flex-col items-center text-white relative">
          <div className="w-16 h-16 bg-white text-primary rounded-2xl flex items-center justify-center font-bold text-3xl mb-4 shadow-lg">
            B
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Nhà hàng BBQ KLTN</h1>
          <p className="text-white/80 font-medium text-[13px] mt-1">Chi nhánh Quận 1</p>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 px-6 -mt-16 z-10">
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-border mb-8">
            <div className="text-center mb-8">
              <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest mb-1">BẠN ĐANG NGỒI TẠI</p>
              <h2 className="text-[40px] font-black text-primary leading-none">{table?.tableName || '...'}</h2>
              <p className="text-[13px] text-text-secondary mt-2">Thực đơn sẽ được ghi theo phiên của bàn này</p>
            </div>

            <form onSubmit={handleJoin}>
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-widest text-center mb-4">
                  SỐ LƯỢNG KHÁCH
                </label>
                <div className="flex justify-between gap-3">
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGuestCount(num)}
                      className={`flex-1 aspect-square rounded-2xl flex items-center justify-center text-xl font-bold transition-all ${
                        guestCount === num 
                          ? 'bg-primary-subtle text-primary border-2 border-primary' 
                          : 'bg-bg-page border border-border text-text-secondary hover:bg-gray-50'
                      }`}
                    >
                      {num}{num === 4 ? '+' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-widest text-center mb-4">
                  TÊN CỦA BẠN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-tertiary">
                    <User size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="VD: Anh Minh..."
                    className="w-full pl-11 p-4 border border-border rounded-xl bg-bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors font-medium text-[15px]"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 shadow-md shadow-primary/30"
              >
                {isSubmitting ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : null}
                {isSubmitting ? 'Đang gửi...' : (status === 1 ? 'Vào bàn ngay' : 'Gửi yêu cầu mở bàn')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Joined (Waiting for staff)
  return (
    <div className="flex flex-col min-h-screen bg-bg-page relative p-6 justify-center items-center">
      {/* Decorative pulse */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-primary/10 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>

      <div className="relative z-10 flex flex-col items-center mb-16">
        <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 mb-8">
          <Clock size={40} className="animate-pulse" />
        </div>
        
        <h2 className="text-[24px] font-extrabold text-text-primary mb-3 text-center">
          Đang chờ nhân viên<br/>xác nhận
        </h2>
        
        <p className="text-[14px] text-text-secondary text-center max-w-[280px] leading-relaxed">
          Bạn đã quét mã QR của Bàn {table?.tableName || '...'} Nhân viên sẽ mở bàn trong giây lát để bạn bắt đầu gọi món.
        </p>

        <div className="flex gap-1 mt-6">
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      <div className="w-full max-w-[320px] bg-white border border-border rounded-2xl p-4 shadow-sm flex items-center gap-3 relative z-10 mb-8">
        <div className="w-10 h-10 bg-primary-subtle text-primary rounded-xl flex items-center justify-center font-bold text-lg">
          B
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-text-primary">BBQ KLTN - Chi nhánh Quận 1</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Bàn {table?.tableName || '...'} · Mã phiên #{sessionId || '...'}
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex justify-center z-10">
        <button 
          onClick={() => navigate('/customer/menu')}
          className="w-full max-w-[320px] bg-white border-2 border-primary text-primary hover:bg-primary-subtle font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <MenuIcon size={18} /> Xem trước thực đơn
        </button>
      </div>
    </div>
  );
}
