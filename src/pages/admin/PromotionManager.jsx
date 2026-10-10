import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { 
  Tag, Plus, Search, Edit2, Check, X, Calendar, 
  Percent, DollarSign, Sparkles, AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PromotionManager() {
  const queryClient = useQueryClient();
  const { staff } = useAuthStore();
  const isRestaurantAdmin = staff?.roleCode === 'RestaurantAdmin';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({
    name: '',
    description: '',
    discountType: 'PERCENT',
    discountValue: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    isActive: true,
  });

  // Queries
  const { data: promotionsData, isLoading: loadingPromos } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => apiClient.get('/promotions').then(res => res.data),
  });
  const promotions = promotionsData || [];

  // Mutations
  const createPromoMutation = useMutation({
    mutationFn: (data) => apiClient.post('/promotions', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['promotions']);
      toast.success('Tạo chương trình khuyến mãi thành công!');
      setModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi tạo khuyến mãi.'),
  });

  const updatePromoMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/promotions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['promotions']);
      toast.success('Cập nhật khuyến mãi thành công!');
      setModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi cập nhật khuyến mãi.'),
  });

  // Handlers
  const handleOpenCreate = () => {
    setEditingPromo(null);
    setPromoForm({
      name: '',
      description: '',
      discountType: 'PERCENT',
      discountValue: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      name: promo.Name,
      description: promo.Description || '',
      discountType: promo.DiscountType,
      discountValue: promo.DiscountValue,
      startDate: promo.StartDate ? format(new Date(promo.StartDate), 'yyyy-MM-dd') : '',
      endDate: promo.EndDate ? format(new Date(promo.EndDate), 'yyyy-MM-dd') : '',
      isActive: promo.IsActive === 1,
    });
    setModalOpen(true);
  };

  const handleToggleStatus = (promo) => {
    updatePromoMutation.mutate({
      id: promo.PromotionID,
      data: { isActive: promo.IsActive === 1 ? 0 : 1 }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!promoForm.name || !promoForm.discountValue || !promoForm.startDate) {
      return toast.error('Vui lòng điền đầy đủ thông tin bắt buộc.');
    }

    const payload = {
      name: promoForm.name.trim(),
      description: promoForm.description.trim(),
      discountType: promoForm.discountType,
      discountValue: Number(promoForm.discountValue),
      startDate: promoForm.startDate,
      endDate: promoForm.endDate || null,
      isActive: promoForm.isActive ? 1 : 0,
    };

    if (editingPromo) {
      updatePromoMutation.mutate({ id: editingPromo.PromotionID, data: payload });
    } else {
      createPromoMutation.mutate(payload);
    }
  };

  const filteredPromos = promotions.filter((p) => {
    const matchesSearch = p.Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.Description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || p.DiscountType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Tag className="text-primary" size={26} />
            Quản lý Chương trình Khuyến mãi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRestaurantAdmin 
              ? 'Tạo và kích hoạt các ưu đãi giảm giá theo phần trăm hoặc số tiền cho khách hàng' 
              : 'Xem các chương trình ưu đãi hiện hành của hệ thống'}
          </p>
        </div>

        {isRestaurantAdmin && (
          <button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18} /> Thêm khuyến mãi
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên ưu đãi, mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {['ALL', 'PERCENT', 'FIXED'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === t
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'ALL' ? 'Tất cả loại' : t === 'PERCENT' ? 'Giảm theo phần trăm (%)' : 'Giảm tiền mặt (VNĐ)'}
            </button>
          ))}
        </div>
      </div>

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loadingPromos ? (
          <div className="col-span-full py-12 text-center text-gray-400 font-medium">
            Đang tải chương trình khuyến mãi...
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 font-medium bg-white rounded-2xl border border-gray-100">
            Chưa có chương trình khuyến mãi nào.
          </div>
        ) : (
          filteredPromos.map((promo) => {
            const isActive = promo.IsActive === 1;
            const isPercent = promo.DiscountType === 'PERCENT';

            return (
              <div
                key={promo.PromotionID}
                className={`p-6 rounded-2xl bg-white border transition-all hover:shadow-md flex flex-col justify-between ${
                  isActive ? 'border-gray-100' : 'border-gray-200 bg-gray-50/60 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-lg text-gray-800 leading-tight">{promo.Name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{promo.Description || 'Không có mô tả chi tiết'}</p>
                    </div>

                    <div className="shrink-0">
                      {isPercent ? (
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex flex-col items-center justify-center font-black text-sm">
                          <span>{promo.DiscountValue}%</span>
                          <span className="text-[9px] uppercase font-bold text-amber-500">Giảm</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-xs text-center">
                          -{new Intl.NumberFormat('vi-VN').format(promo.DiscountValue)}đ
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" /> Ngày bắt đầu:
                      </span>
                      <span className="font-bold text-gray-700">
                        {promo.StartDate ? format(new Date(promo.StartDate), 'dd/MM/yyyy') : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" /> Ngày kết thúc:
                      </span>
                      <span className="font-bold text-gray-700">
                        {promo.EndDate ? format(new Date(promo.EndDate), 'dd/MM/yyyy') : 'Vô thời hạn'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                      isActive
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-gray-500 bg-gray-100 border-gray-200'
                    }`}
                  >
                    {isActive ? <Check size={12} /> : <X size={12} />}
                    {isActive ? 'Đang hiệu lực' : 'Đã tạm dừng'}
                  </span>

                  {isRestaurantAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(promo)}
                        title={isActive ? 'Tạm dừng khuyến mãi' : 'Kích hoạt lại khuyến mãi'}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {isActive ? 'Tắt' : 'Bật'}
                      </button>

                      <button
                        onClick={() => handleOpenEdit(promo)}
                        title="Chỉnh sửa khuyến mãi"
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Thêm / Sửa khuyến mãi */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-lg text-gray-800">
                {editingPromo ? 'Chỉnh Sửa Chương Trình Khuyến Mãi' : 'Tạo Khuyến Mãi Mới'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tên chương trình *</label>
                <input
                  type="text"
                  required
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  placeholder="VD: Khai trương giảm 20% tổng hóa đơn"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Mô tả ưu đãi</label>
                <textarea
                  rows="2"
                  value={promoForm.description}
                  onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  placeholder="Áp dụng cho mọi bàn đặt trước trong tuần..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Hình thức giảm giá *</label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary bg-white font-semibold"
                  >
                    <option value="PERCENT">Giảm phần trăm (%)</option>
                    <option value="FIXED">Giảm số tiền cố định (VNĐ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Giá trị giảm ({promoForm.discountType === 'PERCENT' ? '%' : 'VNĐ'}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={promoForm.discountType === 'PERCENT' ? '100' : undefined}
                    required
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                    placeholder={promoForm.discountType === 'PERCENT' ? '20' : '50000'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={promoForm.startDate}
                    onChange={(e) => setPromoForm({ ...promoForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Ngày kết thúc (tùy chọn)</label>
                  <input
                    type="date"
                    value={promoForm.endDate}
                    onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createPromoMutation.isPending || updatePromoMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-sm"
                >
                  {createPromoMutation.isPending || updatePromoMutation.isPending ? 'Đang lưu...' : 'Lưu khuyến mãi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
