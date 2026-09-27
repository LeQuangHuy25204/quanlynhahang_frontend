import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Invoice() {
  const { paymentId } = useParams();
  const navigate = useNavigate();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', paymentId],
    queryFn: () => apiClient.get(`/payments/${paymentId}/invoice`).then(res => res.data),
  });

  if (isLoading) return <div className="p-10 text-center text-gray-500">Đang tải hóa đơn...</div>;
  if (!invoice) return <div className="p-10 text-center text-red-500 font-bold">Không tìm thấy hóa đơn</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-xl mx-auto h-full flex flex-col items-center print:block print:max-w-none print:w-full">
      {/* Header hidden on print */}
      <div className="w-full flex justify-between items-center mb-6 print:hidden">
        <button onClick={() => navigate('/cashier')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft size={20} /> Về trang Thu ngân
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-black transition-colors">
          <Printer size={18} /> In hóa đơn
        </button>
      </div>

      {/* Invoice Card */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:shadow-none print:border-none print:p-0">
        <div className="text-center border-b-2 border-dashed border-gray-200 pb-6 mb-6">
          <div className="flex justify-center mb-2">
            <CheckCircle className="text-success" size={48} />
          </div>
          <h2 className="text-2xl font-black text-gray-800">HÓA ĐƠN THANH TOÁN</h2>
          <p className="text-gray-500 mt-1">{invoice.BranchName}</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">{invoice.BranchAddress}</p>
          <p className="text-sm text-gray-400">SĐT: {invoice.BranchPhone}</p>
        </div>

        <div className="flex justify-between text-sm mb-6 pb-6 border-b-2 border-dashed border-gray-200">
          <div>
            <p className="text-gray-500 mb-1">Mã hóa đơn:</p>
            <p className="font-mono font-bold text-gray-800">{invoice.InvoiceNumber}</p>
            <p className="text-gray-500 mt-3 mb-1">Thời gian:</p>
            <p className="font-bold text-gray-800">{format(new Date(invoice.InvoiceDate), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 mb-1">Khu vực / Bàn:</p>
            <p className="font-bold text-gray-800">{invoice.AreaName} / {invoice.TableName}</p>
            <p className="text-gray-500 mt-3 mb-1">Mã tham chiếu:</p>
            <p className="font-mono font-bold text-gray-800">{invoice.TransactionNo || 'N/A'}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex font-bold text-sm text-gray-500 border-b border-gray-200 pb-2 mb-2">
            <div className="flex-1">Tên món</div>
            <div className="w-16 text-center">SL</div>
            <div className="w-24 text-right">Đơn giá</div>
            <div className="w-24 text-right">Thành tiền</div>
          </div>
          
          {invoice.lines?.map(line => (
            <div key={line.OrderLineID} className="flex text-sm py-2">
              <div className="flex-1 pr-2 font-medium text-gray-800">{line.MenuItemName}</div>
              <div className="w-16 text-center text-gray-600">{Number(line.Quantity)}</div>
              <div className="w-24 text-right text-gray-600">{new Intl.NumberFormat('vi-VN').format(line.UnitPrice)}</div>
              <div className="w-24 text-right font-medium text-gray-800">
                {new Intl.NumberFormat('vi-VN').format(Number(line.Quantity) * Number(line.UnitPrice))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-dashed border-gray-200 pt-6 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tạm tính</span>
            <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(invoice.SubTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Thuế GTGT (VAT)</span>
            <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(invoice.VATAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Phí phục vụ</span>
            <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(invoice.ServiceFeeAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600">
            <span>Khuyến mãi</span>
            <span className="font-medium">-{new Intl.NumberFormat('vi-VN').format(invoice.DiscountAmount)}</span>
          </div>
          
          <div className="flex justify-between items-end pt-4 border-t border-gray-200 mt-4">
            <div>
              <span className="text-gray-500 text-sm block mb-1">TỔNG THANH TOÁN</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold uppercase">{invoice.PaymentMethod}</span>
            </div>
            <span className="text-3xl font-black text-primary">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.TotalAmount)}
            </span>
          </div>
        </div>
        
        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-400 print:text-xs">
          <p className="font-medium text-gray-500 mb-1">Cảm ơn quý khách và hẹn gặp lại!</p>
          <p>Wifi: BBQ_KLTN_FREE - Pass: 12345678</p>
          <p className="mt-2 text-[10px] uppercase tracking-widest">Powered by Antigravity</p>
        </div>
      </div>
      
      {/* Print styles inserted directly for simplicity */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          @page { margin: 0.5cm; }
        }
      `}</style>
    </div>
  );
}
