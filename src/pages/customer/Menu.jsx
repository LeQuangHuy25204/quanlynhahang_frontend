import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../store/sessionStore';
import { useCartStore } from '../../store/cartStore';
import apiClient from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UtensilsCrossed, Bell, ShoppingCart, Minus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Menu() {
  const navigate = useNavigate();
  const { branchId, status, sessionToken, setSession, table } = useSessionStore();
  const cartItems = useCartStore(state => state.items);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const addItem = useCartStore(state => state.addItem);

  const handleItemClick = (item, e) => {
    if (e) e.stopPropagation();
    if (status === 0) {
      toast.error('Bàn chưa được mở. Vui lòng đợi.');
      return;
    }
    if (item.isWeightBased) {
      setSelectedItem(item);
    } else {
      addItem({ ...item, quantity: 1, note: '' });
      toast.success(`Đã thêm ${item.name} vào giỏ`);
    }
  };

  // Calculate cart total
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

  // Poll session status every 5 seconds if waiting
  useQuery({
    queryKey: ['sessionStatus', sessionToken],
    queryFn: async () => {
      const res = await apiClient.get(`/sessions/${sessionToken}/status`);
      if (res.data.status !== status) {
        setSession({ status: res.data.status });
      }
      return res.data;
    },
    refetchInterval: status === 0 ? 5000 : false,
    enabled: !!sessionToken && status === 0,
  });

  
  const { data: menuData, isLoading } = useQuery({
    queryKey: ['menu', branchId],
    queryFn: () => apiClient.get(`/menu?branchId=${branchId}`).then(res => res.data)
  });

  if (isLoading) return <div className="p-10 text-center text-gray-500">Đang tải thực đơn...</div>;
  if (!menuData) return <div className="p-10 text-center text-gray-500">Không thể tải thực đơn</div>;

  const categories = menuData.categories || [];
  
  // Filter logic
  let displayItems = [];
  if (activeCategory === 'all') {
    categories.forEach(cat => displayItems.push(...cat.items));
  } else {
    const cat = categories.find(c => c.categoryId === activeCategory);
    if (cat) displayItems = [...cat.items];
  }
  
  if (searchTerm) {
    displayItems = displayItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-page relative pb-52">
      {/* Top Warning if Waiting */}
      {status === 0 && (
        <div className="bg-warning text-white p-3 text-center text-[13px] font-bold z-20 sticky top-0 shadow-sm">
          Vui lòng đợi nhân viên xác nhận mở bàn để gọi món.
        </div>
      )}

      {/* Search & Categories */}
      <div className="bg-white px-6 pb-2 pt-4 sticky top-0 z-10 shadow-sm">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
          <input 
            type="text" 
            placeholder="Tìm món trong thực đơn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-bg-page border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
        
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
              activeCategory === 'all' 
                ? 'bg-primary text-white shadow-md shadow-primary/30' 
                : 'bg-white border border-border text-text-secondary hover:bg-gray-50'
            }`}
          >
            Tất cả
          </button>
          {categories.map(cat => (
            <button
              key={cat.categoryId}
              onClick={() => setActiveCategory(cat.categoryId)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                activeCategory === cat.categoryId 
                  ? 'bg-primary text-white shadow-md shadow-primary/30' 
                  : 'bg-white border border-border text-text-secondary hover:bg-gray-50'
              }`}
            >
              {cat.categoryName}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-6 py-6">
        <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-4">
          {activeCategory === 'all' ? (searchTerm ? 'KẾT QUẢ TÌM KIẾM' : 'MÓN PHỔ BIẾN') : categories.find(c => c.categoryId === activeCategory)?.categoryName}
        </div>
        
        <div className="flex flex-col gap-4">
          {displayItems.map(item => (
            <div 
              key={item.menuItemId} 
              className="bg-white rounded-[20px] p-3 shadow-sm border border-border flex gap-4 items-center active:scale-[0.98] transition-transform cursor-pointer group" 
              onClick={(e) => handleItemClick(item, e)}
            >
              <div className="w-[84px] h-[84px] bg-bg-page rounded-[14px] overflow-hidden flex-shrink-0 relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                    <UtensilsCrossed size={24} opacity={0.5}/>
                  </div>
                )}
                {item.isWeightBased && (
                  <span className="absolute top-1 right-1 bg-info text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow-sm">
                    CÂN
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0 py-1">
                <h3 className="text-[15px] font-bold text-text-primary leading-tight truncate">{item.name}</h3>
                <p className="text-[12px] text-text-tertiary leading-snug mt-1 line-clamp-2 pr-8">{item.description || 'Món ăn đặc trưng của nhà hàng BBQ'}</p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-primary font-bold text-[14px]">
                    {new Intl.NumberFormat('vi-VN').format(item.finalPrice)}đ
                  </p>
                </div>
              </div>

              <div className="self-end pr-2 pb-1">
                <button 
                  onClick={(e) => handleItemClick(item, e)}
                  className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md shadow-primary/30 hover:bg-primary-hover active:scale-90 transition-all disabled:opacity-50"
                  disabled={status === 0}
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
          
          {displayItems.length === 0 && (
            <div className="text-center py-12 text-text-tertiary text-[14px]">
              Không tìm thấy món ăn nào.
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart & Staff Button */}
      {status === 1 && (
        <div className="fixed bottom-[100px] left-0 right-0 mx-auto max-w-md px-6 z-30 flex flex-col items-end gap-3 pointer-events-none">
          <button className="pointer-events-auto bg-white text-primary border border-border shadow-lg px-5 py-2.5 rounded-full font-bold text-[13px] flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all">
            <Bell size={16} /> Gọi nhân viên
          </button>
          
          {cartItems.length > 0 && (
            <div 
              onClick={() => navigate('/customer/cart')}
              className="pointer-events-auto w-full bg-primary text-white p-1 rounded-2xl shadow-xl shadow-primary/30 flex items-center p-1 cursor-pointer active:scale-[0.98] transition-transform"
            >
               <div className="flex-1 flex items-center gap-3 pl-4">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold text-[13px]">
                    {cartItems.length}
                  </div>
                  <span className="font-bold text-[15px]">Xem giỏ hàng</span>
               </div>
               <div className="px-6 py-4 bg-white/20 rounded-xl font-extrabold text-[15px]">
                  {new Intl.NumberFormat('vi-VN').format(cartTotal)}đ
               </div>
            </div>
          )}
        </div>
      )}
      
      {/* Bottom Sheet for Item Detail */}
      {selectedItem && (
        <ItemDetailSheet 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          status={status}
        />
      )}
    </div>
  );
}

function ItemDetailSheet({ item, onClose, status }) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const addItem = useCartStore(state => state.addItem);

  const handleAdd = () => {
    if (status === 0) {
      toast.error('Bàn chưa được mở. Vui lòng đợi.');
      return;
    }
    addItem({ ...item, quantity, note });
    toast.success(`Đã thêm ${item.name} vào giỏ`);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[60] transition-opacity backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md h-[85vh] bg-white rounded-t-3xl z-[70] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-[24px] font-extrabold text-text-primary leading-tight pr-8">{item.name}</h2>
            <button onClick={onClose} className="w-8 h-8 flex shrink-0 items-center justify-center bg-bg-page rounded-full text-text-tertiary hover:bg-gray-200 hover:text-text-secondary transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <p className="text-[20px] font-black text-primary mb-3">
            {new Intl.NumberFormat('vi-VN').format(item.finalPrice)}đ
          </p>

          <p className="text-text-secondary text-[14px] leading-relaxed mb-6">
            {item.description || 'Món ăn đặc trưng của nhà hàng BBQ'}
          </p>

          {item.isWeightBased && (
            <div className="bg-info/10 text-info p-4 rounded-2xl flex items-start gap-3 mb-6">
              <span className="font-bold shrink-0 mt-0.5">ℹ</span>
              <p className="text-[13px] leading-relaxed">Giá hiển thị là mức giá tham khảo. Trọng lượng thực tế sẽ được nhân viên cân và xác nhận sau khi gọi món.</p>
            </div>
          )}

          <div className="h-[1px] w-full bg-border mb-6"></div>

          <div className="mb-8">
            <span className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">
              {item.isWeightBased ? 'SỐ LƯỢNG ƯỚC TÍNH (KG)' : 'SỐ LƯỢNG MÓN'}
            </span>
            {item.isWeightBased ? (
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-24 text-center font-bold text-[24px] text-text-primary border-b-2 border-primary focus:outline-none bg-transparent"
                />
                <span className="text-[18px] font-medium text-text-secondary">kg</span>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 flex items-center justify-center bg-bg-page border border-border rounded-2xl shadow-sm text-text-secondary hover:bg-gray-100 active:scale-95 transition-all">
                  <Minus size={20} />
                </button>
                <span className="w-12 text-center font-bold text-[24px] text-text-primary">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 flex items-center justify-center bg-primary-subtle text-primary rounded-2xl shadow-sm hover:bg-primary/20 active:scale-95 transition-all">
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="mb-6">
            <span className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">GHI CHÚ (NẾU CÓ)</span>
            <textarea 
              className="w-full p-4 bg-bg-page border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium transition-all"
              rows="3"
              placeholder="Ví dụ: Không hành, ít cay..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Sticky Add Button */}
        <div className="p-6 bg-white border-t border-border">
          <button 
            onClick={handleAdd}
            disabled={status === 0}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-primary/30 flex items-center justify-center gap-2"
          >
            {status === 0 ? 'Chưa mở bàn' : (
              <>
                <ShoppingCart size={18} />
                Thêm vào giỏ - {new Intl.NumberFormat('vi-VN').format(item.finalPrice * quantity)}đ
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
