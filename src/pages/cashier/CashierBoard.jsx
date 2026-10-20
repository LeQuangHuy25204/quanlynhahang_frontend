import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { RefreshCcw, CreditCard, ChevronRight, Bell, Utensils } from 'lucide-react';
import { format } from 'date-fns';

export default function CashierBoard() {
  const { staff } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting' | 'all'

  // Cashier orders waiting for payment (Status = 3)
  const { data: waitingOrders = [], isLoading: loadingWaiting, refetch: refetchWaiting, isRefetching } = useQuery({
    queryKey: ['waitingPayments', staff?.branchId],
    queryFn: () => apiClient.get(`/orders?branchId=${staff?.branchId}&status=3`).then(res => res.data),
    refetchInterval: 5000,
  });

  // All active orders of branch for proactive checkout
  const { data: allOrders = [], refetch: refetchAll } = useQuery({
    queryKey: ['allBranchOrders', staff?.branchId],
    queryFn: () => apiClient.get(`/orders?branchId=${staff?.branchId}`).then(res => res.data),
    refetchInterval: 10000,
  });

  const handleRefresh = () => {
    refetchWaiting();
    refetchAll();
  };

  // Calculate total for display roughly
  const calcRoughTotal = (lines) => {
    return lines.reduce((sum, line) => sum + (line.Status !== 3 ? (Number(line.Quantity) * Number(line.UnitPrice)) : 0), 0);
  };

  if (loadingWaiting && !isRefetching) return <div className="p-10 text-center text-gray-500">Đang tải danh sách thu ngân...</div>;

  const displayOrders = activeTab === 'waiting' 
    ? waitingOrders 
    : allOrders.filter(o => o.lines && o.lines.some(l => l.Status !== 3));

  return (
    <div className="h-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quầy Thu Ngân</h1>
          <p className="text-sm text-gray-500">Xử lý thanh toán và hóa đơn bàn ăn</p>
        </div>
        <button onClick={handleRefresh} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition-colors">
          <RefreshCcw size={20} className={isRefetching ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('waiting')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'waiting'
              ? 'bg-warning text-white shadow-md shadow-warning/30'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Bell size={16} /> Yêu cầu thanh toán
          {waitingOrders.length > 0 && (
            <span className="bg-white text-warning text-xs px-2 py-0.5 rounded-full font-black">
              {waitingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'all'
              ? 'bg-primary text-white shadow-md shadow-primary/30'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Utensils size={16} /> Tất cả bàn đang phục vụ ({allOrders.length})
        </button>
      </div>

      <div className="space-y-4">
        {displayOrders.map(order => {
          const isWaiting = order.Status === 3;
          return (
            <div 
              key={order.OrderID} 
              className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer ${
                isWaiting ? 'border-warning/60 ring-2 ring-warning/20 hover:border-warning' : 'border-gray-200 hover:border-primary/40'
              }`} 
              onClick={() => navigate(`/cashier/checkout/${order.OrderID}`)}
            >
              
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold ${
                  isWaiting ? 'bg-warning/10 text-warning' : 'bg-blue-50 text-blue-600'
                }`}>
                  <CreditCard size={20} className="mb-0.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-800">{order.TableName}</h3>
                    {isWaiting && (
                      <span className="bg-warning text-white text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse">
                        GỌI TÍNH TIỀN
                      </span>
                    )}
                  </div>
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
                  className={`flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${
                    isWaiting ? 'bg-warning hover:bg-warning/90 shadow-md shadow-warning/20' : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  Thanh toán <ChevronRight size={18} />
                </button>
              </div>
            </div>
          );
        })}

        {displayOrders.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-600">
              {activeTab === 'waiting' ? 'Không có bàn nào đang yêu cầu thanh toán' : 'Không có bàn nào đang phục vụ'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">Danh sách sẽ tự động cập nhật khi có bàn mới.</p>
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
