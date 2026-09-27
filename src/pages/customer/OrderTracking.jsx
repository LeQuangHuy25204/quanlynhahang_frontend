import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { Clock, RefreshCcw, CheckCircle, Flame, XCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderTracking() {
  const { sessionToken } = useSessionStore();
  const navigate = useNavigate();
  const [isRequesting, setIsRequesting] = useState(false);

  const { data: order, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orderTracking', sessionToken],
    queryFn: () => apiClient.get(`/orders/session/${sessionToken}`).then(res => res.data),
    refetchInterval: 10000, // auto refresh every 10s
    enabled: !!sessionToken
  });

  if (isLoading && !isRefetching) {
    return <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-3 mt-20"><RefreshCcw className="animate-spin text-primary" /> Đang tải dữ liệu...</div>;
  }

  if (!order || !order.lines || order.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 mt-20">
        <FileText size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 mb-6 text-center">Bạn chưa gọi món nào.</p>
        <button onClick={() => navigate('/customer/menu')} className="px-6 py-2 bg-primary/10 text-primary font-medium rounded-full">
          Xem thực đơn
        </button>
      </div>
    );
  }

  const handleRequestPayment = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn gọi thanh toán?')) return;
    setIsRequesting(true);
    try {
      await apiClient.post(`/orders/${order.OrderID}/request-payment`, { sessionToken });
      toast.success('Đã gửi yêu cầu thanh toán.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Lỗi yêu cầu thanh toán');
    } finally {
      setIsRequesting(false);
    }
  };

  const calculateTotal = () => {
    return order.lines.reduce((total, line) => {
      if (line.Status === 3) return total; // Exclude cancelled
      return total + (Number(line.Quantity) * Number(line.UnitPrice));
    }, 0);
  };

  // Group lines by status roughly
  const statusColors = {
    0: 'bg-yellow-100 text-yellow-700 border-yellow-200',  // Wait Confirm
    1: 'bg-purple-100 text-purple-700 border-purple-200',  // Wait Weigh
    2: 'bg-blue-100 text-blue-700 border-blue-200',        // Confirmed
    3: 'bg-red-100 text-red-700 border-red-200',           // Cancelled
    4: 'bg-orange-100 text-orange-700 border-orange-200',  // Cooking
  };

  const statusLabels = {
    0: 'Chờ xác nhận',
    1: 'Chờ cân',
    2: 'Đã xác nhận',
    3: 'Đã hủy',
    4: 'Đang chế biến',
  };

  const statusIcons = {
    0: <Clock size={14} />,
    1: <span className="font-bold font-mono text-[10px]">KG</span>,
    2: <CheckCircle size={14} />,
    3: <XCircle size={14} />,
    4: <Flame size={14} />,
  };

  return (
    <div className="p-4 pb-24 flex flex-col h-full bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Món đã gọi</h2>
          <p className="text-xs text-gray-500 font-mono">#{order.OrderNumber}</p>
        </div>
        <button onClick={() => refetch()} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition-colors">
          <RefreshCcw size={18} className={isRefetching ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      <div className="space-y-3 mb-6 flex-1">
        {order.lines.map((line, idx) => (
          <div key={`${line.OrderLineID}-${idx}`} className={`bg-white p-3 rounded-xl shadow-sm border ${line.Status === 3 ? 'opacity-60 border-red-100' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-sm text-gray-800 pr-2">{line.MenuItemName}</h3>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold whitespace-nowrap ${statusColors[line.Status]}`}>
                {statusIcons[line.Status]}
                {statusLabels[line.Status]}
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                {line.IsWeightBased === 1 && line.Status === 1 ? (
                  <p className="text-sm text-gray-500 italic">Chưa xác định khối lượng</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm bg-gray-100 px-2 rounded-md">{Number(line.Quantity)} {line.IsWeightBased ? 'kg' : 'phần'}</span>
                    <span className="text-gray-400 text-xs">x</span>
                    <span className="text-sm text-gray-600">{new Intl.NumberFormat('vi-VN').format(line.UnitPrice)}</span>
                  </div>
                )}
                {line.Note && <p className="text-xs text-gray-500 italic mt-1">"{line.Note}"</p>}
                {line.CancelReason && line.Status === 3 && <p className="text-xs text-red-500 italic mt-1">Lý do hủy: {line.CancelReason}</p>}
              </div>
              
              {line.Status !== 3 && !(line.IsWeightBased === 1 && line.Status === 1) && (
                <p className="font-bold text-primary">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(line.Quantity) * Number(line.UnitPrice))}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-600">Tổng cộng (tạm tính)</span>
          <span className="text-xl font-bold text-primary">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateTotal())}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 text-right">Chưa bao gồm thuế và phí dịch vụ</p>
      </div>

      <button 
        onClick={handleRequestPayment}
        disabled={isRequesting || order.Status === 3}
        className={`w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
          order.Status === 3 ? 'bg-green-100 text-green-700' : 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
        }`}
      >
        {isRequesting ? <span className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" /> : null}
        {order.Status === 3 ? 'ĐÃ YÊU CẦU THANH TOÁN' : 'GỌI THANH TOÁN'}
      </button>
    </div>
  );
}
