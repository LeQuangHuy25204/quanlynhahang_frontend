import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { 
  Grid, Plus, QrCode, Edit2, Check, X, MapPin, 
  Layers, ExternalLink, Printer, Copy, CheckCheck, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

export default function TableManager() {
  const queryClient = useQueryClient();
  const { staff } = useAuthStore();
  const isRestaurantAdmin = staff?.roleCode === 'RestaurantAdmin';

  const [selectedBranchId, setSelectedBranchId] = useState(staff?.branchId || 1);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');

  React.useEffect(() => {
    if (staff?.branchId) {
      setSelectedBranchId(staff.branchId);
    }
  }, [staff?.branchId]);

  // Modals state
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaName, setAreaName] = useState('');

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ name: '', areaId: '' });

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeQrTable, setActiveQrTable] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Queries
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches').then(res => res.data || res),
  });
  const branches = Array.isArray(branchesData) 
    ? branchesData 
    : (Array.isArray(branchesData?.data) ? branchesData.data : []);

  const { data: areasData, isLoading: loadingAreas } = useQuery({
    queryKey: ['areas', selectedBranchId],
    queryFn: () => apiClient.get(`/tables/areas?branchId=${selectedBranchId}`).then(res => res.data),
  });
  const areas = areasData || [];

  const { data: tablesData, isLoading: loadingTables } = useQuery({
    queryKey: ['tables', selectedBranchId],
    queryFn: () => apiClient.get(`/tables?branchId=${selectedBranchId}`).then(res => res.data),
  });
  const tables = tablesData || [];

  // Mutations
  const createAreaMutation = useMutation({
    mutationFn: (data) => apiClient.post('/tables/areas', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['areas']);
      toast.success('Thêm khu vực thành công!');
      setAreaModalOpen(false);
      setAreaName('');
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi tạo khu vực.'),
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/tables/areas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['areas']);
      toast.success('Cập nhật khu vực thành công!');
      setAreaModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi cập nhật khu vực.'),
  });

  const createTableMutation = useMutation({
    mutationFn: (data) => apiClient.post('/tables', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tables']);
      toast.success('Thêm bàn mới và tạo mã QR thành công!');
      setTableModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi khi thêm bàn.'),
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/tables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tables']);
      toast.success('Cập nhật bàn thành công!');
      setTableModalOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Lỗi cập nhật bàn.'),
  });

  // Handlers
  const handleOpenAddArea = () => {
    setEditingArea(null);
    setAreaName('');
    setAreaModalOpen(true);
  };

  const handleOpenEditArea = (area) => {
    setEditingArea(area);
    setAreaName(area.Name);
    setAreaModalOpen(true);
  };

  const handleSubmitArea = (e) => {
    e.preventDefault();
    if (!areaName.trim()) return toast.error('Vui lòng nhập tên khu vực.');
    if (editingArea) {
      updateAreaMutation.mutate({ id: editingArea.AreaID, data: { name: areaName.trim() } });
    } else {
      createAreaMutation.mutate({ branchId: selectedBranchId, name: areaName.trim() });
    }
  };

  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableForm({
      name: '',
      areaId: areas[0]?.AreaID || '',
    });
    setTableModalOpen(true);
  };

  const handleOpenEditTable = (table) => {
    setEditingTable(table);
    setTableForm({
      name: table.Name,
      areaId: table.AreaID,
    });
    setTableModalOpen(true);
  };

  const handleSubmitTable = (e) => {
    e.preventDefault();
    if (!tableForm.name.trim() || !tableForm.areaId) {
      return toast.error('Vui lòng nhập tên bàn và chọn khu vực.');
    }
    if (editingTable) {
      updateTableMutation.mutate({
        id: editingTable.TableID,
        data: { name: tableForm.name.trim() }
      });
    } else {
      createTableMutation.mutate({
        areaId: Number(tableForm.areaId),
        name: tableForm.name.trim(),
      });
    }
  };

  const handleToggleTableActive = (table) => {
    updateTableMutation.mutate({
      id: table.TableID,
      data: { isActive: table.IsActive === 1 ? 0 : 1 }
    });
  };

  const handleViewQr = (table) => {
    setActiveQrTable(table);
    setCopiedLink(false);
    setQrModalOpen(true);
  };

  const qrLink = activeQrTable ? `${window.location.origin}/customer/qr?code=${activeQrTable.QRCode}` : '';
  const qrImageUrl = activeQrTable 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrLink)}` 
    : '';

  const handleCopyQrLink = () => {
    navigator.clipboard.writeText(qrLink);
    setCopiedLink(true);
    toast.success('Đã copy liên kết gọi món QR của bàn!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredTables = tables.filter(t => {
    if (selectedAreaFilter === 'ALL') return true;
    return String(t.AreaID) === String(selectedAreaFilter);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Grid className="text-primary" size={26} />
            Quản lý Bàn & Khu vực
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Thiết lập sơ đồ khu vực, bàn phục vụ và mã QR gọi món cho khách hàng
          </p>
        </div>

        {/* Branch Selector */}
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

          <button
            onClick={handleOpenAddArea}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} /> Khu vực
          </button>

          <button
            onClick={handleOpenAddTable}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18} /> Thêm bàn
          </button>
        </div>
      </div>

      {/* Area Tabs / Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1">
          <button
            onClick={() => setSelectedAreaFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedAreaFilter === 'ALL'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả khu vực ({tables.length} bàn)
          </button>

          {areas.map((a) => (
            <div key={a.AreaID} className="flex items-center">
              <button
                onClick={() => setSelectedAreaFilter(a.AreaID)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  String(selectedAreaFilter) === String(a.AreaID)
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{a.Name}</span>
                <span className="opacity-75 text-[10px]">
                  ({tables.filter(t => t.AreaID === a.AreaID).length})
                </span>
              </button>
              <button
                onClick={() => handleOpenEditArea(a)}
                title="Sửa tên khu vực"
                className="p-1.5 text-gray-400 hover:text-gray-700 ml-0.5"
              >
                <Edit2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loadingTables ? (
          <div className="col-span-full py-12 text-center text-gray-400 font-medium">
            Đang tải danh sách bàn...
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 font-medium bg-white rounded-2xl border border-gray-100">
            Không có bàn nào trong khu vực này. Nhấn "Thêm bàn" để tạo bàn mới!
          </div>
        ) : (
          filteredTables.map((table) => {
            const isAvailable = table.IsActive === 1;

            return (
              <div
                key={table.TableID}
                className={`p-5 rounded-2xl bg-white border transition-all hover:shadow-md flex flex-col justify-between ${
                  isAvailable ? 'border-gray-100' : 'border-gray-200 bg-gray-50/70 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-lg text-gray-800">{table.Name}</h3>
                      <p className="text-xs text-primary font-bold mt-0.5">{table.AreaName}</p>
                    </div>

                    <button
                      onClick={() => handleToggleTableActive(table)}
                      title={isAvailable ? 'Nhấn để khóa bàn' : 'Nhấn để mở bàn'}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        isAvailable 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {isAvailable ? 'Đang hoạt động' : 'Đang tạm khóa'}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Mã QR:</span>
                    <span className="font-mono font-bold text-gray-700">{table.QRCode || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleViewQr(table)}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary-subtle text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <QrCode size={15} /> Xem mã QR
                  </button>

                  <button
                    onClick={() => handleOpenEditTable(table)}
                    title="Chỉnh sửa tên bàn"
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Thêm / Sửa Khu vực */}
      {areaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-base text-gray-800">
                {editingArea ? 'Sửa Tên Khu Vực' : 'Thêm Khu Vực Mới'}
              </h2>
              <button onClick={() => setAreaModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitArea} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tên khu vực *</label>
                <input
                  type="text"
                  required
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="VD: Khu VIP, Tầng 1, Ngoài trời..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAreaModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createAreaMutation.isPending || updateAreaMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover"
                >
                  {createAreaMutation.isPending || updateAreaMutation.isPending ? 'Đang lưu...' : 'Lưu khu vực'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm / Sửa Bàn */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-base text-gray-800">
                {editingTable ? 'Sửa Thông Tin Bàn' : 'Thêm Bàn Mới'}
              </h2>
              <button onClick={() => setTableModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitTable} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tên bàn *</label>
                <input
                  type="text"
                  required
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                  placeholder="VD: Bàn 01, Bàn VIP 2..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                />
              </div>

              {!editingTable && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Khu vực *</label>
                  <select
                    value={tableForm.areaId}
                    onChange={(e) => setTableForm({ ...tableForm, areaId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary bg-white"
                  >
                    {areas.map((a) => (
                      <option key={a.AreaID} value={a.AreaID}>
                        {a.Name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createTableMutation.isPending || updateTableMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover"
                >
                  {createTableMutation.isPending || updateTableMutation.isPending ? 'Đang lưu...' : 'Lưu bàn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xem & In Mã QR của Bàn */}
      {qrModalOpen && activeQrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold px-2.5 py-1 bg-primary-subtle text-primary rounded-lg">
                {activeQrTable.AreaName}
              </span>
              <button onClick={() => setQrModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <h3 className="font-black text-2xl text-gray-800 tracking-tight">{activeQrTable.Name}</h3>
            <p className="text-xs text-gray-400 mt-1">Quét mã QR để mở bàn & đặt món</p>

            <div className="my-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center shadow-inner">
              <img
                src={qrImageUrl}
                alt={`Mã QR ${activeQrTable.Name}`}
                className="w-48 h-48 rounded-xl shadow-xs bg-white p-2"
              />
              <p className="mt-2 text-[11px] font-mono text-gray-500 font-bold">
                Mã: {activeQrTable.QRCode}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopyQrLink}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
              >
                {copiedLink ? <CheckCheck size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copiedLink ? 'Đã sao chép liên kết!' : 'Sao chép liên kết quét QR'}
              </button>

              <a
                href={qrLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink size={16} /> Mở giao diện khách của bàn này
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
