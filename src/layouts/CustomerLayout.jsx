import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import { useCartStore } from '../store/cartStore';
import { UtensilsCrossed, ShoppingCart, Receipt, Home, KeyRound, Copy, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { toast } from 'sonner';

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    table,
    guestName,
    status,
    sessionToken,
    participantId,
    sessionId,
    joinCode,
    participants,
    setSession,
    clearSession,
  } = useSessionStore();
  const cartItems = useCartStore((state) => state.items);
  
  const isQrPage = location.pathname.includes('/qr') || location.pathname.includes('/join');

  // Verify session validity & sync status / joinCode / participants
  useQuery({
    queryKey: ['verifySession', sessionId, participantId],
    queryFn: async () => {
      if (!sessionId || isQrPage) return null;
      try {
        const res = await apiClient.get(`/sessions/${sessionId}?participantId=${participantId || ''}`);
        const sessionData = res.data || res;
        if (sessionData.Status === 2) {
          // Session is closed
          clearSession();
          navigate('/customer/qr');
          return sessionData;
        }
        setSession({
          status: sessionData.Status,
          joinCode: sessionData.JoinCode || joinCode,
          participantCount: sessionData.participantCount || 0,
          participants: sessionData.participants || [],
        });
        return sessionData;
      } catch (err) {
        // Session not found or invalid
        clearSession();
        navigate('/customer/qr');
        return null;
      }
    },
    enabled: !!sessionId && !isQrPage,
    refetchInterval: 5000,
  });

  React.useEffect(() => {
    if (!isQrPage) {
      if (!sessionId) {
        navigate('/customer/qr');
      } else if (!participantId) {
        navigate('/customer/join');
      }
    }
  }, [isQrPage, sessionId, participantId, navigate]);

  const handleCopyJoinCode = () => {
    if (!joinCode) return;
    navigator.clipboard?.writeText(joinCode);
    toast.success(`Đã sao chép Mã tham gia: ${joinCode}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mx-auto max-w-md shadow-2xl relative">
      {/* Header */}
      {!isQrPage && (
        <header className="glass px-5 py-3 sticky top-0 z-50 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-extrabold text-xl text-primary flex items-center gap-2 tracking-tight">
                <UtensilsCrossed size={22} strokeWidth={2.5} />
                BBQ KLTN
              </h1>
              {table && <p className="text-xs text-gray-500 font-medium mt-0.5">{table.tableName} • {table.areaName}</p>}
            </div>
            <div className="text-right flex flex-col items-end justify-center">
              {guestName && <p className="text-sm font-bold text-gray-800">{guestName}</p>}
              <div className={`mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                status === 0 ? 'bg-yellow-100 text-yellow-700' : status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status === 0 ? 'bg-yellow-500 animate-pulse' : status === 1 ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                {status === 0 ? 'Chờ mở bàn' : status === 1 ? 'Đang phục vụ' : 'Đã đóng'}
              </div>
            </div>
          </div>

          {/* Hiển thị Mã tham gia của bàn khi bàn đã được mở (status === 1) */}
          {status === 1 && joinCode && (
            <div className="mt-2.5 pt-2.5 border-t border-gray-200/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Users size={14} className="text-primary shrink-0" />
                <span className="truncate max-w-[170px]" title={participants?.map(p => p.GuestName).join(', ')}>
                  {participants?.length > 0
                    ? `${participants.length} khách: ${participants.map(p => p.GuestName).join(', ')}`
                    : 'Mã mời bạn cùng bàn:'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyJoinCode}
                className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/30 text-primary px-2.5 py-1 rounded-lg transition-all active:scale-95"
                title="Bấm để sao chép Mã tham gia bàn"
              >
                <KeyRound size={12} />
                <span className="text-[11px] font-semibold">Mã bàn:</span>
                <span className="font-mono font-black text-[13px] tracking-wider">{joinCode}</span>
                <Copy size={11} className="opacity-75" />
              </button>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 relative no-scrollbar">
        <Outlet />
      </main>

      {/* Bottom Navigation - Floating Pill */}
      {!isQrPage && status === 1 && (
        <div className="fixed bottom-6 left-0 right-0 w-full max-w-md mx-auto px-6 z-50">
          <nav className="glass rounded-full border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex justify-between px-2 py-2">
            <NavItem 
              icon={<Home size={22} />} 
              label="Thực đơn" 
              active={location.pathname === '/customer/menu'} 
              onClick={() => navigate('/customer/menu')} 
            />
            <NavItem 
              icon={<Receipt size={22} />} 
              label="Đã gọi" 
              active={location.pathname === '/customer/tracking'} 
              onClick={() => navigate('/customer/tracking')} 
            />
            <NavItem 
              icon={
                <div className="relative">
                  <ShoppingCart size={22} />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-sm animate-in zoom-in">
                      {cartItems.length}
                    </span>
                  )}
                </div>
              } 
              label="Giỏ hàng" 
              active={location.pathname === '/customer/cart'} 
              onClick={() => navigate('/customer/cart')} 
            />
          </nav>
        </div>
      )}
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`relative flex flex-col items-center justify-center w-20 py-2 rounded-full transition-all duration-300 active:scale-95 ${
      active ? 'text-primary' : 'text-gray-500 hover:text-gray-800'
    }`}
  >
    {active && (
      <div className="absolute inset-0 bg-primary/10 rounded-full transition-all duration-300"></div>
    )}
    <div className={`relative z-10 transition-transform duration-300 ${active ? '-translate-y-0.5' : ''}`}>
      {icon}
    </div>
    <span className={`text-[10px] mt-1 relative z-10 transition-all duration-300 ${active ? 'font-bold opacity-100' : 'font-medium opacity-70'}`}>
      {label}
    </span>
  </button>
);
