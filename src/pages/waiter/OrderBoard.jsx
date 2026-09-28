import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function OrderBoard() {
  const { staff } = useAuthStore();
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // update timestamps every min
    return () => clearInterval(timer);
  }, []);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['staffOrders', staff?.branchId],
    queryFn: () => apiClient.get(`/orders?branchId=${staff?.branchId}`).then(res => res.data),
    refetchInterval: 10000,
  });

  const handleUpdateStatus = async (orderLineId, status) => {
    try {
      await apiClient.put(`/orders/lines/${orderLineId}/status`, { status });
      toast.success('Đã cập nhật trạng thái');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleWeightInput = async (orderLineId) => {
    const weight = prompt('Nhập khối lượng thực tế (kg):', '1.0');
    if (!weight) return;
    if (isNaN(Number(weight)) || Number(weight) <= 0) {
      toast.error('Khối lượng không hợp lệ');
      return;
    }
    
    try {
      await apiClient.put(`/orders/lines/${orderLineId}/weight`, { quantity: Number(weight) });
      toast.success('Đã cập nhật khối lượng');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật khối lượng');
    }
  };

  if (isLoading && !isRefetching) return <div className="p-10 text-center text-text-tertiary">Đang tải dữ liệu bếp...</div>;

  let allLines = [];
  orders.forEach(order => {
    order.lines.forEach(line => {
      // Exclude cancelled items from board
      if (line.Status !== 3) {
        allLines.push({
          ...line,
          OrderNumber: order.OrderNumber,
          TableName: order.TableName,
          CreatedAt: order.CreatedAt,
        });
      }
    });
  });
  
  allLines.sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));

  const getTimeText = (dateString) => {
    const diff = formatDistanceToNowStrict(new Date(dateString), { locale: vi, addSuffix: false });
    if (diff.includes('giây')) return 'vừa xong';
    return diff.replace('phút', 'phút').replace('giờ', 'giờ');
  };

  // 0: New, 1: Wait weigh -> Chờ xác nhận
  const pendingLines = allLines.filter(l => l.Status === 0 || l.Status === 1);
  // 2: Confirmed, 4: Cooking -> Đang chế biến
  const cookingLines = allLines.filter(l => l.Status === 2 || l.Status === 4);
  // 5: Ready to serve -> Sẵn sàng phục vụ (Assuming status 5 is Ready, we use it. If not, maybe use status 4 for ready? Let's use 5 as Ready and 6 as Served)
  const readyLines = allLines.filter(l => l.Status === 5);

  return (
    <div className="h-full flex flex-col p-4 bg-bg-page overflow-hidden">
      <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-4">
        
        {/* CỘT 1: CHỜ XÁC NHẬN */}
        <div className="flex-1 min-w-[320px] bg-white rounded-[20px] border border-border flex flex-col shadow-sm">
          <div className="p-5 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div>
              <h2 className="text-[15px] font-extrabold text-text-primary">Chờ xác nhận</h2>
            </div>
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-text-secondary">
              {pendingLines.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {pendingLines.map(line => (
              <div key={line.OrderLineID} className={`bg-white border-[1.5px] rounded-[16px] p-5 shadow-sm relative ${line.Status === 1 ? 'border-[#f97316]/30' : 'border-border'}`}>
                
                {line.Status === 1 && (
                  <div className="absolute top-4 left-5 flex items-center gap-1.5 text-[11px] font-bold text-[#f97316]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></div>
                    Chờ cân
                  </div>
                )}
                
                <div className="flex justify-between items-end mb-4 pt-1">
                  <span className={`font-bold text-[14px] ${line.Status === 1 ? 'mt-4' : ''} text-text-primary`}>Bàn {line.TableName}</span>
                  <span className="text-[12px] font-medium text-text-tertiary">
                    {getTimeText(line.CreatedAt)}
                  </span>
                </div>
                
                <div className="mb-5">
                  <h3 className="font-extrabold text-[16px] text-text-primary leading-snug">
                    {Number(line.Quantity) > 0 ? Number(line.Quantity) : '?'}× {line.MenuItemName}
                  </h3>
                  
                  {line.Status === 1 && (
                    <p className="text-[12px] font-medium text-[#f97316] mt-1.5">Món theo cân - cần cân trước khi gửi bếp</p>
                  )}
                  {line.Note && (
                    <p className="text-[12px] font-medium text-text-secondary mt-1.5">{line.Note}</p>
                  )}
                </div>

                {line.Status === 1 ? (
                  <button 
                    onClick={() => handleWeightInput(line.OrderLineID)}
                    className="w-full py-3 bg-[#f97316] hover:bg-[#ea580c] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Nhập số cân
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateStatus(line.OrderLineID, 2)}
                    className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Xác nhận
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CỘT 2: ĐANG CHẾ BIẾN */}
        <div className="flex-1 min-w-[320px] bg-white rounded-[20px] border border-border flex flex-col shadow-sm">
          <div className="p-5 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div>
              <h2 className="text-[15px] font-extrabold text-text-primary">Đang chế biến</h2>
            </div>
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-text-secondary">
              {cookingLines.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cookingLines.map(line => (
              <div key={line.OrderLineID} className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
                
                <div className="flex justify-between items-end mb-4">
                  <span className="font-bold text-[14px] text-text-primary">Bàn {line.TableName}</span>
                  <span className="text-[12px] font-medium text-text-tertiary">
                    {getTimeText(line.CreatedAt)}
                  </span>
                </div>
                
                <div className="mb-5">
                  <h3 className="font-extrabold text-[16px] text-text-primary leading-snug">
                    {Number(line.Quantity)}× {line.MenuItemName}
                  </h3>
                  {line.Note && (
                    <p className="text-[12px] font-medium text-text-secondary mt-1.5">{line.Note}</p>
                  )}
                </div>

                <button 
                  onClick={() => handleUpdateStatus(line.OrderLineID, 5)}
                  className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Đánh dấu xong
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CỘT 3: SẴN SÀNG PHỤC VỤ */}
        <div className="flex-1 min-w-[320px] bg-bg-page rounded-[20px] border border-border flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
              <h2 className="text-[15px] font-extrabold text-text-primary">Sẵn sàng phục vụ</h2>
            </div>
            <span className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center text-[11px] font-bold text-text-secondary">
              {readyLines.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {readyLines.map(line => (
              <div key={line.OrderLineID} className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
                
                <div className="flex justify-between items-end mb-4">
                  <span className="font-bold text-[14px] text-text-primary">Bàn {line.TableName}</span>
                  <span className="text-[12px] font-medium text-text-tertiary">xong</span>
                </div>
                
                <div className="mb-5">
                  <h3 className="font-extrabold text-[16px] text-text-primary leading-snug">
                    {Number(line.Quantity)}× {line.MenuItemName}
                  </h3>
                  {line.Note && (
                    <p className="text-[12px] font-medium text-text-secondary mt-1.5">{line.Note}</p>
                  )}
                </div>

                <button 
                  onClick={() => handleUpdateStatus(line.OrderLineID, 6)}
                  className="w-full py-3 bg-transparent border-2 border-[#10b981] text-[#10b981] hover:bg-[#10b981]/5 text-[13px] font-bold rounded-xl transition-all active:scale-95"
                >
                  Đã phục vụ
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
