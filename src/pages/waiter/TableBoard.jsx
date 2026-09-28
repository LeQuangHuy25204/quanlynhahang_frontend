import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { Search, ListFilter, X, Plus, Minus, User } from 'lucide-react';

export default function TableBoard() {
  const { staff } = useAuthStore();
  const [activeArea, setActiveArea] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableForOpen, setSelectedTableForOpen] = useState(null);
  const [selectedTableForConfirm, setSelectedTableForConfirm] = useState(null);
  const [guestCount, setGuestCount] = useState(2);
  const [note, setNote] = useState('');
  
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);
  
  const { data: tables = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tables', staff?.branchId],
    queryFn: () => apiClient.get(`/tables?branchId=${staff?.branchId}`).then(res => res.data),
    refetchInterval: 5000, // Poll every 5s for realtime updates
  });

  const { data: orderLines = [], isLoading: isLoadingOrder } = useQuery({
    queryKey: ['orderLines', selectedTableForOrder?.Session?.SessionID],
    queryFn: () => apiClient.get(`/orders/session/${selectedTableForOrder.Session.SessionID}`).then(res => res.data),
    enabled: !!selectedTableForOrder?.Session?.SessionID,
    refetchInterval: 5000,
  });

  const areas = Array.from(new Set(tables.map(t => t.AreaName)));

  const handleOpenTable = async (e) => {
    e.preventDefault();
    if (!selectedTableForOpen) return;
    
    try {
      await apiClient.post(`/sessions/open`, { 
        tableId: selectedTableForOpen.TableID,
        guestCount: guestCount,
        note: note
      });
      toast.success('Mở bàn thành công');
      setSelectedTableForOpen(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Lỗi khi mở bàn');
    }
  };

  const handleConfirmTable = async () => {
    if (!selectedTableForConfirm) return;
    try {
      await apiClient.put(`/sessions/${selectedTableForConfirm.Session.SessionID}/status`, { status: 1 });
      toast.success('Đã xác nhận mở bàn cho khách');
      setSelectedTableForConfirm(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Lỗi khi xác nhận mở bàn');
    }
  };

  const handleCloseTable = async () => {
    if (!selectedTableForOrder) return;
    try {
      await apiClient.put(`/sessions/${selectedTableForOrder.Session.SessionID}/status`, { status: 2 });
      toast.success('Đã đóng bàn / thanh toán thành công');
      setSelectedTableForOrder(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Lỗi khi đóng bàn');
    }
  };

  const handleTableClick = (table, session) => {
    if (!session) {
      // Empty table -> Open manually
      setSelectedTableForOpen(table);
      setGuestCount(2);
      setNote('');
    } else if (session.Status === 0) {
      // Waiting for confirmation -> Confirm
      setSelectedTableForConfirm(table);
    } else {
      // Table is active -> open order details
      setSelectedTableForOrder(table);
    }
  };

  if (isLoading && !isRefetching) return <div className="p-10 text-center text-gray-500">Đang tải danh sách bàn...</div>;

  const filteredTables = tables.filter(t => {
    const matchArea = activeArea === 'all' || t.AreaName === activeArea;
    const matchSearch = t.Name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchArea && matchSearch;
  });

  // Calculate stats
  const totalTables = tables.length;
  const waitingConfirmTables = tables.filter(t => t.Session?.Status === 0);
  const servingTables = tables.filter(t => t.Session?.Status === 1 && t.Session?.Order?.Status !== 3).length;
  const waitingPayTables = tables.filter(t => t.Session?.Status === 1 && t.Session?.Order?.Status === 3).length;

  return (
    <div className="h-full flex flex-col p-2 md:p-6 bg-bg-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-[32px] font-extrabold text-text-primary leading-tight">Sơ đồ bàn</h1>
          <p className="text-[14px] text-text-secondary mt-1">
            {totalTables} bàn · {servingTables} đang phục vụ · {waitingPayTables} chờ thanh toán
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
            <input 
              type="text" 
              placeholder="Tìm bàn..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-[240px] bg-white border border-border rounded-full text-[14px] focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Notification Banner: Bàn chờ xác nhận */}
      {waitingConfirmTables.length > 0 && (
        <div className="mb-6 bg-info/10 border border-info/30 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 bg-info text-white rounded-xl flex items-center justify-center shrink-0">
            <User size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-info text-[15px]">{waitingConfirmTables.length} bàn đang chờ xác nhận mở!</p>
            <p className="text-[13px] text-info/70 mt-0.5">
              {waitingConfirmTables.map(t => t.Name).join(', ')} — khách đang chờ
            </p>
          </div>
          <button
            onClick={() => setSelectedTableForConfirm(waitingConfirmTables[0])}
            className="px-4 py-2 bg-info text-white font-bold rounded-xl text-[13px] shrink-0 hover:bg-info/90 active:scale-95 transition-all shadow-sm"
          >
            Xác nhận ngay
          </button>
        </div>
      )}
      
      {/* Legends & Filters */}
      <div className="flex flex-wrap items-center gap-6 mb-6">
        <div className="flex items-center gap-4 text-[12px] font-semibold text-text-primary">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-border"></div>Trống</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-info"></div>Chờ xác nhận</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-danger"></div>Đang phục vụ</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warning"></div>Chờ thanh toán</div>
        </div>
      </div>

      {/* Area Tabs */}
      <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-4 mt-2">
        KHU VỰC {activeArea === 'all' ? 'TẤT CẢ' : activeArea}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map(table => {
          const session = table.Session;
          
          let cardBorder = 'border-border/60';
          let dotColor = 'bg-border';
          let badgeClass = 'text-text-tertiary border-border';
          let statusText = 'Trống';
          let content = <p className="text-[13px] text-text-tertiary mt-6">Nhấn để mở bàn</p>;
          let badgeTextColor = 'text-text-tertiary';

          if (session) {
            // Chờ xác nhận (khách quét QR)
            if (session.Status === 0) {
              cardBorder = 'border-[#3b82f6]'; // Blue
              dotColor = 'bg-[#3b82f6] animate-pulse';
              badgeClass = 'border-[#3b82f6]';
              badgeTextColor = 'text-[#3b82f6]';
              statusText = 'Chờ mở bàn';
              const waitSecs = Math.floor((new Date() - new Date(session.StartTime)) / 1000);
              content = (
                <div className="mt-4 text-[13px] text-text-secondary w-full">
                  <p>— khách • vừa quét QR</p>
                  <div className="flex justify-between items-end mt-4">
                    <span className="text-text-tertiary">Tạm tính</span>
                    <span className="font-bold text-[15px] text-text-primary">—</span>
                  </div>
                </div>
              );
            }
            // Đã mở bàn (đang phục vụ)
            else if (session.Status === 1) {
              const startTime = new Date(session.StartTime);
              const durationMinutes = Math.floor((new Date() - startTime) / 60000);
              const guestCount = session.GuestCount || 0;
              const subtotal = session.TotalAmount || 0; // Fixed from Order?.TotalAmount to TotalAmount

              // Chờ thanh toán
              if (session.Order?.Status === 3) {
                cardBorder = 'border-[#f59e0b]'; // Orange
                dotColor = 'bg-[#f59e0b]';
                badgeClass = 'border-[#f59e0b]';
                badgeTextColor = 'text-[#f59e0b]';
                statusText = 'Chờ thanh toán';
              } else {
                cardBorder = 'border-[#ef4444]'; // Red
                dotColor = 'bg-[#ef4444]';
                badgeClass = 'border-[#ef4444]';
                badgeTextColor = 'text-[#ef4444]';
                statusText = 'Đang phục vụ';
              }

              content = (
                <div className="mt-4 text-[13px] text-text-secondary w-full">
                  <p>{guestCount} khách • {durationMinutes} phút</p>
                  <div className="flex justify-between items-end mt-4">
                    <span className="text-text-tertiary">Tạm tính</span>
                    <span className="font-bold text-[16px] text-text-primary">
                      {new Intl.NumberFormat('vi-VN').format(subtotal)}đ
                    </span>
                  </div>
                </div>
              );
            }
          }

          return (
            <div 
              key={table.TableID} 
              onClick={() => handleTableClick(table, session)}
              className={`bg-white rounded-[16px] border-[1.5px] ${cardBorder} p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative min-h-[150px] flex flex-col items-start`}
            >
              <div className="flex justify-between items-start w-full mb-1">
                <span className="font-bold text-[20px] text-text-primary leading-none">{table.Name}</span>
                <div className="flex items-center gap-1.5">
                  {/* Fake bell icon for Figma similarity if serving */}
                  {statusText === 'Đang phục vụ' && (
                     <div className="relative">
                       <svg className="w-4 h-4 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                       <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#ef4444] rounded-full border border-white"></div>
                     </div>
                  )}
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></div>
                </div>
              </div>
              
              <div className={`inline-flex px-3 py-0.5 rounded-full border-[1.5px] text-[11px] font-bold mt-2 ${badgeClass} ${badgeTextColor}`}>
                {statusText}
              </div>
              
              <div className="mt-auto w-full">
                {content}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Mở Bàn */}
      {selectedTableForOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-[20px] font-extrabold text-text-primary">Mở bàn {selectedTableForOpen.Name}</h2>
              <p className="text-[14px] text-text-secondary mt-1">
                Khu vực {selectedTableForOpen.AreaName} - Sức chứa 4 khách
              </p>

              <form onSubmit={handleOpenTable} className="mt-8 space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-text-primary mb-3">Số lượng khách</label>
                  <div className="flex items-center gap-4">
                    <button 
                      type="button"
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      className="w-10 h-10 rounded-full bg-bg-page border border-border flex items-center justify-center text-text-secondary hover:bg-gray-100"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-[20px] font-bold text-text-primary w-8 text-center">{guestCount}</span>
                    <button 
                      type="button"
                      onClick={() => setGuestCount(guestCount + 1)}
                      className="w-10 h-10 rounded-full bg-primary-subtle text-primary flex items-center justify-center hover:bg-primary/20"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-primary mb-2">Ghi chú (tùy chọn)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-4 bg-bg-page border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-[14px]"
                    placeholder="VD: Khách quen, cần ghế trẻ em..."
                    rows="3"
                  ></textarea>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12px] text-text-tertiary">
                    Bàn sẽ chuyển sang trạng thái 
                    <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger font-bold text-[10px]">Đang phục vụ</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setSelectedTableForOpen(null)}
                    className="flex-1 py-3.5 bg-white border border-border text-text-secondary font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-sm"
                  >
                    Xác nhận mở bàn
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận mở bàn (từ QR) */}
      {selectedTableForConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-info/10 text-info rounded-full flex items-center justify-center mb-4">
                <User size={24} />
              </div>
              <h2 className="text-[20px] font-extrabold text-text-primary">Xác nhận mở {selectedTableForConfirm.Name}</h2>
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
                Khách hàng vừa quét mã QR và đang chờ bạn xác nhận mở bàn để có thể bắt đầu gọi món.
              </p>

              <div className="flex gap-3 pt-6 mt-2 border-t border-border">
                <button 
                  onClick={() => setSelectedTableForConfirm(null)}
                  className="flex-1 py-3.5 bg-white border border-border text-text-secondary font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Đóng
                </button>
                <button 
                  onClick={handleConfirmTable}
                  className="flex-1 py-3.5 bg-info hover:bg-info/90 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  Xác nhận ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL: Order Chi tiết */}
      {selectedTableForOrder && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedTableForOrder(null)}>
          <div 
            className="absolute right-0 top-0 h-full w-[800px] max-w-full bg-bg-page shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Panel */}
            <div className="bg-white border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedTableForOrder(null)}
                  className="p-2 hover:bg-bg-page rounded-full text-text-secondary transition-colors"
                >
                  <X size={20} />
                </button>
                <div>
                  <h2 className="text-[20px] font-extrabold text-text-primary">Bàn {selectedTableForOrder.Name} — Đơn món</h2>
                  <p className="text-[13px] text-text-secondary mt-0.5">
                    {selectedTableForOrder.Session?.GuestCount} khách · Phiên #{selectedTableForOrder.Session?.SessionID} · Phục vụ: {staff?.fullName}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white border border-border text-[13px] font-bold text-text-secondary rounded-lg hover:bg-gray-50">
                  In phiếu chế biến
                </button>
                <button className="px-4 py-2 bg-white border border-border text-[13px] font-bold text-text-secondary rounded-lg hover:bg-gray-50">
                  Chuyển / Gộp bàn
                </button>
                <button 
                  onClick={handleCloseTable}
                  className="px-4 py-2 bg-primary-subtle text-primary text-[13px] font-bold rounded-lg hover:bg-primary/20"
                >
                  Đóng bàn
                </button>
              </div>
            </div>

            {/* Content Panel */}
            <div className="flex-1 flex overflow-hidden">
              {/* Cột trái: Lịch sử gọi món */}
              <div className="flex-1 border-r border-border overflow-y-auto p-6 bg-white">
                <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-4">
                  DANH SÁCH MÓN ĐÃ GỌI
                </div>
                
                {isLoadingOrder ? (
                   <p className="text-text-secondary text-[13px]">Đang tải dữ liệu...</p>
                ) : orderLines.length === 0 ? (
                   <div className="text-center py-10">
                     <p className="text-text-tertiary text-[14px]">Bàn chưa có món nào được gọi.</p>
                   </div>
                ) : (
                  orderLines.map((line) => (
                    <div key={line.OrderLineID} className="flex justify-between items-start py-4 border-b border-border">
                      <div>
                        <h4 className="font-bold text-[15px] text-text-primary">{line.MenuItemName}</h4>
                        {line.Note && <p className="text-[13px] text-text-secondary mt-1">{line.Note}</p>}
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          line.Status === 0 ? 'bg-yellow-100 text-yellow-700' : // CHỜ XÁC NHẬN
                          line.Status === 1 ? 'bg-purple-100 text-purple-700' : // CHỜ CÂN
                          line.Status === 2 ? 'bg-blue-100 text-blue-700' :     // ĐÃ XÁC NHẬN
                          line.Status === 4 ? 'bg-orange-100 text-orange-700' : // ĐANG CHẾ BIẾN
                          line.Status === 5 ? 'bg-teal-100 text-teal-700' :     // CHỜ PHỤC VỤ
                          line.Status === 6 ? 'bg-green-100 text-green-700' :   // ĐÃ PHỤC VỤ
                          'bg-gray-100 text-gray-500' // ĐÃ HỦY (3)
                        }`}>
                          ● {
                            line.Status === 0 ? 'Chờ xác nhận' :
                            line.Status === 1 ? 'Chờ cân' :
                            line.Status === 2 ? 'Đã xác nhận' :
                            line.Status === 3 ? 'Đã hủy' :
                            line.Status === 4 ? 'Đang chế biến' :
                            line.Status === 5 ? 'Chờ phục vụ' :
                            line.Status === 6 ? 'Đã phục vụ' : 'Không rõ'
                          }
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold w-[20px] text-center">{parseFloat(line.Quantity)}</span>
                        </div>
                        <span className="font-bold w-[70px] text-right">
                          {new Intl.NumberFormat('vi-VN').format(parseFloat(line.LineTotal))}đ
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cột phải: Thêm món mới */}
              <div className="w-[320px] bg-white flex flex-col">
                <div className="p-4 border-b border-border">
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">
                    + THÊM MÓN VÀO BÀN
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                    <input 
                      type="text" 
                      placeholder="Tìm món..." 
                      className="w-full pl-9 p-2.5 bg-bg-page border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                   <div className="text-center py-4 text-text-tertiary text-[13px]">
                     (Chức năng thêm món tại bàn đang được cập nhật)
                   </div>
                </div>

                <div className="p-6 border-t border-border bg-bg-page/50">
                  <div className="flex justify-between mb-4">
                    <span className="text-[14px] text-text-secondary font-medium">Tạm tính</span>
                    <span className="font-bold text-[18px] text-text-primary">
                      {new Intl.NumberFormat('vi-VN').format(selectedTableForOrder?.Session?.TotalAmount || 0)}đ
                    </span>
                  </div>
                  <button className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors mb-3">
                    Gửi món mới xuống bếp
                  </button>
                  <button 
                    onClick={handleCloseTable}
                    className="w-full py-3.5 bg-white border-2 border-primary text-primary font-bold rounded-xl hover:bg-primary-subtle transition-colors"
                  >
                    THANH TOÁN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
