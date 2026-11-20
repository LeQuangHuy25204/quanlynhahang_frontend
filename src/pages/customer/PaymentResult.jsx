import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCcw,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useSessionStore } from '../../store/sessionStore';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sessionToken } = useSessionStore();

  const txnRef = searchParams.get('txnRef') || '';
  const sigValid = searchParams.get('sig') !== '0';
  const vnpCode = searchParams.get('code') || '';
  const [pollCount, setPollCount] = useState(0);

  const {
    data: txStatus,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['vnpayStatus', txnRef],
    queryFn: async () => {
      const res = await apiClient.post('/payments/vnpay/status', {
        txnRef,
        sessionToken,
      });
      return res.data;
    },
    enabled: Boolean(txnRef && sessionToken),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' && pollCount < 20) {
        return 3000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (txStatus?.status === 'PENDING') {
      const timer = setInterval(() => {
        setPollCount((c) => (c < 20 ? c + 1 : c));
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [txStatus?.status]);

  const formatMoney = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val || 0));

  if (!txnRef) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
        <XCircle size={48} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Thiếu thông tin giao dịch</h2>
        <p className="text-sm text-gray-500 mb-6">Không tìm thấy mã giao dịch để hiển thị kết quả.</p>
        <button
          onClick={() => navigate('/customer/tracking')}
          className="w-full py-3 rounded-xl bg-primary text-white font-bold"
        >
          Quay lại đơn hàng
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-10 text-center mt-20 flex flex-col items-center gap-3 text-gray-500">
        <RefreshCcw className="animate-spin text-primary" size={32} />
        <p className="font-medium">Đang xác minh kết quả thanh toán...</p>
      </div>
    );
  }

  if (error || !txStatus) {
    return (
      <div className="p-6 max-w-md mx-auto mt-14 text-center bg-white rounded-2xl shadow-sm border border-red-100">
        <ShieldAlert size={48} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Không thể kiểm tra giao dịch</h2>
        <p className="text-sm text-gray-500 mb-4">
          {error?.message || 'Phiên làm việc không khớp hoặc giao dịch không tồn tại.'}
        </p>
        <p className="text-xs font-mono bg-gray-50 p-2 rounded-lg text-gray-600 mb-6">Mã GD: {txnRef}</p>
        <button
          onClick={() => navigate('/customer/tracking')}
          className="w-full py-3 rounded-xl bg-gray-800 text-white font-bold"
        >
          Quay lại theo dõi đơn
        </button>
      </div>
    );
  }

  const status = txStatus.status;

  const renderStatusHeader = () => {
    if (!sigValid) {
      return {
        icon: <ShieldAlert size={56} className="text-red-500" />,
        title: 'Chữ ký phản hồi không hợp lệ',
        desc: 'Thông tin trả về từ trình duyệt không khớp chữ ký bảo mật. Hệ thống chỉ căn cứ vào kết quả xác thực từ máy chủ VNPay.',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        badgeText: 'Cảnh báo chữ ký',
      };
    }

    switch (status) {
      case 'SUCCESS':
        return {
          icon: <CheckCircle2 size={56} className="text-emerald-500" />,
          title: 'Thanh toán thành công!',
          desc: 'Cảm ơn quý khách. Hóa đơn đã được xác nhận và phiên bàn đã hoàn tất.',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badgeText: 'Thành công',
        };
      case 'CANCELLED':
        return {
          icon: <XCircle size={56} className="text-amber-500" />,
          title: 'Bạn đã hủy thanh toán',
          desc: 'Giao dịch VNPay đã bị hủy. Phiên bàn vẫn đang mở, bạn có thể thử thanh toán lại hoặc gọi thu ngân.',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          badgeText: 'Đã hủy',
        };
      case 'FAILED':
        return {
          icon: <XCircle size={56} className="text-red-500" />,
          title: 'Thanh toán không thành công',
          desc: `Giao dịch thất bại (Mã phản hồi: ${txStatus.vnpResponseCode || vnpCode || 'N/A'}). Bạn có thể thử lại.`,
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
          badgeText: 'Thất bại',
        };
      case 'DUPLICATE_CONFLICT':
        return {
          icon: <AlertTriangle size={56} className="text-orange-500" />,
          title: 'Hóa đơn đã được thanh toán trước đó',
          desc: 'Giao dịch này thành công sau khi hóa đơn đã hoàn tất. Vui lòng giữ mã giao dịch để thu ngân đối soát hoàn tiền.',
          badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
          badgeText: 'Cần đối soát',
        };
      default:
        return {
          icon: <Clock size={56} className="text-blue-500 animate-pulse" />,
          title: 'Đang chờ xác nhận từ VNPay',
          desc: 'Hệ thống đang đợi tín hiệu xác nhận chính thức (IPN) từ VNPay. Vui lòng không đóng trang hoặc liên hệ thu ngân nếu đã bị trừ tiền.',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          badgeText: 'Đang chờ xác nhận',
        };
    }
  };

  const info = renderStatusHeader();

  return (
    <div className="p-4 max-w-md mx-auto mt-6 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="flex justify-center mb-3">{info.icon}</div>
        <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border mb-3 ${info.badgeClass}`}>
          {info.badgeText}
        </span>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{info.title}</h2>
        <p className="text-sm text-gray-500 mb-6">{info.desc}</p>

        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2.5 text-sm border border-gray-100 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500">Mã giao dịch</span>
            <span className="font-mono font-bold text-gray-800 text-xs">{txStatus.txnRef}</span>
          </div>
          {txStatus.vnpTransactionNo && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mã GD VNPay</span>
              <span className="font-mono font-semibold text-gray-800">{txStatus.vnpTransactionNo}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Số tiền</span>
            <span className="font-bold text-primary">{formatMoney(txStatus.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phương thức</span>
            <span className="font-semibold text-gray-800">VNPay</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Bàn / Hóa đơn</span>
            <span className="font-semibold text-gray-800">
              {txStatus.tableName || 'Tại bàn'} · {txStatus.invoiceNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Thời gian</span>
            <span className="text-gray-700">
              {new Date(txStatus.processedAt || txStatus.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {status === 'PENDING' && (
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCcw size={18} className={isRefetching ? 'animate-spin' : ''} />
              Kiểm tra lại trạng thái
            </button>
          )}

          {status !== 'SUCCESS' && (
            <button
              onClick={() => navigate('/customer/tracking')}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} /> Quay lại đơn hàng / Thử lại
            </button>
          )}

          {status === 'SUCCESS' && (
            <button
              onClick={() => navigate('/customer/menu')}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
