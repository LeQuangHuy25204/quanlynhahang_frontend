import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { 
  Users, Plus, Search, Shield, Lock, Unlock, Phone, Mail, 
  UserCheck, UserX, X, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManager() {
  const queryClient = useQueryClient();
  const { staff: currentStaff } = useAuthStore();
  const isRestaurantAdmin = currentStaff?.roleCode === 'RestaurantAdmin';

  const [selectedBranchId, setSelectedBranchId] = useState(currentStaff?.branchId || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  React.useEffect(() => {
    if (currentStaff?.branchId) {
      setSelectedBranchId(currentStaff.branchId);
    }
  }, [currentStaff?.branchId]);

  // Modal create staff
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    roleCode: 'Waiter',
    branchId: selectedBranchId,
  });

  // Queries
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches').then(res => res.data),
  });
  const branches = branchesData || [];

  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ['staffList', selectedBranchId],
    queryFn: () => apiClient.get(`/staff?branchId=${selectedBranchId}`).then(res => res.data),
  });
  const staffList = staffData || [];

  // Mutations
  const createStaffMutation = useMutation({
    mutationFn: (data) => apiClient.post('/staff', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['staffList']);
      toast.success('Tạo tài khoản nhân viên mới thành công!');
      setCreateModalOpen(false);
      setStaffForm({
        fullName: '',
        phone: '',
        email: '',
        username: '',
        password: '',
        roleCode: 'Waiter',
        branchId: selectedBranchId,
      });
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi tạo nhân viên.'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/staff/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['staffList']);
      toast.success('Cập nhật trạng thái tài khoản thành công!');
    },
    onError: (err) => toast.error(err?.message || 'Lỗi cập nhật trạng thái.'),
  });

  const handleToggleStatus = (target) => {
    const nextStatus = target.Status === 1 ? 0 : 1;
    toggleStatusMutation.mutate({ id: target.StaffID, status: nextStatus });
  };

  const handleSubmitStaff = (e) => {
    e.preventDefault();
    if (!staffForm.fullName || !staffForm.username || !staffForm.password || !staffForm.phone) {
      return toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
    }
    createStaffMutation.mutate({
      ...staffForm,
      branchId: Number(staffForm.branchId),
    });
  };

  const getRoleBadge = (roleCode) => {
    switch (roleCode) {
      case 'RestaurantAdmin':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg text-xs font-bold">Quản trị nhà hàng</span>;
      case 'BranchManager':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg text-xs font-bold">Quản lý chi nhánh</span>;
      case 'Cashier':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-bold">Thu ngân</span>;
      case 'Waiter':
      default:
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-bold">Phục vụ bàn</span>;
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch = s.FullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.Username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.Phone?.includes(searchQuery);
    const matchesRole = roleFilter === 'ALL' || s.RoleCode === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Users className="text-primary" size={26} />
            Quản lý Nhân viên
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRestaurantAdmin ? 'Cấp phát tài khoản, phân quyền vai trò và quản lý nhân sự các chi nhánh' : 'Quản lý tài khoản nhân viên tại chi nhánh của bạn'}
          </p>
        </div>

        {/* Branch Selector & Add Button */}
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
              Chi nhánh: {branches.find(b => b.BranchID === selectedBranchId)?.Name || currentStaff?.branchId}
            </div>
          )}

          {isRestaurantAdmin && (
            <button
              onClick={() => {
                setStaffForm({ ...staffForm, branchId: selectedBranchId });
                setCreateModalOpen(true);
              }}
              className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={18} /> Thêm nhân viên
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm theo họ tên, tên đăng nhập, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {['ALL', 'RestaurantAdmin', 'BranchManager', 'Cashier', 'Waiter'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                roleFilter === r
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r === 'ALL' ? 'Tất cả vai trò' : r === 'RestaurantAdmin' ? 'Quản trị' : r === 'BranchManager' ? 'Quản lý' : r === 'Cashier' ? 'Thu ngân' : 'Phục vụ'}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-xs uppercase font-bold text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-4 py-4">Vai trò</th>
                <th className="px-4 py-4">Liên hệ</th>
                <th className="px-4 py-4">Chi nhánh</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Khóa / Mở</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingStaff ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400 font-medium">
                    Đang tải danh sách nhân viên...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400 font-medium">
                    Không tìm thấy nhân viên nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => {
                  const isActive = s.Status === 1;

                  return (
                    <tr key={s.StaffID} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                            {s.FullName ? s.FullName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{s.FullName}</p>
                            <p className="text-xs text-gray-400 font-mono">@{s.Username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {getRoleBadge(s.RoleCode)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-xs space-y-0.5">
                          <p className="flex items-center gap-1.5 text-gray-700 font-medium">
                            <Phone size={12} className="text-gray-400" /> {s.Phone}
                          </p>
                          {s.Email && (
                            <p className="flex items-center gap-1.5 text-gray-400">
                              <Mail size={12} className="text-gray-400" /> {s.Email}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs font-semibold text-gray-600">
                        {s.BranchName || `Chi nhánh ${s.BranchID}`}
                      </td>

                      <td className="px-4 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <UserCheck size={12} /> Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                            <UserX size={12} /> Đã khóa
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(s)}
                          disabled={toggleStatusMutation.isPending || s.StaffID === currentStaff?.staffId}
                          title={s.StaffID === currentStaff?.staffId ? 'Không thể tự khóa chính mình' : (isActive ? 'Nhấn để khóa tài khoản' : 'Nhấn để mở tài khoản')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ml-auto disabled:opacity-40 disabled:cursor-not-allowed ${
                            isActive
                              ? 'border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {isActive ? <Lock size={13} /> : <Unlock size={13} />}
                          <span>{isActive ? 'Khóa' : 'Mở khóa'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Thêm nhân viên mới (RestaurantAdmin only) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-lg text-gray-800">Thêm Tài Khoản Nhân Viên Mới</h2>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Tên đăng nhập *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                    placeholder="VD: waiter_q1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Mật khẩu ban đầu *</label>
                  <input
                    type="password"
                    required
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="0901234567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="nv@bbq.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Vai trò hệ thống *</label>
                  <select
                    value={staffForm.roleCode}
                    onChange={(e) => setStaffForm({ ...staffForm, roleCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary bg-white"
                  >
                    <option value="Waiter">Nhân viên phục vụ (Waiter)</option>
                    <option value="Cashier">Thu ngân (Cashier)</option>
                    <option value="BranchManager">Quản lý chi nhánh (BranchManager)</option>
                    <option value="RestaurantAdmin">Quản trị nhà hàng (RestaurantAdmin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Chi nhánh làm việc *</label>
                  <select
                    value={staffForm.branchId}
                    onChange={(e) => setStaffForm({ ...staffForm, branchId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary bg-white"
                  >
                    {branches.map((b) => (
                      <option key={b.BranchID} value={b.BranchID}>
                        {b.Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-sm"
                >
                  {createStaffMutation.isPending ? 'Đang tạo...' : 'Tạo nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
