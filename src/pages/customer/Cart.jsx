import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { Trash2, ArrowRight } from 'lucide-react';

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, getCartTotal } = useCartStore();
  const { sessionToken, participantId, branchId } = useSessionStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const orderItems = items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.isWeightBased ? 0 : item.quantity,
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
      <div className="flex flex-col items-center justify-center h-full p-6 mt-20">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
          <ShoppingCart size={48} />
        </div>
        <p className="text-gray-500 mb-6 text-center">Giỏ hàng của bạn đang trống.</p>
        <button onClick={() => navigate('/customer/menu')} className="px-6 py-2 bg-primary/10 text-primary font-medium rounded-full">
          Xem thực đơn
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Giỏ hàng</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
        {items.map(item => (
          <div key={item.cartId} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3">
            <div className="w-20 h-20 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
               {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm text-gray-800 leading-tight pr-2">{item.name}</h3>
                  <button onClick={() => removeItem(item.cartId)} className="text-gray-400 hover:text-danger p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                {item.isWeightBased ? (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium mt-1 inline-block">Món Cân</span>
                ) : (
                  <p className="text-primary font-bold text-sm mt-1">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.finalPrice)}
                  </p>
                )}
                {item.note && <p className="text-xs text-gray-500 italic mt-1 line-clamp-1">"{item.note}"</p>}
              </div>
              
              {!item.isWeightBased && (
                <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg w-max mt-2">
                  <button onClick={() => updateQuantity(item.menuItemId, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm font-bold text-primary">−</button>
                  <span className="w-4 text-center font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menuItemId, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm font-bold text-primary">+</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Tạm tính (chưa gồm món cân)</span>
          <span className="text-xl font-bold text-primary">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getCartTotal())}
          </span>
        </div>
        <button 
          onClick={handleSubmitOrder}
          disabled={isSubmitting}
          className="w-full bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70"
        >
          {isSubmitting ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : (
            <>GỬI YÊU CẦU GỌI MÓN <ArrowRight size={20} /></>
          )}
        </button>
      </div>
    </div>
  );
}

// Temporary ShoppingCart icon component for fallback
const ShoppingCart = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);
