import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { RefreshCcw, Check, Flame, X, Scale } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderBoard() {
  const { staff } = useAuthStore();
  const [filter, setFilter] = useState('all'); // all, new, cooking
  
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

  const handleCancel = async (orderLineId) => {
    const reason = prompt('Lý do hủy món:');
    if (reason === null) return;
    try {
      await apiClient.patch(`/orders/lines/${orderLineId}/cancel`, { cancelReason: reason || 'Hết món' });
      toast.success('Đã hủy món');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Không thể hủy món này');
    }
  };

  if (isLoading && !isRefetching) return <div className="p-10 text-center text-gray-500">Đang tải dữ liệu bếp...</div>;

  // Extract all lines from all orders, flatten, sort by time (oldest first for kitchen)
  let allLines = [];
  orders.forEach(order => {
    order.lines.forEach(line => {
      allLines.push({
        ...line,
        OrderNumber: order.OrderNumber,
        TableName: order.TableName,
        CreatedAt: order.CreatedAt,
      });
    });
  });
  
  // Sort oldest first
  allLines.sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));

  if (filter === 'new') allLines = allLines.filter(l => l.Status === 0 || l.Status === 1); // wait confirm, wait weigh
  if (filter === 'cooking') allLines = allLines.filter(l => l.Status === 2 || l.Status === 4); // confirmed, cooking
  // filter out cancelled lines by default unless viewing all maybe? Keep them out to avoid clutter, or filter out
  if (filter !== 'all') allLines = allLines.filter(l => l.Status !== 3);

  const statusColors = {
    0: 'bg-yellow-100 text-yellow-800',
    1: 'bg-purple-100 text-purple-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-red-100 text-red-800',
    4: 'bg-orange-100 text-orange-800',
  };
  const statusTexts = {
    0: 'Mới', 1: 'Chờ Cân', 2: 'Đã xác nhận', 3: 'Đã hủy', 4: 'Đang nấu'
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Tiếp nhận món</h1>
        
        <div className="flex items-center gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="p-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-primary"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="new">Món mới & Chờ cân</option>
            <option value="cooking">Đang xử lý / Bếp</option>
          </select>
          <button onClick={() => refetch()} className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-primary transition-colors">
            <RefreshCcw size={18} className={isRefetching ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allLines.map(line => (
          <div key={line.OrderLineID} className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border p-4 ${line.Status === 3 ? 'opacity-60 grayscale' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-extrabold text-lg text-primary">{line.TableName}</span>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5 tracking-wider">{line.OrderNumber}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors[line.Status]}`}>
                {statusTexts[line.Status]}
              </span>
            </div>
            
            <div className="mb-4 min-h-[48px]">
              <h3 className="font-bold text-gray-800 leading-snug">{line.MenuItemName}</h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                  SL: {Number(line.Quantity)} {Number(line.Quantity) === 0 ? '?' : ''}
                </span>
                <span className="text-xs text-gray-400 font-medium">{format(new Date(line.CreatedAt), 'HH:mm')}</span>
              </div>
              {line.Note && <p className="text-sm text-red-500 font-medium mt-2 bg-red-50 p-2 rounded-lg">Note: {line.Note}</p>}
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
              {line.Status === 0 && ( // Mới -> Xác nhận
                <button onClick={() => handleUpdateStatus(line.OrderLineID, 2)} className="flex-1 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-600 active:scale-95 transition-all"><Check size={16}/> Xác nhận</button>
              )}
              {line.Status === 1 && ( // Chờ cân -> Nhập TL -> Bếp
                <button onClick={() => handleWeightInput(line.OrderLineID)} className="flex-1 py-2 bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-purple-600 active:scale-95 transition-all"><Scale size={16}/> Cân</button>
              )}
              {line.Status === 2 && ( // Đã XN -> Nấu
                <button onClick={() => handleUpdateStatus(line.OrderLineID, 4)} className="flex-1 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-orange-600 active:scale-95 transition-all"><Flame size={16}/> Báo Bếp</button>
              )}
              {line.Status !== 3 && line.Status !== 4 && ( // Hủy
                <button onClick={() => handleCancel(line.OrderLineID)} className="py-2 px-3.5 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 active:scale-95 transition-all"><X size={16}/></button>
              )}
            </div>
          </div>
        ))}
        
        {allLines.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-400 border-2 border-dashed rounded-xl border-gray-200">
            Không có món ăn nào trong danh sách.
          </div>
        )}
      </div>
    </div>
  );
}
