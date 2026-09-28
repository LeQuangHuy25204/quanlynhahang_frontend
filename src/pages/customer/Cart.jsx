import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { Trash2, ArrowRight, X, Minus, Plus, ShoppingCart, Info } from 'lucide-react';

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, getCartTotal } = useCartStore();
  const { sessionToken, participantId, branchId } = useSessionStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    
    if (!participantId) {
      toast.error('Vui lòng nhập tên trước khi gọi món.');
      navigate('/customer/join');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const orderItems = items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        note: item.note
      }));
      
      await apiClient.post('/orders', {
        sessionToken,
        participantId,
        branchId,
        items: orderItems
      });
      
      toast.success('Đã gửi yêu cầu gọi món!');
      clearCart();
      navigate('/customer/tracking');
    } catch (err) {
      toast.error(err.message || 'Lỗi khi gọi món');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-page relative">
        <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 border-b border-border shadow-sm">
          <h2 className="text-[18px] font-extrabold text-text-primary tracking-tight">Giỏ hàng</h2>
          <button onClick={() => navigate('/customer/menu')} className="w-8 h-8 flex items-center justify-center bg-bg-page rounded-full text-text-secondary hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 p-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary shadow-inner">
            <ShoppingCart size={40} />
          </div>
          <p className="text-text-secondary font-medium mb-8 text-[15px] text-center">Giỏ hàng của bạn đang trống.</p>
          <button 
            onClick={() => navigate('/customer/menu')} 
            className="w-full max-w-[280px] bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-md shadow-primary/30 active:scale-95 transition-all"
          >
            Quay lại thực đơn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-page relative pb-[240px]">
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <h2 className="text-[18px] font-extrabold text-text-primary tracking-tight">Giỏ hàng</h2>
        <button onClick={() => navigate('/customer/menu')} className="w-8 h-8 flex items-center justify-center bg-bg-page rounded-full text-text-secondary hover:bg-gray-200 transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6 flex flex-col gap-4">
        {items.map(item => (
          <div key={item.cartId} className="bg-white rounded-[20px] p-4 shadow-sm border border-border flex gap-4 items-start relative group">
            <div className="w-[84px] h-[84px] bg-bg-page rounded-[14px] overflow-hidden flex-shrink-0">
               {item.imageUrl ? (
                 <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                   <ShoppingCart size={24} />
                 </div>
               )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h3 className="text-[15px] font-bold text-text-primary leading-tight pr-6">{item.name}</h3>
                <button 
                  onClick={() => removeItem(item.cartId)} 
                  className="absolute top-4 right-4 text-text-tertiary hover:text-danger p-1 transition-colors active:scale-90"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              {item.isWeightBased ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-info/10 text-info text-[10px] px-2 py-0.5 rounded-md font-bold inline-block">
                    MÓN CÂN (Tạm tính)
                  </span>
                  <p className="text-primary font-bold text-[14px]">
                    {new Intl.NumberFormat('vi-VN').format(item.finalPrice * item.quantity)}đ
                  </p>
                </div>
              ) : (
                <p className="text-primary font-bold text-[14px] mt-1">
                  {new Intl.NumberFormat('vi-VN').format(item.finalPrice)}đ
                </p>
              )}
              
              {item.note && (
                <p className="text-[12px] text-text-tertiary italic mt-1.5 line-clamp-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-border rounded-full inline-block"></span>
                  {item.note}
                </p>
              )}
              
              {item.isWeightBased ? (
                <div className="flex items-center gap-4 mt-3">
                  <button onClick={() => {
                    const newW = prompt('Nhập số cân (kg):', item.quantity);
                    if (newW && !isNaN(Number(newW)) && Number(newW) > 0) {
                      updateQuantity(item.menuItemId, Number(newW) - item.quantity);
                    }
                  }} className="text-[12px] font-bold text-primary underline">Đổi số cân</button>
                  <span className="font-bold text-[14px] text-text-primary bg-gray-100 px-2 rounded-md">{item.quantity} kg</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 mt-3">
                  <button onClick={() => updateQuantity(item.menuItemId, -1)} className="w-8 h-8 flex items-center justify-center bg-bg-page border border-border rounded-xl text-text-secondary hover:bg-gray-100 active:scale-95 transition-all">
                    <Minus size={16} strokeWidth={3} />
                  </button>
                  <span className="w-6 text-center font-bold text-[15px] text-text-primary">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menuItemId, 1)} className="w-8 h-8 flex items-center justify-center bg-primary-subtle text-primary rounded-xl hover:bg-primary/20 active:scale-95 transition-all">
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="fixed bottom-[96px] left-0 right-0 mx-auto w-full max-w-md bg-white border-t border-border p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-30 rounded-t-2xl">
        <div className="flex justify-between items-end mb-4">
          <div>
             <span className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Tạm tính</span>
             <span className="text-[12px] text-text-secondary leading-tight">Bao gồm ước tính món cân</span>
          </div>
          <span className="text-[24px] font-black text-primary leading-none">
            {new Intl.NumberFormat('vi-VN').format(getCartTotal())}đ
          </span>
        </div>
        <button 
          onClick={handleSubmitOrder}
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg shadow-primary/30"
        >
          {isSubmitting ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : (
            <>GỬI MÓN XUỐNG BẾP <ArrowRight size={18} strokeWidth={2.5} /></>
          )}
        </button>
      </div>
    </div>
  );
}


