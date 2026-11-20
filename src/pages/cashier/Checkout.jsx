import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { ArrowLeft, Receipt, Gift, CreditCard, Wallet, Landmark, QrCode, ExternalLink, RefreshCcw, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [promotionId, setPromotionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [vnpayTx, setVnpayTx] = useState(null);
  const [vnpayStatusInfo, setVnpayStatusInfo] = useState(null);
  const [isQueryingDr, setIsQueryingDr] = useState(false);

  // Load order items and branch config (we'll just call checkout preview or fetch order)
  // Wait, backend API `POST /payments/checkout` creates the Payment and Invoice.
  // We should fetch the order details first to display, then call checkout.
  // Actually, we don't have a GET /orders/:id API specifically for Cashier. 
  // We can just fetch all orders again and find it, or we can just call checkout immediately to generate Invoice, then show the Invoice for payment!
  // BUT what if we want to apply promotion BEFORE creating invoice? 
  // We need to fetch order details. We can use the staff order API filtering by this order.
  
  const { staff } = useAuthStore();
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['orderDetail', orderId, staff?.branchId],
    queryFn: async () => {
      const res = await apiClient.get(`/orders?branchId=${staff?.branchId || 1}&status=3`);
      return res.data; 
    }
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => apiClient.get('/promotions').then(res => res.data)
  });

  const { data: previewInfo } = useQuery({
    queryKey: ['checkoutPreview', orderId, promotionId],
    queryFn: () => apiClient.get(`/payments/preview?orderId=${orderId}${promotionId ? `&promotionId=${promotionId}` : ''}`).then(res => res.data),
    enabled: Boolean(orderId),
  });

  const currentOrder = Array.isArray(orderData)
    ? orderData.find(o => String(o.OrderID) === String(orderId))
    : null;

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      if (paymentMethod === 'VNPAY') {
        const res = await apiClient.post('/payments/vnpay/create', {
          orderId: Number(orderId),
          sessionId: currentOrder?.SessionID,
          promotionId: promotionId ? Number(promotionId) : null,
        });
        setVnpayTx(res.data);
        setVnpayStatusInfo({ status: 'PENDING', txnRef: res.data.txnRef, amount: res.data.amount });
        toast.success('Đã tạo giao dịch VNPay! Chờ khách quét/thanh toán.');
        return;
      }

      // Create Payment & Invoice for CASH / BANK_TRANSFER / CARD
      const res = await apiClient.post('/payments/checkout', {
        orderId: Number(orderId),
        sessionId: currentOrder?.SessionID,
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

  const handleRefreshVnpayStatus = async () => {
    if (!vnpayTx?.txnRef) return;
    try {
      const res = await apiClient.post('/payments/vnpay/status', { txnRef: vnpayTx.txnRef });
      setVnpayStatusInfo(res.data);
      if (res.data.status === 'SUCCESS') {
        toast.success('VNPay đã xác nhận thanh toán thành công!');
        navigate(`/cashier/invoice/${res.data.paymentId}`);
      } else {
        toast.info(`Trạng thái hiện tại: ${res.data.status}`);
      }
    } catch (err) {
      toast.error(err.message || 'Không thể kiểm tra trạng thái');
    }
  };

  const handleQueryDr = async () => {
    if (!vnpayTx?.txnRef) return;
    setIsQueryingDr(true);
    try {
      const res = await apiClient.post('/payments/vnpay/querydr', { txnRef: vnpayTx.txnRef });
      setVnpayStatusInfo(res.data);
      if (res.data.status === 'SUCCESS') {
        toast.success('Đối soát thành công: Giao dịch đã thanh toán!');
        navigate(`/cashier/invoice/${res.data.paymentId}`);
      } else {
        toast.info(`Kết quả đối soát VNPay: ${res.data.status}`);
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi đối soát querydr VNPay');
    } finally {
      setIsQueryingDr(false);
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
            {promotions.filter(p => p.IsActive === 1).map(p => {
              const scope = p.ApplyLevel === 'MENU_ITEM'
                ? ` · Món: ${(p.MenuItems || []).map(m => m.Name).join(', ')}`
                : p.ApplyLevel === 'CATEGORY'
                  ? ` · Danh mục: ${p.TargetCategoryName || ''}`
                  : '';
              const conds = [
                Number(p.MinOrderAmount) > 0 ? `HĐ từ ${new Intl.NumberFormat('vi-VN').format(p.MinOrderAmount)}đ` : null,
                Number(p.MinItemCount) > 0 ? `từ ${p.MinItemCount} món` : null,
              ].filter(Boolean);
              return (
                <option key={p.PromotionID} value={p.PromotionID}>
                  {p.Name} (Giảm {p.DiscountValue}{p.DiscountType === 'PERCENT' ? '%' : 'đ'}){scope}{conds.length ? ` · Điều kiện: ${conds.join(', ')}` : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Wallet size={18} className="text-green-500" /> Phương thức thanh toán
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MethodCard value="CASH" icon={<Wallet/>} label="Tiền mặt" selected={paymentMethod} onSelect={setPaymentMethod} />
            <MethodCard value="BANK_TRANSFER" icon={<Landmark/>} label="Chuyển khoản" selected={paymentMethod} onSelect={setPaymentMethod} />
            <MethodCard value="CARD" icon={<CreditCard/>} label="Thẻ tín dụng" selected={paymentMethod} onSelect={setPaymentMethod} />
            <MethodCard value="VNPAY" icon={<QrCode/>} label="VNPay Online" selected={paymentMethod} onSelect={setPaymentMethod} />
          </div>
        </div>

        {paymentMethod === 'BANK_TRANSFER' && previewInfo?.vietQr && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center gap-4">
            <img
              src={previewInfo.vietQr.qrUrl}
              alt="VietQR"
              className="w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xs shrink-0"
            />
            <div className="text-sm space-y-1.5 text-gray-700">
              <p className="text-xs font-bold uppercase text-emerald-800">Mã VietQR chuyển khoản ngân hàng</p>
              <p>Ngân hàng: <b>{previewInfo.vietQr.bankId}</b></p>
              <p>Số tài khoản: <b className="font-mono">{previewInfo.vietQr.accountNo}</b></p>
              <p>Chủ tài khoản: <b>{previewInfo.vietQr.accountName}</b></p>
              <p>Số tiền: <b className="text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(previewInfo.vietQr.amount)}</b></p>
              <p>Nội dung: <b className="font-mono text-xs">{previewInfo.vietQr.addInfo}</b></p>
              <p className="text-xs text-gray-500 pt-1">Khách quét mã xong, thu ngân kiểm tra tiền về tài khoản rồi bấm nút XÁC NHẬN THANH TOÁN bên dưới.</p>
            </div>
          </div>
        )}

        {vnpayTx && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase text-blue-700">Giao dịch VNPay đang chờ xác nhận</p>
                <p className="font-mono text-sm font-bold text-gray-800">{vnpayTx.txnRef}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-blue-200 text-blue-700">
                {vnpayStatusInfo?.status || 'PENDING'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Thu ngân không được tự xác nhận thành công thủ công cho VNPay. Chỉ hoàn tất khi nhận IPN hoặc đối soát hợp lệ.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={vnpayTx.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
              >
                <ExternalLink size={14} /> Mở trang thanh toán VNPay
              </a>
              <button
                type="button"
                onClick={handleRefreshVnpayStatus}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100"
              >
                <RefreshCcw size={14} /> Kiểm tra trạng thái
              </button>
              <button
                type="button"
                onClick={handleQueryDr}
                disabled={isQueryingDr}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100"
              >
                <ShieldCheck size={14} /> {isQueryingDr ? 'Đang đối soát...' : 'Đối soát VNPay (querydr)'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 rounded-xl flex justify-center items-center gap-2 active:scale-[0.99] transition-all disabled:opacity-70"
        >
          {isProcessing
            ? <span className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
            : (paymentMethod === 'VNPAY' ? 'TẠO LIÊN KẾT THANH TOÁN VNPAY' : 'XÁC NHẬN THANH TOÁN')}
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
