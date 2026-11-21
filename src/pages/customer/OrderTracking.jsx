import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { Clock, RefreshCcw, CheckCircle, Flame, XCircle, FileText, Utensils, CreditCard, Wallet, X, QrCode } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderTracking() {
  const { sessionToken, sessionId, table } = useSessionStore();
  const navigate = useNavigate();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showVietQr, setShowVietQr] = useState(false);
  const [sepayTx, setSepayTx] = useState(null);
  const [isCreatingSepay, setIsCreatingSepay] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRedirectingVnpay, setIsRedirectingVnpay] = useState(false);

  const { data: order, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orderTracking', sessionToken],
    queryFn: () => apiClient.get(`/orders/tracking/${sessionToken}`).then(res => res.data),
    refetchInterval: 3000, // auto refresh every 3s for real-time feel
    enabled: !!sessionToken
  });

  useEffect(() => {
    if (!showPayModal || !showVietQr || !sepayTx?.txnRef || !sessionToken) return;
    const timer = setInterval(async () => {
      try {
        const res = await apiClient.post('/payments/vnpay/status', {
          txnRef: sepayTx.txnRef,
          sessionToken,
        });
        if (res.data?.status === 'SUCCESS') {
          clearInterval(timer);
          toast.success('Đã nhận chuyển khoản thành công!');
          setShowPayModal(false);
          navigate(`/customer/payment-result?txnRef=${encodeURIComponent(sepayTx.txnRef)}&sig=1&code=00`);
        }
      } catch {
        // Bỏ qua lỗi poll tạm thời
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [showPayModal, showVietQr, sepayTx?.txnRef, sessionToken, navigate]);

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

  const handleOpenPaymentModal = async () => {
    setShowPayModal(true);
    setShowVietQr(false);
    setSepayTx(null);
    setIsLoadingPreview(true);
    try {
      const res = await apiClient.post('/payments/customer/preview', { sessionToken });
      setPreviewData(res.data);
    } catch (err) {
      toast.error(err.message || 'Chưa thể xem hóa đơn tạm tính.');
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleOpenSepayQr = async () => {
    setIsCreatingSepay(true);
    try {
      const res = await apiClient.post('/payments/sepay/create', { sessionToken });
      setSepayTx(res.data);
      setShowVietQr(true);
    } catch (err) {
      toast.error(err.message || 'Không thể tạo mã QR chuyển khoản.');
    } finally {
      setIsCreatingSepay(false);
    }
  };

  const handleRequestPayment = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn gọi thu ngân thanh toán tại quầy?')) return;
    setIsRequesting(true);
    try {
      await apiClient.post(`/orders/${order.OrderID}/request-payment`, { sessionToken });
      toast.success('Đã gửi yêu cầu thanh toán tới thu ngân.');
      setShowPayModal(false);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Lỗi yêu cầu thanh toán');
    } finally {
      setIsRequesting(false);
    }
  };

  const handlePayWithVnpay = async () => {
    if (isRedirectingVnpay) return;
    setIsRedirectingVnpay(true);
    try {
      const res = await apiClient.post('/payments/vnpay/create', { sessionToken });
      if (res.data?.paymentUrl) {
        window.location.assign(res.data.paymentUrl);
      } else {
        throw new Error('Không nhận được liên kết thanh toán VNPay.');
      }
    } catch (err) {
      toast.error(err.message || 'Không thể khởi tạo thanh toán VNPay.');
      setIsRedirectingVnpay(false);
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
    5: 'bg-teal-100 text-teal-700 border-teal-200',        // Ready
    6: 'bg-green-100 text-green-700 border-green-200',     // Served
  };

  const statusLabels = {
    0: 'Chờ xác nhận',
    1: 'Chờ cân',
    2: 'Đã xác nhận',
    3: 'Đã hủy',
    4: 'Đang chế biến',
    5: 'Chờ phục vụ',
    6: 'Đã phục vụ',
  };

  const statusIcons = {
    0: <Clock size={14} />,
    1: <span className="font-bold font-mono text-[10px]">KG</span>,
    2: <CheckCircle size={14} />,
    3: <XCircle size={14} />,
    4: <Flame size={14} />,
    5: <Utensils size={14} />,
    6: <CheckCircle size={14} />,
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
              <div className="pr-2">
                <h3 className="font-bold text-sm text-gray-800">{line.MenuItemName}</h3>
                {line.GuestName && (
                  <span className="inline-block text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1">
                    Người gọi: {line.GuestName}
                  </span>
                )}
              </div>
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

      <div className="flex gap-3 mb-2">
        <button 
          onClick={() => navigate('/customer/menu')}
          className="flex-1 font-bold py-3.5 rounded-xl border-2 border-primary text-primary hover:bg-primary-subtle transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Utensils size={18} /> Gọi thêm món
        </button>
        <button 
          onClick={handleOpenPaymentModal}
          disabled={isRequesting || isRedirectingVnpay}
          className={`flex-1 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            order.Status === 3 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
          }`}
        >
          <CreditCard size={18} />
          {order.Status === 3 ? 'THANH TOÁN VNPAY' : 'THANH TOÁN'}
        </button>
      </div>

      {/* Modal Thanh toán & VNPay (render qua Portal để không bị thanh điều hướng dưới che trên mobile) */}
      {showPayModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Xác nhận thanh toán</h3>
                <p className="text-xs text-gray-500">
                  {previewData?.tableName || table?.tableName || 'Bàn'} · Phiên #{previewData?.sessionId || sessionId || ''}
                </p>
              </div>
              <button
                onClick={() => !isRedirectingVnpay && setShowPayModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            {isRedirectingVnpay ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-bold text-gray-800">Đang chuyển đến cổng thanh toán VNPay...</p>
                <p className="text-xs text-gray-500">Vui lòng không đóng trình duyệt hoặc bấm tải lại.</p>
              </div>
            ) : isLoadingPreview ? (
              <div className="py-10 text-center text-gray-500 text-sm">Đang tính toán hóa đơn...</div>
            ) : previewData ? (
              <>
                <div className="max-h-48 overflow-y-auto space-y-2 mb-4 pr-1">
                  {previewData.lines?.map((l) => (
                    <div key={l.orderLineId} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {l.menuItemName} <span className="text-gray-400">x{l.quantity}</span>
                      </span>
                      <span className="font-medium text-gray-800">
                        {new Intl.NumberFormat('vi-VN').format(l.amount)}đ
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5 text-sm border border-gray-100 mb-5">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span>{new Intl.NumberFormat('vi-VN').format(previewData.subTotal)}đ</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Thuế VAT ({previewData.vatRate}%)</span>
                    <span>{new Intl.NumberFormat('vi-VN').format(previewData.vatAmount)}đ</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí phục vụ ({previewData.serviceFeeRate}%)</span>
                    <span>{new Intl.NumberFormat('vi-VN').format(previewData.serviceFeeAmount)}đ</span>
                  </div>
                  {Number(previewData.discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Khuyến mãi {previewData.promotionName ? `(${previewData.promotionName})` : ''}</span>
                      <span>-{new Intl.NumberFormat('vi-VN').format(previewData.discountAmount)}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-base text-gray-900">
                    <span>Tổng cần thanh toán</span>
                    <span className="text-primary">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(previewData.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {showVietQr && sepayTx?.vietQr ? (
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center space-y-3">
                      <p className="text-xs font-bold uppercase text-emerald-800">
                        Quét mã VietQR để chuyển khoản tự động
                      </p>
                      <img
                        src={sepayTx.vietQr.qrUrl}
                        alt="VietQR"
                        className="w-56 mx-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xs"
                      />
                      <div className="text-xs text-gray-700 space-y-1 bg-white p-2.5 rounded-lg border border-emerald-100">
                        <p><span className="text-gray-500">Ngân hàng:</span> <b>{sepayTx.vietQr.bankId}</b></p>
                        <p><span className="text-gray-500">Số tài khoản:</span> <b className="font-mono">{sepayTx.vietQr.accountNo}</b></p>
                        <p><span className="text-gray-500">Chủ TK:</span> <b>{sepayTx.vietQr.accountName}</b></p>
                        <p><span className="text-gray-500">Nội dung:</span> <b className="font-mono text-primary">{sepayTx.vietQr.addInfo}</b></p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs text-emerald-700 font-semibold py-1">
                        <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        Đang chờ xác nhận tự động...
                      </div>
                      <button
                        onClick={handleRequestPayment}
                        disabled={isRequesting || order.Status === 3}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-60"
                      >
                        {order.Status === 3 ? 'Đã báo thu ngân xác nhận' : 'Đã chuyển khoản - Báo thu ngân xác nhận'}
                      </button>
                      <button
                        onClick={() => setShowVietQr(false)}
                        className="w-full py-2 text-xs text-gray-500 font-medium hover:text-gray-800"
                      >
                        ← Chọn phương thức khác
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handlePayWithVnpay}
                        disabled={isRedirectingVnpay}
                        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all"
                      >
                        <CreditCard size={18} /> Thanh toán ngay qua VNPay
                      </button>

                      {previewData.vietQr && (
                        <button
                          onClick={handleOpenSepayQr}
                          disabled={isCreatingSepay}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 text-sm shadow-sm active:scale-[0.99] transition-all disabled:opacity-70"
                        >
                          <QrCode size={18} /> {isCreatingSepay ? 'Đang tạo mã QR...' : `Chuyển khoản QR Ngân hàng (${previewData.vietQr.bankId})`}
                        </button>
                      )}

                      {order.Status !== 3 && (
                        <button
                          onClick={handleRequestPayment}
                          disabled={isRequesting}
                          className="w-full py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold flex items-center justify-center gap-2 text-sm"
                        >
                          <Wallet size={16} /> Gọi thu ngân thanh toán tại quầy
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="py-6 text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Hiện chưa thể tạo hóa đơn tự động (có thể còn món đang chế biến/chờ cân). Bạn vẫn có thể gọi nhân viên hỗ trợ.
                </p>
                {order.Status !== 3 && (
                  <button
                    onClick={handleRequestPayment}
                    disabled={isRequesting}
                    className="w-full py-3 rounded-xl bg-primary text-white font-bold"
                  >
                    Gọi thu ngân hỗ trợ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
