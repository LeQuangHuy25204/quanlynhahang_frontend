import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { useCartStore } from '../../store/cartStore';
import { toast } from 'sonner';
import { Store, User } from 'lucide-react';

export default function QRScan() {
  const [qrCode, setQrCode] = useState('table_qr_1'); // Default for demo
  const [branchId, setBranchId] = useState(1);
  const [guestCount, setGuestCount] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const currentSessionToken = useSessionStore((state) => state.sessionToken);
  const clearCart = useCartStore((state) => state.clearCart);

  const handleScan = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // In real life, guestCount would be sent here or in a separate step.
      // We will send it in a later step if needed, or pass it to qr-scan.
      // Currently backend qr-scan doesn't take guestCount, but we can pass it to join if we want.
      const res = await apiClient.post('/sessions/qr-scan', { qrCode, branchId: Number(branchId) });
      const { isNew, sessionId, sessionToken, joinCode, status, table } = res.data.data || res.data;
      
      // If the session changed or it's a new scan, clear old participant data and cart
      if (currentSessionToken !== sessionToken) {
        setSession({ participantId: null, guestName: null });
        clearCart();
      }

      setSession({
        sessionId,
        sessionToken,
        joinCode,
        status,
        table,
        branchId: Number(branchId)
      });
      
      navigate('/customer/join');
    } catch (err) {
      toast.error(err.message || 'Lỗi quét QR');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-page relative p-6 justify-center items-center">
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl p-8 border border-border">
        <div className="w-16 h-16 bg-primary-subtle text-primary rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <Store size={32} />
        </div>
        
        <h2 className="text-[24px] font-extrabold text-text-primary text-center tracking-tight mb-2">
          Demo Chọn Bàn
        </h2>
        <p className="text-[13px] text-text-secondary text-center mb-8">
          Do chưa triển khai quét mã QR thực tế, vui lòng chọn thủ công chi nhánh và bàn bạn muốn ngồi.
        </p>

        <form onSubmit={handleScan} className="space-y-6">
          <div>
            <label className="block text-[12px] font-bold text-text-tertiary uppercase tracking-wider mb-2">
              Chi nhánh
            </label>
            <select 
              value={branchId} 
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full p-4 border border-border rounded-xl bg-bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 text-[14px] font-medium"
            >
              <option value="1">Chi nhánh Quận 1</option>
              <option value="2">Chi nhánh Quận 3</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-text-tertiary uppercase tracking-wider mb-2">
              Chọn Bàn
            </label>
            <select 
              value={qrCode} 
              onChange={(e) => setQrCode(e.target.value)}
              className="w-full p-4 border border-border rounded-xl bg-bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 text-[14px] font-medium"
            >
              {branchId == 1 ? (
                <>
                  <option value="table_qr_1">Bàn T1-01</option>
                  <option value="table_qr_2">Bàn T1-02</option>
                  <option value="table_qr_3">Bàn VIP-01</option>
                </>
              ) : (
                <option value="table_qr_4">Bàn V-01</option>
              )}
            </select>
          </div>
          
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/30"
            >
              {isLoading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : 'Mô phỏng vào bàn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
