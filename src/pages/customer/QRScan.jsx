import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { useCartStore } from '../../store/cartStore';
import { toast } from 'sonner';
import { Store, QrCode } from 'lucide-react';

export default function QRScan() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || searchParams.get('qr');
  const branchFromUrl = searchParams.get('branch') || searchParams.get('branchId');

  const [qrCode, setQrCode] = useState(tokenFromUrl || 'table_qr_1');
  const [branchId, setBranchId] = useState(branchFromUrl ? Number(branchFromUrl) : 1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const currentSessionToken = useSessionStore((state) => state.sessionToken);
  const clearCart = useCartStore((state) => state.clearCart);

  // Dynamic branches query
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches').then(res => res.data || res),
  });
  const branches = Array.isArray(branchesData) 
    ? branchesData 
    : (Array.isArray(branchesData?.data) ? branchesData.data : []);

  // Dynamic tables query
  const { data: tablesData } = useQuery({
    queryKey: ['tables', branchId],
    queryFn: () => apiClient.get(`/tables?branchId=${branchId}`).then(res => res.data || res),
    enabled: !!branchId
  });
  const tables = Array.isArray(tablesData) ? tablesData : [];

  // Update default qrCode when tables load
  useEffect(() => {
    if (tables.length > 0 && !tokenFromUrl) {
      setQrCode(tables[0].QRCode || 'table_qr_1');
    }
  }, [tables, tokenFromUrl]);

  const executeScan = async (codeToUse, branchToUse) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/sessions/qr-scan', { 
        qrCode: codeToUse, 
        branchId: Number(branchToUse) 
      });
      const { sessionId, sessionToken, joinCode, status, table } = res.data.data || res.data;
      
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
        branchId: Number(branchToUse)
      });
      
      toast.success(`Đã nhận diện Bàn ${table?.tableName || ''}!`);
      navigate('/customer/join');
    } catch (err) {
      toast.error(err.message || 'Lỗi quét QR');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto scan if scanned from real physical QR code link
  useEffect(() => {
    if (tokenFromUrl) {
      executeScan(tokenFromUrl, branchFromUrl || 1);
    }
  }, [tokenFromUrl, branchFromUrl]);

  const handleScan = (e) => {
    e.preventDefault();
    executeScan(qrCode, branchId);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-page relative p-6 justify-center items-center">
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl p-8 border border-border">
        <div className="w-16 h-16 bg-primary-subtle text-primary rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <QrCode size={32} />
        </div>
        
        <h2 className="text-[24px] font-extrabold text-text-primary text-center tracking-tight mb-2">
          {tokenFromUrl ? 'Đang nhận diện bàn...' : 'Quét QR Bàn Ăn'}
        </h2>
        <p className="text-[13px] text-text-secondary text-center mb-8">
          {tokenFromUrl 
            ? 'Vui lòng chờ trong giây lát hệ thống đang mở bàn cho bạn...'
            : 'Chọn cơ sở và bàn để mô phỏng quét mã QR tại bàn.'}
        </p>

        {!tokenFromUrl && (
          <form onSubmit={handleScan} className="space-y-6">
            <div>
              <label className="block text-[12px] font-bold text-text-tertiary uppercase tracking-wider mb-2">
                Chi nhánh
              </label>
              <select 
                value={branchId} 
                onChange={(e) => setBranchId(Number(e.target.value))}
                className="w-full p-4 border border-border rounded-xl bg-bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 text-[14px] font-medium"
              >
                {branches.length > 0 ? (
                  branches.map(b => (
                    <option key={b.BranchID} value={b.BranchID}>
                      {b.Name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">BBQ KLTN - Hồ Chí Minh</option>
                    <option value="2">BBQ KLTN - Hà Nội</option>
                    <option value="3">BBQ KLTN - Đà Nẵng</option>
                  </>
                )}
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
                {tables.length > 0 ? (
                  tables.map(t => (
                    <option key={t.TableID} value={t.QRCode || `table_qr_${t.TableID}`}>
                      {t.Name} ({t.AreaName})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="table_qr_1">Bàn T1-01 (Tầng 1)</option>
                    <option value="table_qr_2">Bàn T1-02 (Tầng 1)</option>
                    <option value="table_qr_3">Bàn VIP-01 (Khu VIP)</option>
                  </>
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
        )}
      </div>
    </div>
  );
}
