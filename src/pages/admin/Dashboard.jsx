import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  Store, 
  Calendar, 
  Clock, 
  Loader2,
  CalendarDays
} from 'lucide-react';
import { 
  format, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear 
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const { staff } = useAuthStore();
  const isRestaurantAdmin = staff?.roleCode === 'RestaurantAdmin';

  // Branch Selection: 'all' or branchId
  const [selectedBranch, setSelectedBranch] = useState(
    isRestaurantAdmin ? 'all' : (staff?.branchId || 1)
  );

  // Period Selection
  const [period, setPeriod] = useState('today'); // today, 7days, 30days, thisMonth, lastMonth, thisYear, custom
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Fetch Branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches'),
  });
  const branches = branchesData?.data || (Array.isArray(branchesData) ? branchesData : []);

  // Calculate Dates based on period
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const todayDisplay = format(now, 'dd/MM/yyyy');

    switch (period) {
      case 'today':
        return {
          startDate: todayStr,
          endDate: todayStr,
          periodLabel: `Hôm nay (${todayDisplay})`
        };
      case '7days': {
        const start = format(subDays(now, 6), 'yyyy-MM-dd');
        return {
          startDate: start,
          endDate: todayStr,
          periodLabel: `7 ngày qua (${format(subDays(now, 6), 'dd/MM/yyyy')} - ${todayDisplay})`
        };
      }
      case '30days': {
        const start = format(subDays(now, 29), 'yyyy-MM-dd');
        return {
          startDate: start,
          endDate: todayStr,
          periodLabel: `30 ngày qua (${format(subDays(now, 29), 'dd/MM/yyyy')} - ${todayDisplay})`
        };
      }
      case 'thisMonth': {
        const start = format(startOfMonth(now), 'yyyy-MM-dd');
        return {
          startDate: start,
          endDate: todayStr,
          periodLabel: `Tháng này (${format(now, 'MM/yyyy')})`
        };
      }
      case 'lastMonth': {
        const prevMonth = subMonths(now, 1);
        const start = format(startOfMonth(prevMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(prevMonth), 'yyyy-MM-dd');
        return {
          startDate: start,
          endDate: end,
          periodLabel: `Tháng trước (${format(prevMonth, 'MM/yyyy')})`
        };
      }
      case 'thisYear': {
        const start = format(startOfYear(now), 'yyyy-MM-dd');
        return {
          startDate: start,
          endDate: todayStr,
          periodLabel: `Năm nay (${format(now, 'yyyy')})`
        };
      }
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
          periodLabel: `${format(new Date(customStartDate), 'dd/MM/yyyy')} - ${format(new Date(customEndDate), 'dd/MM/yyyy')}`
        };
      default:
        return {
          startDate: todayStr,
          endDate: todayStr,
          periodLabel: `Hôm nay (${todayDisplay})`
        };
    }
  }, [period, customStartDate, customEndDate]);

  // Fetch Report Data
  const { data: rawReportData, isLoading } = useQuery({
    queryKey: ['reportData', selectedBranch, startDate, endDate],
    queryFn: () => apiClient.get('/reports/branch-revenue', {
      params: {
        branchId: selectedBranch === 'all' ? undefined : selectedBranch,
        startDate,
        endDate
      }
    }),
  });

  // apiClient interceptor unwrap logic
  const reportData = rawReportData?.data || rawReportData;

  // Determine Branch Label for header & cards
  const selectedBranchObj = branches.find(b => b.BranchID === Number(selectedBranch));
  const currentBranchName = selectedBranch === 'all' 
    ? `Toàn bộ hệ thống (${branches.length || 2} Chi nhánh)` 
    : (selectedBranchObj?.Name || `Chi nhánh #${selectedBranch}`);

  const branchSubText = selectedBranch === 'all'
    ? `Tổng ${branches.length || 2} chi nhánh (đã thanh toán)`
    : `${selectedBranchObj?.Name || 'Chi nhánh'} (đã thanh toán)`;

  // Determine whether chart is hourly or daily
  const isHourly = startDate === endDate && Boolean(reportData?.hourly && reportData.hourly.length > 0);

  const chartData = useMemo(() => {
    if (isHourly) {
      return (reportData?.hourly || []).map(item => ({
        label: `${String(item.Hour).padStart(2, '0')}:00`,
        revenue: Number(item.TotalRevenue),
        invoices: Number(item.TotalInvoices)
      }));
    }

    return (reportData?.daily || []).map(item => ({
      label: format(new Date(item.Date), 'dd/MM'),
      revenue: Number(item.TotalRevenue),
      invoices: Number(item.TotalInvoices)
    }));
  }, [isHourly, reportData]);

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
  };

  // Format YAxis ticks
  const formatYAxis = (val) => {
    if (!val || val === 0) return '0 đ';
    if (val >= 1000000) {
      const m = val / 1000000;
      return `${Number.isInteger(m) ? m : m.toFixed(1)} triệu`;
    }
    if (val >= 1000) {
      return `${val / 1000}k`;
    }
    return `${val} đ`;
  };

  // Compute nice Y-axis max domain & ticks
  const { maxRevenue, yTicks } = useMemo(() => {
    const defaultMax = 8000000;
    if (!chartData.length) {
      return { maxRevenue: defaultMax, yTicks: [0, 2000000, 4000000, 6000000, 8000000] };
    }
    const maxVal = Math.max(...chartData.map(d => d.revenue));
    const targetMax = Math.max(defaultMax, Math.ceil((maxVal * 1.15) / 2000000) * 2000000);
    const step = targetMax <= 8000000 ? 2000000 : Math.ceil(targetMax / 4 / 1000000) * 1000000;
    const ticks = [];
    for (let i = 0; i <= targetMax; i += step) {
      ticks.push(i);
    }
    return { maxRevenue: targetMax, yTicks: ticks };
  }, [chartData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Tổng quan Báo cáo
            </h1>
            <span className="bg-rose-50 text-rose-500 border border-rose-100 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center">
              {currentBranchName}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5 font-medium">
            <Calendar size={14} className="text-gray-400" />
            <span>{periodLabel}</span>
          </p>
        </div>

        {/* Branch Filter Tabs (Top Right) */}
        {isRestaurantAdmin && (
          <div className="flex items-center gap-2 flex-wrap bg-gray-50/60 p-1.5 rounded-2xl border border-gray-100">
            <button
              onClick={() => setSelectedBranch('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedBranch === 'all'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80 font-bold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
              }`}
            >
              <Store size={14} className={selectedBranch === 'all' ? 'text-primary' : 'text-gray-400'} />
              <span>Tất cả chi nhánh</span>
            </button>
            {branches.map((b) => (
              <button
                key={b.BranchID}
                onClick={() => setSelectedBranch(b.BranchID)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  Number(selectedBranch) === b.BranchID
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80 font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
                }`}
              >
                <Store size={14} className={Number(selectedBranch) === b.BranchID ? 'text-primary' : 'text-gray-400'} />
                <span>{b.Name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Period Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-gray-400 font-medium mr-1 py-1">
          <Clock size={15} />
          <span>Kỳ báo cáo:</span>
        </div>

        {[
          { key: 'today', label: 'Hôm nay' },
          { key: '7days', label: '7 ngày qua' },
          { key: '30days', label: '30 ngày qua' },
          { key: 'thisMonth', label: 'Tháng này' },
          { key: 'lastMonth', label: 'Tháng trước' },
          { key: 'thisYear', label: 'Năm nay' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setPeriod(item.key);
              setShowCustomPicker(false);
            }}
            className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
              period === item.key && !showCustomPicker
                ? 'border border-rose-500 text-rose-500 font-bold bg-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </button>
        ))}

        <button
          onClick={() => {
            setPeriod('custom');
            setShowCustomPicker(!showCustomPicker);
          }}
          className={`px-3.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
            period === 'custom' || showCustomPicker
              ? 'border border-rose-500 text-rose-500 font-bold bg-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <CalendarDays size={13} />
          <span>Tùy chọn...</span>
        </button>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 flex-wrap animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Từ ngày:</span>
            <input 
              type="date" 
              value={customStartDate} 
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Đến ngày:</span>
            <input 
              type="date" 
              value={customEndDate} 
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-primary"
            />
          </div>
          <button 
            onClick={() => {
              setPeriod('custom');
              setShowCustomPicker(false);
            }}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-primary-hover transition-colors shadow-xs cursor-pointer"
          >
            Áp dụng
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* 3. KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Tổng doanh thu */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
                <DollarSign size={26} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h3 className="text-gray-500 font-medium text-xs">Tổng doanh thu</h3>
                <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                  {formatCurrency(reportData?.totalRevenue)}
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {branchSubText}
                </p>
              </div>
            </div>

            {/* Card 2: Tổng đơn hàng */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Receipt size={24} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-gray-500 font-medium text-xs">Tổng đơn hàng</h3>
                <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                  {reportData?.totalInvoices || 0} đơn
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  Hóa đơn hoàn tất thanh toán
                </p>
              </div>
            </div>

            {/* Card 3: Giá trị đơn trung bình */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <TrendingUp size={24} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-gray-500 font-medium text-xs">Giá trị đơn trung bình</h3>
                <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                  {formatCurrency(reportData?.avgOrderValue)}
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  Doanh thu / tổng số đơn
                </p>
              </div>
            </div>
          </div>

          {/* 4. Main Grid: Biểu đồ doanh thu & Top món ăn */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Biểu đồ doanh thu */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">
                    {isHourly 
                      ? 'Biểu đồ doanh thu theo khung giờ trong ngày' 
                      : 'Biểu đồ doanh thu theo ngày'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {isHourly
                      ? `Thống kê theo từng giờ phát sinh đơn (${chartData.length} khung giờ hoạt động)`
                      : `Thống kê doanh thu theo từng ngày phát sinh đơn (${chartData.length} ngày hoạt động)`}
                  </p>
                </div>
                <span className="bg-gray-50 border border-gray-200/80 text-gray-500 text-xs px-2.5 py-1 rounded-lg font-medium shrink-0">
                  Đơn vị: VNĐ
                </span>
              </div>

              <div className="h-80 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        dy={8} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        domain={[0, maxRevenue]}
                        ticks={yTicks}
                        tickFormatter={formatYAxis}
                        width={65}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                        labelFormatter={(label) => `Khung thời gian: ${label}`}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="#E5482D" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={48} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm min-h-[280px]">
                    Không có dữ liệu phát sinh trong kỳ này
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Top món ăn chạy nhất */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[420px]">
              <div>
                <div className="flex items-start justify-between mb-5">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">
                    Top món ăn chạy<br />nhất
                  </h3>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                      {period === 'today' ? 'Hôm nay' : periodLabel}
                    </p>
                    {period === 'today' && (
                      <p className="text-xs text-gray-400">({format(new Date(), 'dd/MM/yyyy')})</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {(reportData?.topItems || []).slice(0, 6).map((item, index) => {
                    const rank = index + 1;
                    const rankBg = rank === 1 
                      ? 'bg-amber-100 text-amber-800'
                      : rank === 2 
                        ? 'bg-slate-100 text-slate-700'
                        : rank === 3 
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-700';

                    return (
                      <div key={item.MenuItemID || index} className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${rankBg}`}>
                          {rank}
                        </div>

                        {/* Title & Quantity */}
                        <div className="flex-1 min-w-0 pr-1">
                          <p className="font-medium text-gray-800 text-sm truncate" title={item.MenuItemName}>
                            {item.MenuItemName}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Đã bán: <span className="font-medium text-gray-600">{Number(item.TotalQuantity)} {item.Unit || 'Phần'}</span>
                          </p>
                        </div>

                        {/* Revenue & Label */}
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-gray-900">
                            {formatCurrency(item.TotalRevenue)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                            DOANH THU
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {(!reportData?.topItems || reportData.topItems.length === 0) && (
                    <div className="py-12 text-center text-gray-400 text-xs">
                      Chưa có dữ liệu món ăn trong kỳ này
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom footer caption */}
              <div className="pt-4 mt-6 border-t border-gray-50 text-center">
                <p className="text-[11px] text-gray-400">
                  Thống kê theo số lượng đơn đặt món đã hoàn tất
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
