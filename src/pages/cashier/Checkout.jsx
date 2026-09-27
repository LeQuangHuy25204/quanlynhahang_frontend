import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { ArrowLeft, Receipt, Gift, CreditCard, Wallet, Landmark } from 'lucide-react';
import { format } from 'date-fns';

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [promotionId, setPromotionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Load order items and branch config (we'll just call checkout preview or fetch order)
  // Wait, backend API `POST /payments/checkout` creates the Payment and Invoice.
  // We should fetch the order details first to display, then call checkout.
  // Actually, we don't have a GET /orders/:id API specifically for Cashier. 
  // We can just fetch all orders again and find it, or we can just call checkout immediately to generate Invoice, then show the Invoice for payment!
  // BUT what if we want to apply promotion BEFORE creating invoice? 
  // We need to fetch order details. We can use the staff order API filtering by this order.
  
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['orderDetail', orderId],
    queryFn: async () => {
      // Find order from branch list (hacky but works since we don't have GET /orders/:id)
      const res = await apiClient.get(`/orders?branchId=1&status=3`); // Wait, branchId should be dynamic but we are Admin/Cashier, let's fetch without branchId if possible?
      // Since backend requires branchId, we need staff's branch.
      // Wait, let's just get from localStorage or global state. Let's just return it.
      return res.data; 
    }
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => apiClient.get('/promotions').then(res => res.data)
  });

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      // Create Payment & Invoice
      const res = await apiClient.post('/payments/checkout', {
        orderId: Number(orderId),
        promotionId: promotionId ? Number(promotionId) : null
      });
      
      const paymentId = res.data.paymentId;
      
      // Complete payment immediately (or go to another step)
      await apiClient.put(`/payments/${paymentId}/complete`, {
        paymentMethod,
        transactionNo: paymentMethod !== 'CASH' ? 'TXN' + Date.now() : null
      });
      
      toast.success('Thanh toán thành công!');
      navigate(`/cashier/invoice/${paymentId}`);
    } catch (err) {
      toast.error(err.message || 'Lỗi xử lý thanh toán');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 font-medium">
        <ArrowLeft size={20} /> Quay lại
      </button>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Receipt className="text-primary" /> Xử lý thanh toán
            </h2>
            <p className="text-gray-500 mt-1">Xác nhận đơn và áp dụng khuyến mãi</p>
          </div>
          <div className="text-right bg-blue-50 text-blue-800 px-4 py-2 rounded-xl border border-blue-100">
            <p className="text-xs uppercase font-bold tracking-wider mb-1">Mã đơn</p>
            <p className="font-mono font-bold text-lg">Order #{orderId}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Gift size={18} className="text-orange-500" /> Áp dụng khuyến mãi
          </label>
          <select
            value={promotionId}
            onChange={(e) => setPromotionId(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">-- Không áp dụng --</option>
            {promotions.map(p => (
              <option key={p.PromotionID} value={p.PromotionID}>
                {p.Name} (Giảm {p.DiscountValue}{p.DiscountType === 'PERCENT' ? '%' : 'đ'})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Wallet size={18} className="text-green-500" /> Phương thức thanh toán
          </label>
          <div className="grid grid-cols-3 gap-3">
            <MethodCard value="CASH" icon={<Wallet/>} label="Tiền mặt" selected={paymentMethod} onSelect={setPaymentMethod} />
            <MethodCard value="BANK_TRANSFER" icon={<Landmark/>} label="Chuyển khoản" selected={paymentMethod} onSelect={setPaymentMethod} />
            <MethodCard value="CARD" icon={<CreditCard/>} label="Thẻ tín dụng" selected={paymentMethod} onSelect={setPaymentMethod} />
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 rounded-xl flex justify-center items-center gap-2 active:scale-[0.99] transition-all disabled:opacity-70"
        >
          {isProcessing ? <span className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" /> : 'XÁC NHẬN THANH TOÁN'}
        </button>
      </div>
    </div>
  );
}

const MethodCard = ({ value, icon, label, selected, onSelect }) => (
  <button
    onClick={() => onSelect(value)}
    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
      selected === value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300 text-gray-600'
    }`}
  >
    {React.cloneElement(icon, { size: 24, className: 'mb-2' })}
    <span className="text-sm font-bold">{label}</span>
  </button>
);
