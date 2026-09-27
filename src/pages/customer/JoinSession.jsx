import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';

export default function JoinSession() {
  const { sessionToken, joinCode, branchId, table, setSession } = useSessionStore();
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (!sessionToken && !joinCode) {
    navigate('/customer/qr');
    return null;
  }

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }
    
    setIsLoading(true);
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
      
      // If waiting, show waiting screen. If open, go to menu.
      const currentStatus = useSessionStore.getState().status;
      if (currentStatus === 0) {
         // Should stay here or go to waiting page.
         // Since customer menu is open, we can go to menu and show "WAITING" banner there.
      }
      navigate('/customer/menu');
    } catch (err) {
      toast.error(err.message || 'Không thể tham gia bàn');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-center">Chào mừng đến BBQ KLTN</h2>
        
        {table && (
          <div className="bg-orange-50 p-4 rounded-xl mb-6 text-center">
            <p className="text-orange-800 font-semibold text-lg">{table.tableName}</p>
            <p className="text-orange-600 text-sm">{table.areaName}</p>
          </div>
        )}
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Tên của bạn</label>
            <input 
              type="text" 
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-colors"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl mt-2 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center"
          >
            {isLoading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : 'Vào Bàn'}
          </button>
        </form>
      </div>
    </div>
  );
}
