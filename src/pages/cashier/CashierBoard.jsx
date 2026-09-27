import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { RefreshCcw, CreditCard, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function CashierBoard() {
  const { staff } = useAuthStore();
  const navigate = useNavigate();

  // Cashier mostly cares about orders waiting for payment (Status = 3)
  const { data: waitingOrders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['waitingPayments', staff?.branchId],
    queryFn: () => apiClient.get(`/orders?branchId=${staff?.branchId}&status=3`).then(res => res.data),
    refetchInterval: 10000,
  });

  // Calculate total for display roughly
  const calcRoughTotal = (lines) => {
    return lines.reduce((sum, line) => sum + (line.Status !== 3 ? (Number(line.Quantity) * Number(line.UnitPrice)) : 0), 0);
  };

  if (isLoading && !isRefetching) return <div className="p-10 text-center text-gray-500">Đang tải danh sách chờ thanh toán...</div>;

  return (
    <div className="h-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thu ngân</h1>
          <p className="text-sm text-gray-500">Các bàn đang chờ thanh toán</p>
        </div>
        <button onClick={() => refetch()} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition-colors">
          <RefreshCcw size={20} className={isRefetching ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      <div className="space-y-4">
        {waitingOrders.map(order => (
          <div key={order.OrderID} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/cashier/checkout/${order.OrderID}`)}>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex flex-col items-center justify-center font-bold">
                <CreditCard size={20} className="mb-0.5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{order.TableName}</h3>
                <p className="text-sm text-gray-500">{order.AreaName}</p>
              </div>
            </div>

            <div className="flex-1 md:text-center grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Mã đơn</p>
                <p className="text-sm font-mono font-medium">{order.OrderNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Tạm tính</p>
                <p className="text-sm font-bold text-primary">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calcRoughTotal(order.lines))}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-2 md:mt-0">
              <button 
                onClick={(e) => { e.stopPropagation(); navigate(`/cashier/checkout/${order.OrderID}`); }}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Xử lý <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}

        {waitingOrders.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-600">Tuyệt vời!</h3>
            <p className="text-gray-400">Không có bàn nào đang chờ thanh toán.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const CheckCircle = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
