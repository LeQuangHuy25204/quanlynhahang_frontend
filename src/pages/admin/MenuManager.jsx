import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { 
  Plus, Search, Edit3, DollarSign, Tag, Check, X, AlertCircle, 
  Layers, ToggleLeft, ToggleRight, Sparkles, Filter 
} from 'lucide-react';
import { toast } from 'sonner';

export default function MenuManager() {
  const queryClient = useQueryClient();
  const { staff } = useAuthStore();
  const isRestaurantAdmin = staff?.roleCode === 'RestaurantAdmin';
  
  // State
  const [selectedBranchId, setSelectedBranchId] = useState(staff?.branchId || 1);
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'categories'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  React.useEffect(() => {
    if (staff?.branchId) {
      setSelectedBranchId(staff.branchId);
    }
  }, [staff?.branchId]);

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = create, object = edit
  const [itemForm, setItemForm] = useState({
    name: '',
    categoryId: '',
    basePrice: '',
    description: '',
    urlImage: '',
    isWeightBased: false,
    isActive: true,
  });

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideTargetItem, setOverrideTargetItem] = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    overridePrice: '',
    isAvailable: true,
  });

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  // Queries
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches').then(res => res.data),
  });
  const branches = branchesData || [];

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.get('/menu/categories').then(res => res.data),
  });
  const categories = categoriesData || [];

  const { data: menuData, isLoading: loadingMenu } = useQuery({
    queryKey: ['adminMenu', selectedBranchId],
    queryFn: () => apiClient.get(`/menu/admin?branchId=${selectedBranchId}`).then(res => res.data),
  });
  const menuItems = menuData?.items || [];

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: (data) => apiClient.post('/menu/items', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminMenu']);
      queryClient.invalidateQueries(['categories']);
      toast.success('Thêm món ăn mới thành công!');
      setItemModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi thêm món ăn.'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/menu/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminMenu']);
      toast.success('Cập nhật món ăn thành công!');
      setItemModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi cập nhật món ăn.'),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/menu/items/${id}/override`, { ...data, branchId: selectedBranchId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminMenu']);
      toast.success('Cập nhật thiết lập chi nhánh thành công!');
      setOverrideModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi đặt giá chi nhánh.'),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => apiClient.post('/menu/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      toast.success('Thêm danh mục mới thành công!');
      setCategoryModalOpen(false);
      setCategoryForm({ name: '', description: '' });
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi tạo danh mục.'),
  });

  // Handlers
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      categoryId: categories[0]?.categoryId || '',
      basePrice: '',
      description: '',
      urlImage: '',
      isWeightBased: false,
      isActive: true,
    });
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      categoryId: item.categoryId,
      basePrice: item.basePrice,
      description: item.description || '',
      urlImage: item.imageUrl || '',
      isWeightBased: item.isWeightBased,
      isActive: item.isActive,
    });
    setItemModalOpen(true);
  };

  const handleOpenOverride = (item) => {
    setOverrideTargetItem(item);
    setOverrideForm({
      overridePrice: item.overridePrice !== null ? item.overridePrice : '',
      isAvailable: item.branchAvailable,
    });
    setOverrideModalOpen(true);
  };

  const handleSubmitItem = (e) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.basePrice || !itemForm.categoryId) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    const payload = {
      name: itemForm.name,
      categoryId: Number(itemForm.categoryId),
      basePrice: Number(itemForm.basePrice),
      description: itemForm.description,
      urlImage: itemForm.urlImage,
      isWeightBased: itemForm.isWeightBased,
      isActive: itemForm.isActive,
    };

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.menuItemId, data: payload });
    } else {
      createItemMutation.mutate(payload);
    }
  };

  const handleSubmitOverride = (e) => {
    e.preventDefault();
    const payload = {
      overridePrice: overrideForm.overridePrice !== '' ? Number(overrideForm.overridePrice) : null,
      isAvailable: overrideForm.isAvailable,
      branchId: selectedBranchId,
    };
    overrideMutation.mutate({ id: overrideTargetItem.menuItemId, data: payload });
  };

  // Filtered menu items
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || String(item.categoryId) === String(selectedCategory);
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Layers className="text-primary" size={26} />
            Quản lý Thực đơn
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRestaurantAdmin ? 'Cấu hình thực đơn toàn hệ thống và theo từng chi nhánh' : 'Quản lý giá và tình trạng phục vụ món tại chi nhánh'}
          </p>
        </div>

        {/* Branch Selector for Admin */}
        <div className="flex items-center gap-3">
          {isRestaurantAdmin ? (
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-500">Chi nhánh:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.BranchID} value={b.BranchID}>
                    {b.Name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-primary-subtle text-primary text-xs font-bold px-3 py-1.5 rounded-xl">
              Chi nhánh: {branches.find(b => b.BranchID === selectedBranchId)?.Name || staff?.branchId}
            </div>
          )}

          {isRestaurantAdmin && activeTab === 'items' && (
            <button
              onClick={handleOpenCreateItem}
              className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={18} /> Thêm món mới
            </button>
          )}

          {isRestaurantAdmin && activeTab === 'categories' && (
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={18} /> Thêm danh mục
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'items'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Món ăn ({menuItems.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'categories'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Danh mục ({categories.length})
        </button>
      </div>

      {/* TAB 1: MENU ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm tên món ăn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              {categories.map((c) => (
                <button
                  key={c.categoryId}
                  onClick={() => setSelectedCategory(c.categoryId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    String(selectedCategory) === String(c.categoryId)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/80 text-xs uppercase font-bold text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Món ăn</th>
                    <th className="px-4 py-4">Danh mục</th>
                    <th className="px-4 py-4">Giá gốc</th>
                    <th className="px-4 py-4">Giá chi nhánh</th>
                    <th className="px-4 py-4">Trạng thái CN</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingMenu ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-400 font-medium">
                        Đang tải danh sách món...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-400 font-medium">
                        Không tìm thấy món ăn nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const hasOverride = item.overridePrice !== null;
                      const effectivePrice = hasOverride ? item.overridePrice : item.basePrice;

                      return (
                        <tr key={item.menuItemId} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">
                                  Ảnh
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                  {item.name}
                                  {item.isWeightBased && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                                      Theo cân
                                    </span>
                                  )}
                                  {!item.isActive && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                                      Ngừng bán gốc
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{item.description || 'Không có mô tả'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">
                              {item.categoryName}
                            </span>
                          </td>

                          <td className="px-4 py-4 font-bold text-gray-700">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.basePrice)}
                          </td>

                          <td className="px-4 py-4">
                            {hasOverride ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-primary">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.overridePrice)}
                                </span>
                                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">
                                  Đè giá
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Theo giá gốc</span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {item.branchAvailable ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <Check size={12} /> Đang phục vụ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                <X size={12} /> Tạm hết / Ẩn
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Override Button (Manager & Admin) */}
                              <button
                                onClick={() => handleOpenOverride(item)}
                                title="Cài đặt giá và tình trạng chi nhánh"
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
                              >
                                <DollarSign size={14} className="text-primary" />
                                Cài đặt CN
                              </button>

                              {/* Edit Base Item Button (Restaurant Admin Only) */}
                              {isRestaurantAdmin && (
                                <button
                                  onClick={() => handleOpenEditItem(item)}
                                  title="Chỉnh sửa món gốc"
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Edit3 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loadingCategories ? (
              <p className="text-gray-400">Đang tải danh mục...</p>
            ) : categories.length === 0 ? (
              <p className="text-gray-400">Chưa có danh mục nào.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.categoryId} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base text-gray-800">{cat.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{cat.description || 'Chưa có mô tả'}</p>
                    <div className="mt-3 inline-block text-[11px] font-bold bg-primary-subtle text-primary px-2 py-0.5 rounded-md">
                      {cat.itemCount} món ăn
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: Thêm/Sửa Món ăn gốc (RestaurantAdmin) */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-lg text-gray-800">
                {editingItem ? 'Chỉnh sửa Món Ăn Gốc' : 'Thêm Món Ăn Mới (Cấp Nhà Hàng)'}
              </h2>
              <button onClick={() => setItemModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tên món ăn *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="VD: Bò Wagyu Nướng Tảng"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Danh mục *</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Giá gốc (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={itemForm.basePrice}
                    onChange={(e) => setItemForm({ ...itemForm, basePrice: e.target.value })}
                    placeholder="250000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">URL Hình ảnh</label>
                <input
                  type="url"
                  value={itemForm.urlImage}
                  onChange={(e) => setItemForm({ ...itemForm, urlImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Mô tả món ăn</label>
                <textarea
                  rows="2"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Thịt bò ướp sốt đặc biệt kèm rau củ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={itemForm.isWeightBased}
                    onChange={(e) => setItemForm({ ...itemForm, isWeightBased: e.target.checked })}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span>Món bán theo cân (kg)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={itemForm.isActive}
                    onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span>Kích hoạt kinh doanh</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-sm"
                >
                  {createItemMutation.isPending || updateItemMutation.isPending ? 'Đang lưu...' : 'Lưu món ăn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Đè giá & Ẩn/Hiện món tại Chi Nhánh (BranchManager & RestaurantAdmin) */}
      {overrideModalOpen && overrideTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="font-black text-lg text-gray-800">Cấu hình món tại Chi nhánh</h2>
                <p className="text-xs text-primary font-bold mt-0.5">{overrideTargetItem.name}</p>
              </div>
              <button onClick={() => setOverrideModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitOverride} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Giá gốc hệ thống:</span>
                  <span className="font-bold text-gray-800">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(overrideTargetItem.basePrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Chi nhánh áp dụng:</span>
                  <span className="font-bold text-gray-800">
                    {branches.find(b => b.BranchID === selectedBranchId)?.Name || `Chi nhánh ${selectedBranchId}`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Giá đè chi nhánh (Để trống nếu muốn áp dụng giá gốc)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={overrideForm.overridePrice}
                    onChange={(e) => setOverrideForm({ ...overrideForm, overridePrice: e.target.value })}
                    placeholder="Nhập giá bán riêng cho chi nhánh này..."
                    className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">VNĐ</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Tình trạng phục vụ tại chi nhánh</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOverrideForm({ ...overrideForm, isAvailable: true })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      overrideForm.isAvailable
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Check size={16} /> Còn món phục vụ
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideForm({ ...overrideForm, isAvailable: false })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      !overrideForm.isAvailable
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <X size={16} /> Tạm hết món
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={overrideMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-sm"
                >
                  {overrideMutation.isPending ? 'Đang lưu...' : 'Lưu thiết lập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm Danh mục mới (RestaurantAdmin) */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-lg text-gray-800">Thêm Danh Mục Mới</h2>
              <button onClick={() => setCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!categoryForm.name) return toast.error('Vui lòng nhập tên danh mục.');
                createCategoryMutation.mutate(categoryForm);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tên danh mục *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="VD: Thịt Nướng Đặc Biệt"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Mô tả</label>
                <textarea
                  rows="2"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Mô tả danh mục..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-sm"
                >
                  {createCategoryMutation.isPending ? 'Đang tạo...' : 'Tạo danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
