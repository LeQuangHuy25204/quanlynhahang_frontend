import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Receipt,
  Gift,
  Wallet,
  Landmark,
  QrCode,
  ExternalLink,
  RefreshCcw,
  ShieldCheck,
  Utensils,
} from 'lucide-react';

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [promotionId, setPromotionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [vnpayTx, setVnpayTx] = useState(null);
  const [vnpayStatusInfo, setVnpayStatusInfo] = useState(null);
  const [isQueryingDr, setIsQueryingDr] = useState(false);
  const [sepayTx, setSepayTx] = useState(null);

  const { staff } = useAuthStore();
  const { data: orderData } = useQuery({
    queryKey: ['orderDetail', orderId, staff?.branchId],
    queryFn: async () => {
      const res = await apiClient.get(`/orders?branchId=${staff?.branchId || 1}`);
      return res.data;
    },
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => apiClient.get('/promotions').then((res) => res.data),
  });

  const { data: previewInfo, isLoading: loadingPreview, error: previewError } = useQuery({
    queryKey: ['checkoutPreview', orderId, promotionId],
    queryFn: () =>
      apiClient
        .get(`/payments/preview?orderId=${orderId}${promotionId ? `&promotionId=${promotionId}` : ''}`)
        .then((res) => res.data),
    enabled: Boolean(orderId),
  });

  const currentOrder = Array.isArray(orderData)
    ? orderData.find((o) => String(o.OrderID) === String(orderId))
    : null;

  const formatMoney = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val || 0));

  useEffect(() => {
    if (!sepayTx?.txnRef || paymentMethod !== 'BANK_TRANSFER') return;
    const timer = setInterval(async () => {
      try {
        const res = await apiClient.post('/payments/vnpay/status', { txnRef: sepayTx.txnRef });
        if (res.data?.status === 'SUCCESS') {
          clearInterval(timer);
          toast.success('SePay đã xác nhận nhận đủ tiền vào BIDV!');
          navigate(`/cashier/invoice/${res.data.paymentId}`);
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [sepayTx?.txnRef, paymentMethod, navigate]);

  const handleCreateSepayQr = async () => {
    setIsProcessing(true);
    try {
      const res = await apiClient.post('/payments/sepay/create', {
        orderId: Number(orderId),
        sessionId: currentOrder?.SessionID,
        promotionId: promotionId ? Number(promotionId) : null,
      });
      setSepayTx(res.data);
      toast.success('Đã tạo mã QR tự động! Chờ khách quét chuyển khoản.');
    } catch (err) {
      toast.error(err.message || 'Lỗi tạo mã QR SePay');
    } finally {
      setIsProcessing(false);
    }
  };

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
        toast.success('Đã tạo giao dịch VNPay! Chờ khách thanh toán.');
        return;
      }

      const res = await apiClient.post('/payments/checkout', {
        orderId: Number(orderId),
        sessionId: currentOrder?.SessionID,
        promotionId: promotionId ? Number(promotionId) : null,
      });

      const paymentId = res.data.paymentId;

      await apiClient.put(`/payments/${paymentId}/complete`, {
        paymentMethod,
        transactionNo: paymentMethod === 'BANK_TRANSFER' ? `BIDV-${Date.now()}` : null,
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
    <div className="max-w-3xl mx-auto pb-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-5 font-medium"
      >
        <ArrowLeft size={20} /> Quay lại
      </button>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Receipt className="text-primary" /> Xác nhận thanh toán
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              {currentOrder ? `${currentOrder.TableName} · ${currentOrder.AreaName}` : `Đơn hàng #${orderId}`}
            </p>
          </div>
          <div className="text-right bg-blue-50 text-blue-800 px-4 py-2 rounded-xl border border-blue-100">
            <p className="text-[11px] uppercase font-bold tracking-wider mb-0.5">Mã đơn</p>
            <p className="font-mono font-bold text-base">#{orderId}</p>
          </div>
        </div>

        {/* Chi tiết món & Tổng tiền */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
            <Utensils size={14} /> Chi tiết hóa đơn tạm tính
          </h3>

          {loadingPreview ? (
            <p className="text-sm text-gray-500 py-4 text-center">Đang tải chi tiết món...</p>
          ) : previewError ? (
            <p className="text-sm text-red-500 py-2">{previewError.message || 'Không tải được chi tiết hóa đơn'}</p>
          ) : previewInfo ? (
            <>
              <div className="divide-y divide-gray-200/70 max-h-52 overflow-y-auto pr-1 mb-3">
                {previewInfo.lines?.map((l) => (
                  <div key={l.orderLineId} className="py-2 flex justify-between text-sm">
                    <span className="text-gray-800 font-medium">
                      {l.menuItemName} <span className="text-gray-400 font-normal">x{l.quantity}</span>
                    </span>
                    <span className="font-semibold text-gray-800">
                      {new Intl.NumberFormat('vi-VN').format(l.amount)}đ
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(previewInfo.subTotal)}đ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Thuế VAT ({previewInfo.vatRate}%)</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(previewInfo.vatAmount)}đ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí phục vụ ({previewInfo.serviceFeeRate}%)</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(previewInfo.serviceFeeAmount)}đ</span>
                </div>
                {Number(previewInfo.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Khuyến mãi {previewInfo.promotionName ? `(${previewInfo.promotionName})` : ''}</span>
                    <span>-{new Intl.NumberFormat('vi-VN').format(previewInfo.discountAmount)}đ</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-800">TỔNG CẦN THU</span>
                  <span className="text-2xl font-black text-primary">{formatMoney(previewInfo.totalAmount)}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Khuyến mãi */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Gift size={18} className="text-orange-500" /> Áp dụng khuyến mãi
          </label>
          <select
            value={promotionId}
            onChange={(e) => setPromotionId(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
          >
            <option value="">-- Không áp dụng --</option>
            {promotions
              .filter((p) => p.IsActive === 1)
              .map((p) => (
                <option key={p.PromotionID} value={p.PromotionID}>
                  {p.Name} (Giảm {p.DiscountValue}
                  {p.DiscountType === 'PERCENT' ? '%' : 'đ'})
                </option>
              ))}
          </select>
        </div>

        {/* Phương thức thanh toán (chỉ giữ 3 phương thức thực tế sử dụng) */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Wallet size={18} className="text-green-500" /> Phương thức thanh toán
          </label>
          <div className="grid grid-cols-3 gap-3">
            <MethodCard
              value="CASH"
              icon={<Wallet />}
              label="Tiền mặt"
              selected={paymentMethod}
              onSelect={setPaymentMethod}
            />
            <MethodCard
              value="BANK_TRANSFER"
              icon={<Landmark />}
              label="Chuyển khoản BIDV"
              selected={paymentMethod}
              onSelect={setPaymentMethod}
            />
            <MethodCard
              value="VNPAY"
              icon={<QrCode />}
              label="VNPay Online"
              selected={paymentMethod}
              onSelect={setPaymentMethod}
            />
          </div>
        </div>

        {/* Khung VietQR BIDV rõ ràng cho Thu ngân đối chiếu / SePay tự động */}
        {paymentMethod === 'BANK_TRANSFER' && (sepayTx?.vietQr || previewInfo?.vietQr) && (() => {
          const qr = sepayTx?.vietQr || previewInfo.vietQr;
          return (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={qr.qrUrl}
                alt="VietQR"
                className="w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xs shrink-0"
              />
              <div className="text-sm space-y-1.5 text-gray-700 flex-1">
                <p className="text-xs font-bold uppercase text-emerald-800">
                  {sepayTx ? 'Mã QR SePay Tự Động (Chờ tiền vào BIDV)' : 'Thông tin chuyển khoản BIDV (VietQR)'}
                </p>
                <p>Ngân hàng: <b>{qr.bankId}</b></p>
                <p>Số tài khoản: <b className="font-mono">{qr.accountNo}</b></p>
                <p>Chủ tài khoản: <b>{qr.accountName}</b></p>
                <p>Số tiền: <b className="text-primary">{formatMoney(qr.amount)}</b></p>
                <p>Nội dung CK: <b className="font-mono text-xs text-primary">{qr.addInfo}</b></p>

                {sepayTx ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold pt-1">
                    <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    Hệ thống đang tự động lắng nghe SePay Webhook...
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateSepayQr}
                    disabled={isProcessing}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                  >
                    <QrCode size={14} /> Tạo mã QR tự động xác nhận (SePay)
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Khung VNPay chờ xác nhận */}
        {vnpayTx && paymentMethod === 'VNPAY' && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase text-blue-700">Giao dịch VNPay đang chờ xác nhận</p>
                <p className="font-mono text-sm font-bold text-gray-800">{vnpayTx.txnRef}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-blue-200 text-blue-700">
                {vnpayStatusInfo?.status || 'PENDING'}
              </span>
            </div>
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
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-base py-4 rounded-xl flex justify-center items-center gap-2 active:scale-[0.99] transition-all disabled:opacity-70"
        >
          {isProcessing ? (
            <span className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
          ) : paymentMethod === 'VNPAY' ? (
            'TẠO LIÊN KẾT THANH TOÁN VNPAY'
          ) : paymentMethod === 'BANK_TRANSFER' ? (
            'XÁC NHẬN ĐÃ NHẬN CHUYỂN KHOẢN & ĐÓNG BÀN'
          ) : (
            'XÁC NHẬN ĐÃ THU TIỀN MẶT & ĐÓNG BÀN'
          )}
        </button>
      </div>
    </div>
  );
}

const MethodCard = ({ value, icon, label, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
      selected === value
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-gray-200 hover:border-gray-300 text-gray-600'
    }`}
  >
    {React.cloneElement(icon, { size: 22, className: 'mb-2' })}
    <span className="text-xs sm:text-sm font-bold text-center">{label}</span>
  </button>
);
