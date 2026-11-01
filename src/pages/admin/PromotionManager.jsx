import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { 
  Tag, Plus, Search, Edit2, Check, X, Calendar, 
  Percent, DollarSign, Sparkles, AlertCircle,
  Receipt, Utensils, Layers, SlidersHorizontal 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SCOPE_OPTIONS = [
  { value: 'INVOICE', label: 'Toàn hóa đơn', Icon: Receipt },
  { value: 'MENU_ITEM', label: 'Món cụ thể', Icon: Utensils },
  { value: 'CATEGORY', label: 'Danh mục món', Icon: Layers },
];

const emptyPromoForm = (defaultBranchId = '') => ({
  name: '',
  description: '',
  branchId: defaultBranchId,
  discountType: 'PERCENT',
  discountValue: '',
  applyLevel: 'INVOICE',
  menuItemIds: [],
  targetCategoryId: '',
  minOrderAmount: '',
  minItemCount: '',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: '',
  isActive: true,
});

const describeScope = (promo) => {
  const perUnit = promo.DiscountType === 'FIXED' && promo.ApplyLevel !== 'INVOICE' ? ' · giảm mỗi phần' : '';
  if (promo.ApplyLevel === 'MENU_ITEM') {
    const items = promo.MenuItems || promo.menuItems || [];
    const names = items.map((m) => m.Name || m.name);
    return `Món: ${names.length ? names.join(', ') : 'chưa chọn'}${perUnit}`;
  }
  if (promo.ApplyLevel === 'CATEGORY') {
    return `Danh mục: ${promo.TargetCategoryName || promo.targetCategoryName || 'chưa chọn'}${perUnit}`;
  }
  return 'Toàn bộ hóa đơn';
};

export default function PromotionManager() {
  const queryClient = useQueryClient();
  const { staff } = useAuthStore();
  const isRestaurantAdmin = staff?.roleCode === 'RestaurantAdmin';
  const isBranchManager = staff?.roleCode === 'BranchManager';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [promoForm, setPromoForm] = useState(emptyPromoForm());

  // Queries
  const { data: promotionsData, isLoading: loadingPromos } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => apiClient.get('/promotions').then(res => res.data),
  });
  const promotions = promotionsData || [];

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches').then(res => res?.data || res),
  });
  const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.data || []);

  // Dữ liệu cho form: danh sách món & danh mục để chọn phạm vi áp dụng
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.get('/menu/categories').then((res) => res?.data || res),
  });
  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : (categoriesData?.data || []);

  const { data: menuData } = useQuery({
    queryKey: ['adminMenu', staff?.branchId || 1],
    queryFn: () => apiClient.get(`/menu/admin?branchId=${staff?.branchId || 1}`).then((res) => res?.data || res),
  });
  const menuItems = Array.isArray(menuData)
    ? menuData
    : (menuData?.items || menuData?.data?.items || []);
  const filteredMenuItems = menuItems.filter((i) =>
    (i.name || i.Name || '').toLowerCase().includes(itemSearch.toLowerCase())
  );

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
    setItemSearch('');
    setPromoForm(emptyPromoForm(isBranchManager ? String(staff?.branchId || 1) : ''));
    setModalOpen(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo);
    setItemSearch('');
    const rawIds = promo.MenuItemIds || promo.menuItemIds || (promo.MenuItems || []).map((m) => m.MenuItemID || m.menuItemId) || [];
    setPromoForm({
      name: promo.Name,
      description: promo.Description || '',
      branchId: promo.BranchID != null ? String(promo.BranchID) : '',
      discountType: promo.DiscountType,
      discountValue: promo.DiscountValue,
      applyLevel: promo.ApplyLevel || 'INVOICE',
      menuItemIds: rawIds.map(Number),
      targetCategoryId: (promo.TargetCategoryID || promo.targetCategoryId) ? String(promo.TargetCategoryID || promo.targetCategoryId) : '',
      minOrderAmount: promo.MinOrderAmount != null ? Number(promo.MinOrderAmount) : '',
      minItemCount: promo.MinItemCount != null ? Number(promo.MinItemCount) : '',
      startDate: promo.StartDate ? format(new Date(promo.StartDate), 'yyyy-MM-dd') : '',
      endDate: promo.EndDate ? format(new Date(promo.EndDate), 'yyyy-MM-dd') : '',
      isActive: promo.IsActive === 1,
    });
    setModalOpen(true);
  };

  const toggleMenuItem = (id) => {
    setPromoForm((f) => ({
      ...f,
      menuItemIds: f.menuItemIds.includes(id)
        ? f.menuItemIds.filter((x) => x !== id)
        : [...f.menuItemIds, id],
    }));
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
    if (promoForm.discountType === 'PERCENT' && Number(promoForm.discountValue) > 100) {
      return toast.error('Giảm phần trăm không được vượt quá 100%.');
    }
    if (promoForm.applyLevel === 'MENU_ITEM' && promoForm.menuItemIds.length === 0) {
      return toast.error('Vui lòng chọn ít nhất một món áp dụng.');
    }
    if (promoForm.applyLevel === 'CATEGORY' && !promoForm.targetCategoryId) {
      return toast.error('Vui lòng chọn danh mục áp dụng.');
    }

    const payload = {
      name: promoForm.name.trim(),
      description: promoForm.description.trim(),
      branchId: isBranchManager ? (staff?.branchId || null) : (promoForm.branchId ? Number(promoForm.branchId) : null),
      discountType: promoForm.discountType,
      discountValue: Number(promoForm.discountValue),
      applyLevel: promoForm.applyLevel,
      menuItemIds: promoForm.applyLevel === 'MENU_ITEM' ? promoForm.menuItemIds : [],
      targetCategoryId: promoForm.applyLevel === 'CATEGORY' ? Number(promoForm.targetCategoryId) : null,
      minOrderAmount: promoForm.minOrderAmount !== '' ? Number(promoForm.minOrderAmount) : null,
      minItemCount: promoForm.minItemCount !== '' ? Number(promoForm.minItemCount) : null,
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
            {isBranchManager ? 'Quản lý Khuyến mãi Chi nhánh' : 'Quản lý Chương trình Khuyến mãi'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRestaurantAdmin 
              ? 'Tạo và kích hoạt các ưu đãi giảm giá toàn chuỗi hoặc theo từng chi nhánh' 
              : `Quản lý và kích hoạt các ưu đãi giảm giá áp dụng riêng cho chi nhánh của bạn`}
          </p>
        </div>

        {(isRestaurantAdmin || isBranchManager) && (
          <button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18} /> {isBranchManager ? 'Thêm khuyến mãi chi nhánh' : 'Thêm khuyến mãi'}
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

                  <div className="mt-4 flex flex-wrap gap-1.5 items-center">
                    {promo.BranchID ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        Chi nhánh: {promo.BranchName || promo.BranchID}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                        Toàn chuỗi
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {describeScope(promo)}
                    </span>
                    {Number(promo.MinOrderAmount) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                        Hóa đơn từ {new Intl.NumberFormat('vi-VN').format(promo.MinOrderAmount)}đ
                      </span>
                    )}
                    {Number(promo.MinItemCount) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                        Từ {promo.MinItemCount} món
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 pt-4 border-t border-gray-100 text-xs text-gray-500">
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

                  {isRestaurantAdmin ? (
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
                  ) : isBranchManager ? (
                    promo.BranchID === staff?.branchId ? (
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
                    ) : (
                      <span className="text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                        Toàn chuỗi (Chỉ xem)
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Thêm / Sửa khuyến mãi */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h2 className="font-black text-lg text-gray-800">
                {editingPromo ? 'Chỉnh Sửa Chương Trình Khuyến Mãi' : 'Tạo Khuyến Mãi Mới'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {isRestaurantAdmin && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Chi nhánh áp dụng</label>
                  <select
                    value={promoForm.branchId}
                    onChange={(e) => setPromoForm({ ...promoForm, branchId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary bg-white font-semibold"
                  >
                    <option value="">-- Toàn bộ hệ thống (Tất cả chi nhánh) --</option>
                    {branches.map((b) => (
                      <option key={b.BranchID} value={b.BranchID}>{b.Name}</option>
                    ))}
                  </select>
                </div>
              )}

              {isBranchManager && (
                <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-900">Chi nhánh áp dụng:</span>
                  <span className="font-black text-purple-700">Chi nhánh {staff?.branchId} (Khuyến mãi riêng của chi nhánh bạn)</span>
                </div>
              )}

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

              {/* Phạm vi áp dụng */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Phạm vi áp dụng *</label>
                <div className="grid grid-cols-3 gap-2">
                  {SCOPE_OPTIONS.map((opt) => {
                    const active = promoForm.applyLevel === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setPromoForm({ ...promoForm, applyLevel: opt.value })}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          active
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <opt.Icon size={16} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {promoForm.applyLevel === 'MENU_ITEM' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Chọn món áp dụng *{' '}
                    <span className="font-normal text-gray-400">(đã chọn {promoForm.menuItemIds.length})</span>
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Tìm món..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {filteredMenuItems.length === 0 ? (
                      <p className="p-3 text-xs text-gray-400 text-center">Không tìm thấy món nào.</p>
                    ) : (
                      filteredMenuItems.map((item) => {
                        const itemId = item.menuItemId || item.MenuItemID;
                        const itemName = item.name || item.Name;
                        const catName = item.categoryName || item.CategoryName;
                        return (
                          <label
                            key={itemId}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={promoForm.menuItemIds.includes(itemId)}
                              onChange={() => toggleMenuItem(itemId)}
                              className="w-4 h-4 text-primary rounded"
                            />
                            <span className="font-semibold text-gray-700 truncate">{itemName}</span>
                            <span className="ml-auto text-[11px] text-gray-400 shrink-0">{catName}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {promoForm.applyLevel === 'CATEGORY' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Danh mục áp dụng *</label>
                  <select
                    value={promoForm.targetCategoryId}
                    onChange={(e) => setPromoForm({ ...promoForm, targetCategoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary bg-white font-semibold"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => {
                      const catId = c.categoryId || c.CategoryID;
                      const catName = c.name || c.Name;
                      return (
                        <option key={catId} value={catId}>{catName}</option>
                      );
                    })}
                  </select>
                </div>
              )}

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
                    Giá trị giảm ({promoForm.discountType === 'PERCENT'
                      ? '%'
                      : (promoForm.applyLevel === 'INVOICE' ? 'VNĐ' : 'VNĐ / mỗi phần')}) *
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

              {/* Điều kiện áp dụng */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-primary" />
                  Điều kiện áp dụng (tùy chọn)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hóa đơn tối thiểu (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      value={promoForm.minOrderAmount}
                      onChange={(e) => setPromoForm({ ...promoForm, minOrderAmount: e.target.value })}
                      placeholder="VD: 500000"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Số món tối thiểu</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={promoForm.minItemCount}
                      onChange={(e) => setPromoForm({ ...promoForm, minItemCount: e.target.value })}
                      placeholder="VD: 3"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary bg-white"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  {promoForm.applyLevel === 'INVOICE'
                    ? 'Để trống nếu không giới hạn. Số món được tính trên toàn bộ hóa đơn.'
                    : 'Hóa đơn tối thiểu tính trên tổng tạm tính của cả hóa đơn; số món tối thiểu chỉ tính các món thuộc ưu đãi này.'}
                </p>
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
              </div>

              <div className="flex justify-end gap-3 p-4 bg-gray-50/80 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createPromoMutation.isPending || updatePromoMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-sm transition-all active:scale-95 disabled:opacity-70"
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
