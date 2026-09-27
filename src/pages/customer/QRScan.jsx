import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { QrCode, ScanLine } from 'lucide-react';

export default function QRScan() {
  const [qrCode, setQrCode] = useState('table_qr_1');
  const [branchId, setBranchId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  const handleScan = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiClient.post('/sessions/qr-scan', { qrCode, branchId: Number(branchId) });
      const { isNew, sessionId, sessionToken, joinCode, status, table } = res.data;
      
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
    <div className="p-6 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
        <ScanLine size={48} />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">Quét QR tại bàn</h2>
      <p className="text-gray-500 text-center mb-8 text-sm">Demo: Chọn QR bàn và chi nhánh để bắt đầu</p>

      <form onSubmit={handleScan} className="w-full max-w-xs space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mã QR Bàn</label>
          <select 
            value={qrCode} 
            onChange={(e) => setQrCode(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="table_qr_1">Bàn T1-01 (Chi nhánh 1)</option>
            <option value="table_qr_2">Bàn T1-02 (Chi nhánh 1)</option>
            <option value="table_qr_3">Bàn VIP-01 (Chi nhánh 1)</option>
            <option value="table_qr_4">Bàn V-01 (Chi nhánh 2)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Chi nhánh</label>
          <select 
            value={branchId} 
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="1">Chi nhánh Quận 1</option>
            <option value="2">Chi nhánh Quận 3</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {isLoading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <QrCode size={20} />}
          {isLoading ? 'Đang xử lý...' : 'Mô phỏng Quét QR'}
        </button>
      </form>
    </div>
  );
}
