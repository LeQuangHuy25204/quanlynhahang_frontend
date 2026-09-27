import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { RefreshCcw, Users, Clock, CheckCircle } from 'lucide-react';

export default function TableBoard() {
  const { staff } = useAuthStore();
  const [activeArea, setActiveArea] = useState('all');
  
  const { data: tables = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tables', staff?.branchId],
    queryFn: () => apiClient.get(`/tables?branchId=${staff?.branchId}`).then(res => res.data),
    refetchInterval: 10000,
  });

  const areas = Array.from(new Set(tables.map(t => t.AreaName)));

  const handleOpenTable = async (sessionId) => {
    try {
      await apiClient.put(`/sessions/${sessionId}/status`, { status: 1 }); // 1 = OPEN
      toast.success('Mở bàn thành công');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Lỗi khi mở bàn');
    }
  };

  if (isLoading && !isRefetching) return <div className="p-10 text-center text-gray-500">Đang tải danh sách bàn...</div>;

  const displayTables = activeArea === 'all' ? tables : tables.filter(t => t.AreaName === activeArea);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sơ đồ bàn</h1>
        <button onClick={() => refetch()} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition-colors">
          <RefreshCcw size={20} className={isRefetching ? 'animate-spin text-primary' : ''} />
        </button>
      </div>
      
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-2">
        <button
          onClick={() => setActiveArea('all')}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${activeArea === 'all' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Tất cả khu vực
        </button>
        {areas.map(area => (
          <button
            key={area}
            onClick={() => setActiveArea(area)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${activeArea === area ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {area}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayTables.map(table => {
          const session = table.Session;
          
          let statusColor = 'bg-white border-gray-200 text-gray-700'; // Trống
          let statusText = 'Trống';
          let borderColor = 'border-gray-200';
          let actionButton = null;

          if (session) {
            if (session.Status === 0) {
              statusColor = 'bg-yellow-50 text-yellow-800';
              borderColor = 'border-yellow-200';
              statusText = 'Chờ mở bàn';
              actionButton = (
                <button 
                  onClick={() => handleOpenTable(session.SessionID)}
                  className="w-full py-2 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-xl shadow-sm hover:bg-yellow-500 hover:shadow active:scale-95 transition-all duration-200"
                >
                  XÁC NHẬN MỞ
                </button>
              );
            } else if (session.Status === 1) {
              if (session.Order?.Status === 3) {
                statusColor = 'bg-blue-50 text-blue-800';
                borderColor = 'border-blue-300';
                statusText = 'Chờ thanh toán';
              } else {
                statusColor = 'bg-green-50 text-green-800';
                borderColor = 'border-green-300';
                statusText = 'Đang phục vụ';
              }
            }
          }

          return (
            <div key={table.TableID} className={`group flex flex-col rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 ${statusColor} ${borderColor}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-extrabold text-xl">{table.Name}</span>
                {session && (
                  <div className={`p-1.5 rounded-full ${statusText === 'Chờ mở bàn' ? 'bg-yellow-200/50 text-yellow-700' : 'bg-green-200/50 text-green-700'}`}>
                    <Users size={16} />
                  </div>
                )}
              </div>
              <p className="text-xs opacity-70 mb-auto font-medium">{table.AreaName}</p>
              
              <div className="mt-4 pt-3 border-t border-current/10">
                <p className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide">
                  {statusText === 'Trống' ? null : statusText === 'Chờ mở bàn' ? <Clock size={14}/> : <CheckCircle size={14}/>}
                  {statusText}
                </p>
                {actionButton && (
                  <div className="mt-3 opacity-90 group-hover:opacity-100 transition-opacity">
                    {actionButton}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
