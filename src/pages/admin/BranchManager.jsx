import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { 
  MapPin, Plus, Edit2, Phone, Clock, Percent, 
  Receipt, Building2, Check, X, Shield, Settings, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

export default function BranchManager() {
  const queryClient = useQueryClient();
  const { staff } = useAuthStore();
  const isRestaurantAdmin = staff?.roleCode === 'RestaurantAdmin';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    bussinessStartHour: '10:00:00',
    vatRate: 8,
    serviceFeeRate: 5,
    taxCode: '',
    isActive: true,
  });

  // Queries
  const { data: branchesData, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches').then(res => res.data || res),
  });
  const branches = Array.isArray(branchesData) 
    ? branchesData 
    : (Array.isArray(branchesData?.data) ? branchesData.data : []);

  // Mutations
  const createBranchMutation = useMutation({
    mutationFn: (data) => apiClient.post('/branches', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      toast.success('Thêm chi nhánh mới thành công!');
      setModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi tạo chi nhánh.'),
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/branches/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      toast.success('Cập nhật cấu hình chi nhánh thành công!');
      setModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi cập nhật chi nhánh.'),
  });

  // Handlers
  const handleOpenCreate = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      address: '',
      phone: '',
      bussinessStartHour: '10:00:00',
      vatRate: 8,
      serviceFeeRate: 5,
      taxCode: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.Name,
      address: b.Address || '',
      phone: b.Phone || '',
      bussinessStartHour: b.BussinessStartHour || '10:00:00',
      vatRate: b.VATRate != null ? Number(b.VATRate) : 8,
      serviceFeeRate: b.ServiceFeeRate != null ? Number(b.ServiceFeeRate) : 5,
      taxCode: b.TaxCode || '',
      isActive: b.IsActive === 1,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!branchForm.name || !branchForm.address || !branchForm.phone) {
      return toast.error('Vui lòng điền các thông tin bắt buộc.');
    }

    const payload = {
      name: branchForm.name.trim(),
      address: branchForm.address.trim(),
      phone: branchForm.phone.trim(),
      bussinessStartHour: branchForm.bussinessStartHour,
      vatRate: Number(branchForm.vatRate),
      serviceFeeRate: Number(branchForm.serviceFeeRate),
      taxCode: branchForm.taxCode?.trim() || null,
      isActive: branchForm.isActive ? 1 : 0,
    };

    if (editingBranch) {
      updateBranchMutation.mutate({ id: editingBranch.BranchID, data: payload });
    } else {
      createBranchMutation.mutate(payload);
    }
  };

  const visibleBranches = isRestaurantAdmin
    ? branches
    : branches.filter((b) => b.BranchID === (staff?.branchId || 1));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <MapPin className="text-primary" size={26} />
            {isRestaurantAdmin ? 'Quản lý & Cấu hình Chi nhánh' : 'Cấu hình Chi nhánh'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRestaurantAdmin
              ? 'Quản lý toàn bộ chi nhánh, thiết lập thuế suất VAT, phí dịch vụ và thông tin vận hành'
              : 'Cập nhật giờ mở cửa, thông tin liên hệ và vận hành chi nhánh của bạn'}
          </p>
        </div>

        {isRestaurantAdmin && (
          <button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18} /> Thêm chi nhánh
          </button>
        )}
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingBranches ? (
          <div className="col-span-full py-12 text-center text-gray-400 font-medium">
            Đang tải danh sách chi nhánh...
          </div>
        ) : visibleBranches.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 font-medium bg-white rounded-2xl border border-gray-100">
            Chưa có chi nhánh nào.
          </div>
        ) : (
          visibleBranches.map((b) => {
            const isActive = b.IsActive === 1;

            return (
              <div
                key={b.BranchID}
                className={`p-6 rounded-2xl bg-white border transition-all hover:shadow-md flex flex-col justify-between ${
                  isActive ? 'border-gray-100' : 'border-gray-200 bg-gray-50/60 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg shrink-0">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-gray-800">{b.Name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Mã CN: #{b.BranchID}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        isActive
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-gray-500 bg-gray-100 border-gray-200'
                      }`}
                    >
                      {isActive ? <Check size={12} /> : <X size={12} />}
                      {isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2.5 pt-4 border-t border-gray-100 text-sm text-gray-600">
                    <div className="flex items-start gap-2.5">
                      <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                      <span className="font-medium text-gray-700">{b.Address || 'Chưa cập nhật'}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Phone size={16} className="text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-800">{b.Phone || 'Chưa cập nhật'}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Clock size={16} className="text-gray-400 shrink-0" />
                      <span>Giờ bắt đầu kinh doanh: <strong className="text-gray-800">{b.BussinessStartHour || '10:00:00'}</strong></span>
                    </div>
                  </div>

                  {/* Financial Configurations */}
                  <div className="mt-5 grid grid-cols-3 gap-2.5 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase">Thuế VAT</p>
                      <p className="font-black text-base text-gray-800 mt-0.5">{b.VATRate}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase">Phí Dịch vụ</p>
                      <p className="font-black text-base text-gray-800 mt-0.5">{b.ServiceFeeRate}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase">Mã số thuế</p>
                      <p className="font-black text-xs text-gray-800 mt-1 truncate">{b.TaxCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Settings size={14} /> Cấu hình chi nhánh
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Thêm / Sửa Chi nhánh */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-lg text-gray-800">
                {editingBranch ? `Cấu hình Chi nhánh: ${editingBranch.Name}` : 'Thêm Chi Nhánh Mới'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tên chi nhánh *</label>
                <input
                  type="text"
                  required
                  disabled={!isRestaurantAdmin && !!editingBranch}
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="VD: Chi nhánh Quận 1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Địa chỉ *</label>
                <input
                  type="text"
                  required
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="VD: 123 Trần Hưng Đạo, P. Bến Thành, Q.1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    placeholder="0901111111"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Giờ bắt đầu kinh doanh *</label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={branchForm.bussinessStartHour}
                    onChange={(e) => setBranchForm({ ...branchForm, bussinessStartHour: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Only RestaurantAdmin can edit VAT, ServiceFee, TaxCode, IsActive */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                  <Shield size={14} className="text-primary" />
                  Cấu hình Tài chính & Thuế {isRestaurantAdmin ? '' : '(Chỉ Quản trị viên thay đổi)'}
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">VAT (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      disabled={!isRestaurantAdmin}
                      value={branchForm.vatRate}
                      onChange={(e) => setBranchForm({ ...branchForm, vatRate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-primary disabled:bg-gray-200/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phí DV (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      disabled={!isRestaurantAdmin}
                      value={branchForm.serviceFeeRate}
                      onChange={(e) => setBranchForm({ ...branchForm, serviceFeeRate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-primary disabled:bg-gray-200/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mã số thuế</label>
                    <input
                      type="text"
                      disabled={!isRestaurantAdmin}
                      value={branchForm.taxCode}
                      onChange={(e) => setBranchForm({ ...branchForm, taxCode: e.target.value })}
                      placeholder="TAX-123"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-primary disabled:bg-gray-200/50"
                    />
                  </div>
                </div>

                {isRestaurantAdmin && (
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={branchForm.isActive}
                        onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <span>Chi nhánh đang hoạt động</span>
                    </label>
                  </div>
                )}
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
                  disabled={createBranchMutation.isPending || updateBranchMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-sm"
                >
                  {createBranchMutation.isPending || updateBranchMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
