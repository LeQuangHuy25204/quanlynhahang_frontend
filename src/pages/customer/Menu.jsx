import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../store/sessionStore';
import { useCartStore } from '../../store/cartStore';
import apiClient from '../../api/client';
import { Search, Info, Plus, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';

export default function Menu() {
  const { branchId, status, sessionToken, setSession } = useSessionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

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
    <div className="pb-6 relative h-full flex flex-col">
      {status === 0 && (
        <div className="bg-warning text-white p-3 text-center text-sm sticky top-0 z-10 font-medium">
          Vui lòng đợi nhân viên xác nhận mở bàn để gọi món.
        </div>
      )}
      
      {/* Search & Categories */}
      <div className="sticky top-0 z-10 bg-white pt-3 px-4 shadow-sm pb-2">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm món ăn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Tất cả
          </button>
          {categories.map(cat => (
            <button
              key={cat.categoryId}
              onClick={() => setActiveCategory(cat.categoryId)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.categoryId ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {cat.categoryName}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {displayItems.map(item => (
          <div 
            key={item.menuItemId} 
            className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-[0.98]" 
            onClick={() => setSelectedItem(item)}
          >
            <div className="h-32 bg-gray-100 relative overflow-hidden group">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                  <UtensilsCrossed size={36} opacity={0.5}/>
                </div>
              )}
              {item.isWeightBased && (
                <span className="absolute top-2 right-2 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm">
                  MÓN CÂN
                </span>
              )}
              {/* Soft overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="p-3.5 flex-1 flex flex-col">
              <h3 className="text-sm font-bold text-gray-800 leading-snug mb-1.5 line-clamp-2">{item.name}</h3>
              <p className="text-primary font-extrabold text-[15px] mt-auto">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.finalPrice)}
              </p>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                className="mt-2.5 w-full py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary hover:text-white active:scale-95 transition-all duration-200"
                disabled={status === 0}
              >
                + THÊM
              </button>
            </div>
          </div>
        ))}
      </div>
      
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
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-50 p-5 shadow-xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold pr-8">{item.name}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">✕</button>
        </div>
        
        {item.description && <p className="text-gray-500 text-sm mb-4">{item.description}</p>}
        
        <p className="text-xl font-bold text-primary mb-6">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.finalPrice)}
        </p>

        {item.isWeightBased && (
          <div className="bg-blue-50 text-blue-800 p-3 rounded-xl flex items-start gap-3 mb-6 text-sm">
            <Info className="shrink-0 mt-0.5 text-blue-500" size={18} />
            <p>Giá hiển thị là mức giá tham khảo. Trọng lượng thực tế sẽ được nhân viên cân và xác nhận sau khi gọi món.</p>
          </div>
        )}

        {!item.isWeightBased && (
          <div className="flex items-center justify-between mb-6">
            <span className="font-medium">Số lượng</span>
            <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-xl">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-lg text-primary hover:bg-gray-100">−</button>
              <span className="w-6 text-center font-bold">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-lg text-primary hover:bg-gray-100">+</button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <span className="font-medium block mb-2">Ghi chú (Không bắt buộc)</span>
          <textarea 
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows="2"
            placeholder="Ví dụ: Không hành, ít cay..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button 
          onClick={handleAdd}
          disabled={status === 0}
          className="w-full py-4 bg-primary text-white font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          {status === 0 ? 'CHỜ MỞ BÀN' : 'THÊM VÀO GIỎ HÀNG'}
        </button>
      </div>
    </>
  );
}
