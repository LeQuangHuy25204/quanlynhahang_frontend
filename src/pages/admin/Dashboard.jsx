import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  Store, 
  Calendar, 
  Loader2,
  Search,
  Eye,
  Printer,
  X,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Users,
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Tag,
  RotateCcw,
  Award,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { 
  format, 
  subDays, 
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear,
  endOfYear
} from 'date-fns';
import { 
  ComposedChart,
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList
} from 'recharts';

const PAYMENT_METHOD_MAP = {
  CASH: { label: 'Tiền mặt', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Banknote },
  BANK_TRANSFER: { label: 'Chuyển khoản', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: QrCode },
  CARD: { label: 'Thẻ ngân hàng', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: CreditCard },
};

export default function Dashboard() {
  const { staff } = useAuthStore();
  const isRestaurantAdmin = staff?.roleCode === 'RestaurantAdmin';
  const invoiceSectionRef = useRef(null);

  // Branch Selection: 'all' or branchId
  const [selectedBranch, setSelectedBranch] = useState(
    isRestaurantAdmin ? 'all' : (staff?.branchId || 1)
  );

  // Top Report Filter Mode: 'all' | 'day' | 'week' | 'month' | 'year' | 'range'
  const [filterMode, setFilterMode] = useState('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedWeekDate, setSelectedWeekDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Chart Grouping Mode for Multi-day reports: 'day' | 'week' | 'month'
  const [chartGroupBy, setChartGroupBy] = useState('day');

  // Top Items Sort Mode: 'quantity' | 'revenue'
  const [topSortBy, setTopSortBy] = useState('quantity');

  // Invoice List Independent Filter States (Từ ngày - Đến ngày, Search, Phương thức TT)
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Invoice Modal State
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  // Fetch Branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches').then(res => res.data || res),
  });
  const branches = Array.isArray(branchesData) 
    ? branchesData 
    : (Array.isArray(branchesData?.data) ? branchesData.data : []);

  // Calculate startDate, endDate, and label for Top Overview Report
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();

    switch (filterMode) {
      case 'all':
        return {
          startDate: undefined,
          endDate: undefined,
          periodLabel: 'Tất cả thời gian (Toàn bộ dữ liệu)'
        };
      case 'day': {
        const d = selectedDate ? new Date(selectedDate) : now;
        const dStr = selectedDate || format(now, 'yyyy-MM-dd');
        return {
          startDate: dStr,
          endDate: dStr,
          periodLabel: `Theo ngày (${format(d, 'dd/MM/yyyy')})`
        };
      }
      case 'week': {
        const ref = selectedWeekDate ? new Date(selectedWeekDate) : now;
        const wStart = startOfWeek(ref, { weekStartsOn: 1 });
        const wEnd = endOfWeek(ref, { weekStartsOn: 1 });
        return {
          startDate: format(wStart, 'yyyy-MM-dd'),
          endDate: format(wEnd, 'yyyy-MM-dd'),
          periodLabel: `Theo tuần (${format(wStart, 'dd/MM/yyyy')} - ${format(wEnd, 'dd/MM/yyyy')})`
        };
      }
      case 'month': {
        const [y, m] = (selectedMonth || format(now, 'yyyy-MM')).split('-').map(Number);
        const mDate = new Date(y, (m || 1) - 1, 1);
        const mStart = startOfMonth(mDate);
        const mEnd = endOfMonth(mDate);
        return {
          startDate: format(mStart, 'yyyy-MM-dd'),
          endDate: format(mEnd, 'yyyy-MM-dd'),
          periodLabel: `Tháng ${format(mDate, 'MM/yyyy')} (${format(mStart, 'dd/MM')} - ${format(mEnd, 'dd/MM/yyyy')})`
        };
      }
      case 'year': {
        const yDate = new Date(Number(selectedYear) || now.getFullYear(), 0, 1);
        const yStart = startOfYear(yDate);
        const yEnd = endOfYear(yDate);
        return {
          startDate: format(yStart, 'yyyy-MM-dd'),
          endDate: format(yEnd, 'yyyy-MM-dd'),
          periodLabel: `Năm ${selectedYear} (01/01/${selectedYear} - 31/12/${selectedYear})`
        };
      }
      case 'range': {
        return {
          startDate: customStartDate,
          endDate: customEndDate,
          periodLabel: `Từ ${format(new Date(customStartDate), 'dd/MM/yyyy')} đến ${format(new Date(customEndDate), 'dd/MM/yyyy')}`
        };
      }
      default:
        return {
          startDate: undefined,
          endDate: undefined,
          periodLabel: 'Tất cả thời gian'
        };
    }
  }, [filterMode, selectedDate, selectedWeekDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Sync invoice date range when user changes top filter mode
  const applyTopFilterRange = (sDate, eDate) => {
    setInvoiceStartDate(sDate || '');
    setInvoiceEndDate(eDate || '');
    setCurrentPage(1);
  };

  const handleModeChange = (mode) => {
    setFilterMode(mode);
    setChartGroupBy('day');
    const now = new Date();
    if (mode === 'all') {
      applyTopFilterRange('', '');
    } else if (mode === 'day') {
      applyTopFilterRange(selectedDate, selectedDate);
    } else if (mode === 'week') {
      const ref = selectedWeekDate ? new Date(selectedWeekDate) : now;
      applyTopFilterRange(
        format(startOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        format(endOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      );
    } else if (mode === 'month') {
      const [y, m] = (selectedMonth || format(now, 'yyyy-MM')).split('-').map(Number);
      const mDate = new Date(y, (m || 1) - 1, 1);
      applyTopFilterRange(
        format(startOfMonth(mDate), 'yyyy-MM-dd'),
        format(endOfMonth(mDate), 'yyyy-MM-dd')
      );
    } else if (mode === 'year') {
      const yDate = new Date(Number(selectedYear) || now.getFullYear(), 0, 1);
      applyTopFilterRange(
        format(startOfYear(yDate), 'yyyy-MM-dd'),
        format(endOfYear(yDate), 'yyyy-MM-dd')
      );
    } else if (mode === 'range') {
      applyTopFilterRange(customStartDate, customEndDate);
    }
  };

  // Fetch Overview Report Data for top section (KPIs, Chart, Top Items)
  const { data: rawReportData, isLoading } = useQuery({
    queryKey: ['reportData', selectedBranch, startDate || 'ALL', endDate || 'ALL'],
    queryFn: () => apiClient.get('/reports/branch-revenue', {
      params: {
        branchId: selectedBranch === 'all' ? undefined : selectedBranch,
        startDate,
        endDate
      }
    }),
  });

  const reportData = rawReportData?.data || rawReportData;

  // Fetch ALL Invoices of the branch so the Invoice List can filter freely by Từ ngày - Đến ngày without period restriction
  const { data: rawAllBranchData, isLoading: isLoadingAllInvoices } = useQuery({
    queryKey: ['allBranchInvoices', selectedBranch],
    queryFn: () => apiClient.get('/reports/branch-revenue', {
      params: {
        branchId: selectedBranch === 'all' ? undefined : selectedBranch
      }
    }),
  });
  const allBranchData = rawAllBranchData?.data || rawAllBranchData;

  // Fetch Detail of Selected Invoice when modal is open
  const { data: rawInvoiceDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['invoiceDetail', selectedPaymentId],
    queryFn: () => apiClient.get(`/payments/${selectedPaymentId}/invoice`).then(res => res.data || res),
    enabled: Boolean(selectedPaymentId),
  });
  const invoiceDetail = rawInvoiceDetail?.data || rawInvoiceDetail;

  // Determine Branch Label for header & cards
  const selectedBranchObj = branches.find(b => b.BranchID === Number(selectedBranch));
  const currentBranchName = selectedBranch === 'all' 
    ? `Toàn bộ hệ thống (${branches.length || 2} Chi nhánh)` 
    : (selectedBranchObj?.Name || `Chi nhánh #${selectedBranch}`);

  const branchSubText = selectedBranch === 'all'
    ? `Tổng ${branches.length || 2} chi nhánh (đã thanh toán)`
    : `${selectedBranchObj?.Name || 'Chi nhánh'} (đã thanh toán)`;

  // Determine whether chart is hourly or daily/grouped
  const isHourly = Boolean(startDate && endDate && startDate === endDate && reportData?.hourly && reportData.hourly.length > 0);

  // Build Chart Data based on Hourly OR Daily / Weekly / Monthly grouping
  const chartData = useMemo(() => {
    if (isHourly) {
      return (reportData?.hourly || []).map(item => ({
        label: `${String(item.Hour).padStart(2, '0')}:00`,
        fullLabel: `Khung giờ ${String(item.Hour).padStart(2, '0')}:00 - ${String(item.Hour).padStart(2, '0')}:59`,
        rawStartDate: startDate,
        rawEndDate: startDate,
        revenue: Number(item.TotalRevenue),
        invoices: Number(item.TotalInvoices)
      }));
    }

    const dailyList = reportData?.daily || [];
    if (chartGroupBy === 'week' && dailyList.length > 1) {
      const weekMap = new Map();
      dailyList.forEach(item => {
        const d = new Date(item.Date);
        const wStart = startOfWeek(d, { weekStartsOn: 1 });
        const wEnd = endOfWeek(d, { weekStartsOn: 1 });
        const key = format(wStart, 'yyyy-MM-dd');
        if (!weekMap.has(key)) {
          weekMap.set(key, {
            label: `${format(wStart, 'dd/MM')}-${format(wEnd, 'dd/MM')}`,
            fullLabel: `Tuần ${format(wStart, 'dd/MM/yyyy')} - ${format(wEnd, 'dd/MM/yyyy')}`,
            rawStartDate: format(wStart, 'yyyy-MM-dd'),
            rawEndDate: format(wEnd, 'yyyy-MM-dd'),
            revenue: 0,
            invoices: 0,
            daysCount: 0
          });
        }
        const entry = weekMap.get(key);
        entry.revenue += Number(item.TotalRevenue || 0);
        entry.invoices += Number(item.TotalInvoices || 0);
        entry.daysCount += 1;
      });
      return Array.from(weekMap.values());
    }

    if (chartGroupBy === 'month' && dailyList.length > 1) {
      const monthMap = new Map();
      dailyList.forEach(item => {
        const d = new Date(item.Date);
        const mStart = startOfMonth(d);
        const mEnd = endOfMonth(d);
        const key = format(mStart, 'yyyy-MM');
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            label: `Tháng ${format(mStart, 'MM/yyyy')}`,
            fullLabel: `Tháng ${format(mStart, 'MM/yyyy')} (${format(mStart, 'dd/MM')} - ${format(mEnd, 'dd/MM')})`,
            rawStartDate: format(mStart, 'yyyy-MM-dd'),
            rawEndDate: format(mEnd, 'yyyy-MM-dd'),
            revenue: 0,
            invoices: 0,
            daysCount: 0
          });
        }
        const entry = monthMap.get(key);
        entry.revenue += Number(item.TotalRevenue || 0);
        entry.invoices += Number(item.TotalInvoices || 0);
        entry.daysCount += 1;
      });
      return Array.from(monthMap.values());
    }

    return dailyList.map(item => {
      const d = new Date(item.Date);
      return {
        label: format(d, 'dd/MM'),
        fullLabel: `Ngày ${format(d, 'dd/MM/yyyy')}`,
        rawStartDate: item.Date,
        rawEndDate: item.Date,
        revenue: Number(item.TotalRevenue),
        invoices: Number(item.TotalInvoices)
      };
    });
  }, [isHourly, reportData, startDate, chartGroupBy]);

  // Executive Insights (Highest, Lowest, Average, Above Average Count)
  const chartInsights = useMemo(() => {
    if (!chartData.length) return null;
    let highest = chartData[0];
    let lowest = chartData[0];
    let totalRev = 0;
    let totalInv = 0;

    chartData.forEach(item => {
      if (item.revenue > highest.revenue) highest = item;
      if (item.revenue < lowest.revenue) lowest = item;
      totalRev += item.revenue;
      totalInv += item.invoices;
    });

    const avgRevenue = Math.round(totalRev / chartData.length);
    const avgInvoices = Math.round(totalInv / chartData.length);
    const aboveAvgCount = chartData.filter(d => d.revenue >= avgRevenue).length;

    return {
      highest,
      lowest,
      avgRevenue,
      avgInvoices,
      aboveAvgCount,
      totalPoints: chartData.length
    };
  }, [chartData]);

  // Master list of all invoices for the selected branch (unrestricted by period)
  const masterInvoices = useMemo(() => {
    if (Array.isArray(allBranchData?.invoices)) return allBranchData.invoices;
    if (Array.isArray(reportData?.invoices)) return reportData.invoices;
    return [];
  }, [allBranchData, reportData]);

  // Filtered invoices for table using independent Từ ngày - Đến ngày (invoiceStartDate -> invoiceEndDate)
  const filteredInvoices = useMemo(() => {
    return masterInvoices.filter(inv => {
      const dateStr = inv.InvoiceDateStr || (inv.InvoiceDate ? format(new Date(inv.InvoiceDate), 'yyyy-MM-dd') : '');
      if (invoiceStartDate && dateStr < invoiceStartDate) {
        return false;
      }
      if (invoiceEndDate && dateStr > invoiceEndDate) {
        return false;
      }
      if (paymentMethodFilter !== 'ALL' && inv.PaymentMethod !== paymentMethodFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchInvoiceNo = (inv.InvoiceNumber || '').toLowerCase().includes(q);
        const matchTable = (inv.TableName || '').toLowerCase().includes(q);
        const matchArea = (inv.AreaName || '').toLowerCase().includes(q);
        const matchBranch = (inv.BranchName || '').toLowerCase().includes(q);
        if (!matchInvoiceNo && !matchTable && !matchArea && !matchBranch) return false;
      }
      return true;
    });
  }, [masterInvoices, invoiceStartDate, invoiceEndDate, paymentMethodFilter, searchTerm]);

  // Totals of currently filtered invoices
  const filteredSummary = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inv) => {
        acc.subTotal += Number(inv.SubTotal || 0);
        acc.taxAndFee += Number(inv.VATAmount || 0) + Number(inv.ServiceFeeAmount || 0);
        acc.discount += Number(inv.DiscountAmount || 0);
        acc.total += Number(inv.TotalAmount || 0);
        return acc;
      },
      { subTotal: 0, taxAndFee: 0, discount: 0, total: 0 }
    );
  }, [filteredInvoices]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const paginatedInvoices = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(startIdx, startIdx + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
  };

  // Format short currency for bar labels (e.g. "62,5 tr")
  const formatShortMillions = (val) => {
    if (!val || val === 0) return '';
    if (val >= 1000000) {
      const m = val / 1000000;
      return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace('.', ',')} tr`;
    }
    return `${Math.round(val / 1000)}k`;
  };

  // Format YAxis ticks cleanly
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

  // Compute clean round Y-axis max domain & ticks (10tr, 20tr, 50tr, 100tr steps — never odd numbers like 19tr, 38tr, 57tr)
  const { maxRevenue, yTicks } = useMemo(() => {
    const defaultMax = 8000000;
    if (!chartData.length) {
      return { maxRevenue: defaultMax, yTicks: [0, 2000000, 4000000, 6000000, 8000000] };
    }
    const maxVal = Math.max(...chartData.map(d => d.revenue));
    const padded = maxVal * 1.15;

    // Pick a clean round step: 1tr, 2tr, 5tr, 10tr, 20tr, 50tr, 100tr, 200tr
    const rawStep = padded / 4;
    const niceSteps = [
      1000000,
      2000000,
      5000000,
      10000000,
      15000000,
      20000000,
      25000000,
      50000000,
      100000000,
      200000000,
      500000000
    ];
    const step = niceSteps.find(s => s >= rawStep) || Math.ceil(rawStep / 100000000) * 100000000;
    const targetMax = Math.ceil(padded / step) * step;

    const ticks = [];
    for (let i = 0; i <= targetMax; i += step) {
      ticks.push(i);
    }
    return { maxRevenue: targetMax, yTicks: ticks };
  }, [chartData]);

  const scrollToInvoices = () => {
    invoiceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const unitLabel = isHourly
    ? 'khung giờ'
    : chartGroupBy === 'week'
      ? 'tuần'
      : chartGroupBy === 'month'
        ? 'tháng'
        : 'ngày';

  return (
    <div className="space-y-6 w-full max-w-[1440px] mx-auto pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Tổng quan Báo cáo & Hóa đơn
            </h1>
            <span className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
              <Store size={13} />
              {currentBranchName}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5 font-medium">
            <Calendar size={14} className="text-rose-500" />
            <span>Báo cáo đang xem: <strong className="text-gray-800">{periodLabel}</strong></span>
          </p>
        </div>

        {/* Branch Filter Tabs (Top Right - for RestaurantAdmin) */}
        {isRestaurantAdmin && (
          <div className="flex items-center gap-2 flex-wrap bg-gray-50/80 p-1.5 rounded-2xl border border-gray-200/80">
            <button
              onClick={() => {
                setSelectedBranch('all');
                setCurrentPage(1);
              }}
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
                onClick={() => {
                  setSelectedBranch(b.BranchID);
                  setCurrentPage(1);
                }}
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

      {/* 2. Unified Filter Bar (Clean single bar, no duplicates) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 text-gray-500 font-semibold mr-1 py-1">
              <Filter size={15} className="text-rose-500" />
              <span>Lọc báo cáo:</span>
            </div>

            {[
              { key: 'all', label: 'Tất cả thời gian' },
              { key: 'day', label: 'Theo Ngày' },
              { key: 'week', label: 'Theo Tuần' },
              { key: 'month', label: 'Theo Tháng' },
              { key: 'year', label: 'Theo Năm' },
              { key: 'range', label: 'Từ ngày - Đến ngày' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleModeChange(item.key)}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  filterMode === item.key
                    ? 'bg-rose-500 text-white font-bold shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/60 font-medium'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Inline picker for active mode */}
          {filterMode === 'day' && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-500 font-medium">Chọn ngày:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDate(val);
                  applyTopFilterRange(val, val);
                }}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={() => {
                  const d = format(new Date(), 'yyyy-MM-dd');
                  setSelectedDate(d);
                  applyTopFilterRange(d, d);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Hôm nay
              </button>
              <button
                onClick={() => {
                  const d = format(subDays(new Date(), 1), 'yyyy-MM-dd');
                  setSelectedDate(d);
                  applyTopFilterRange(d, d);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Hôm qua
              </button>
            </div>
          )}

          {filterMode === 'week' && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-500 font-medium">Chọn ngày trong tuần:</span>
              <input
                type="date"
                value={selectedWeekDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedWeekDate(val);
                  if (val) {
                    const ref = new Date(val);
                    applyTopFilterRange(
                      format(startOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                      format(endOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                    );
                  }
                }}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={() => {
                  const now = new Date();
                  const d = format(now, 'yyyy-MM-dd');
                  setSelectedWeekDate(d);
                  applyTopFilterRange(
                    format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                    format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Tuần này
              </button>
              <button
                onClick={() => {
                  const prevW = subWeeks(new Date(), 1);
                  setSelectedWeekDate(format(prevW, 'yyyy-MM-dd'));
                  applyTopFilterRange(
                    format(startOfWeek(prevW, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                    format(endOfWeek(prevW, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Tuần trước
              </button>
            </div>
          )}

          {filterMode === 'month' && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-500 font-medium">Chọn tháng:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMonth(val);
                  if (val) {
                    const [y, m] = val.split('-').map(Number);
                    const mDate = new Date(y, (m || 1) - 1, 1);
                    applyTopFilterRange(
                      format(startOfMonth(mDate), 'yyyy-MM-dd'),
                      format(endOfMonth(mDate), 'yyyy-MM-dd')
                    );
                  }
                }}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(format(now, 'yyyy-MM'));
                  applyTopFilterRange(
                    format(startOfMonth(now), 'yyyy-MM-dd'),
                    format(endOfMonth(now), 'yyyy-MM-dd')
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Tháng này
              </button>
              <button
                onClick={() => {
                  const prevM = subMonths(new Date(), 1);
                  setSelectedMonth(format(prevM, 'yyyy-MM'));
                  applyTopFilterRange(
                    format(startOfMonth(prevM), 'yyyy-MM-dd'),
                    format(endOfMonth(prevM), 'yyyy-MM-dd')
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Tháng trước
              </button>
            </div>
          )}

          {filterMode === 'year' && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-500 font-medium">Chọn năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = e.target.value;
                  setSelectedYear(y);
                  const yDate = new Date(Number(y), 0, 1);
                  applyTopFilterRange(
                    format(startOfYear(yDate), 'yyyy-MM-dd'),
                    format(endOfYear(yDate), 'yyyy-MM-dd')
                  );
                }}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-500 bg-white cursor-pointer"
              >
                {[0, 1, 2, 3].map((offset) => {
                  const y = String(new Date().getFullYear() - offset);
                  return (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {filterMode === 'range' && (
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Từ ngày:</span>
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomStartDate(val);
                    applyTopFilterRange(val, customEndDate);
                  }}
                  className="border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Đến ngày:</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomEndDate(val);
                    applyTopFilterRange(customStartDate, val);
                  }}
                  className="border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="h-48 flex items-center justify-center bg-white rounded-2xl border border-gray-100">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
            <span className="text-xs text-gray-500 font-medium">Đang tải dữ liệu báo cáo...</span>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* 3. Detailed Overview KPI Cards (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Tổng doanh thu thực thu */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Tổng doanh thu thực thu</h3>
                  <p className="text-lg xl:text-xl font-black text-emerald-600 tracking-tight mt-1 whitespace-nowrap">
                    {formatCurrency(reportData?.totalRevenue)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{branchSubText}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <DollarSign size={18} strokeWidth={2.5} />
                </div>
              </div>

              {/* Payment method breakdown */}
              <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1 text-xs">
                {(reportData?.paymentBreakdown || []).length > 0 ? (
                  reportData.paymentBreakdown.map((pm) => {
                    const meta = PAYMENT_METHOD_MAP[pm.method] || { label: pm.method };
                    return (
                      <div key={pm.method} className="flex items-center justify-between text-gray-600 gap-1">
                        <span className="text-[11px] flex items-center gap-1 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          {meta.label} ({pm.count}):
                        </span>
                        <span className="font-bold text-gray-800 text-[11px] whitespace-nowrap">
                          {formatCurrency(pm.revenue)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-gray-400">Chưa phát sinh giao dịch</p>
                )}
              </div>
            </div>

            {/* Card 2: Tổng hóa đơn & Lượt khách */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Tổng số hóa đơn</h3>
                  <p className="text-lg xl:text-xl font-black text-gray-900 tracking-tight mt-1 whitespace-nowrap">
                    {reportData?.totalInvoices || 0} <span className="text-xs font-bold text-gray-500">hóa đơn</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Đã hoàn tất thanh toán</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Receipt size={18} strokeWidth={2.2} />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1 text-gray-600 whitespace-nowrap text-[11px]">
                  <Users size={13} className="text-blue-500 shrink-0" />
                  <span><strong>{reportData?.totalGuests || 0}</strong> khách</span>
                </div>
                <button
                  onClick={scrollToInvoices}
                  className="text-blue-600 hover:text-blue-800 font-bold text-[11px] underline cursor-pointer whitespace-nowrap"
                >
                  Xem hóa đơn
                </button>
              </div>
            </div>

            {/* Card 3: Chi tiết cấu thành Doanh thu */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Cấu thành doanh thu</h3>
                  <p className="text-lg xl:text-xl font-black text-gray-900 tracking-tight mt-1 whitespace-nowrap">
                    {formatCurrency(reportData?.subTotal)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Tổng tiền món (Tạm tính)</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Calculator size={18} strokeWidth={2.2} />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-600 gap-1">
                  <span className="truncate">Thuế VAT + Phí DV:</span>
                  <span className="font-bold text-gray-800 whitespace-nowrap">
                    +{formatCurrency((reportData?.vatAmount || 0) + (reportData?.serviceFeeAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600 gap-1">
                  <span className="truncate">Khuyến mãi / Giảm:</span>
                  <span className="font-bold whitespace-nowrap">
                    -{formatCurrency(reportData?.discountAmount || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Giá trị đơn trung bình */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Trung bình / Hóa đơn</h3>
                  <p className="text-lg xl:text-xl font-black text-amber-600 tracking-tight mt-1 whitespace-nowrap">
                    {formatCurrency(reportData?.avgOrderValue)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Doanh thu / Tổng số đơn</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} strokeWidth={2.2} />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600 gap-1">
                <span>Trung bình / Khách:</span>
                <span className="font-bold text-gray-800 whitespace-nowrap">
                  {reportData?.totalGuests > 0
                    ? formatCurrency(Math.round((reportData?.totalRevenue || 0) / reportData.totalGuests))
                    : '0 đ'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Main Grid: Biểu đồ Phân tích Quản trị (Executive Chart) & Top món ăn */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Left 2 Cols: Biểu đồ doanh thu & Điểm nhấn báo cáo */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between space-y-5 h-full">
              {/* Top Header & Grouping Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 size={20} className="text-rose-500" />
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">
                      {isHourly 
                        ? 'Biểu đồ Doanh thu & Lượng đơn theo Khung giờ' 
                        : 'Biểu đồ Phân tích Doanh thu & Lượng đơn hàng'}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isHourly
                      ? `Thống kê theo từng giờ phát sinh đơn (${chartData.length} khung giờ)`
                      : `So sánh doanh thu, số lượng hóa đơn và mức trung bình theo ${unitLabel} (${chartData.length} ${unitLabel})`}
                  </p>
                </div>

                {/* Group By Switcher (Theo Ngày / Theo Tuần / Theo Tháng) when viewing multi-day */}
                {!isHourly && (reportData?.daily?.length || 0) > 1 && (
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs shrink-0">
                    {[
                      { key: 'day', label: 'Theo Ngày' },
                      { key: 'week', label: 'Gộp theo Tuần' },
                      { key: 'month', label: 'Gộp theo Tháng' },
                    ].map((g) => (
                      <button
                        key={g.key}
                        onClick={() => setChartGroupBy(g.key)}
                        className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          chartGroupBy === g.key
                            ? 'bg-white text-gray-900 shadow-xs font-bold'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3 Thẻ Điểm Nhấn Báo Cáo (Executive Summary Highlights) */}
              {chartInsights && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Đỉnh doanh thu */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Award size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                        Cao điểm nhất ({chartInsights.highest.label})
                      </span>
                      <span className="text-sm font-black text-gray-900 block mt-0.5 whitespace-nowrap">
                        {formatCurrency(chartInsights.highest.revenue)}
                      </span>
                      <span className="text-[11px] text-amber-700 font-medium">
                        Đạt {chartInsights.highest.invoices} hóa đơn
                      </span>
                    </div>
                  </div>

                  {/* Trung bình kỳ */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Trung bình / {unitLabel}
                      </span>
                      <span className="text-sm font-black text-gray-900 block mt-0.5 whitespace-nowrap">
                        {formatCurrency(chartInsights.avgRevenue)}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        {chartInsights.aboveAvgCount}/{chartInsights.totalPoints} {unitLabel} vượt mức TB
                      </span>
                    </div>
                  </div>

                  {/* Thấp nhất kỳ */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingDown size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Thấp nhất ({chartInsights.lowest.label})
                      </span>
                      <span className="text-sm font-black text-gray-900 block mt-0.5 whitespace-nowrap">
                        {formatCurrency(chartInsights.lowest.revenue)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Đạt {chartInsights.lowest.invoices} hóa đơn
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chú giải (Legend) trực quan cho người xem báo cáo */}
              {chartData.length > 0 && (
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px] text-gray-600">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-3 h-3 rounded-xs bg-[#E5482D] inline-block"></span>
                      Vượt mức trung bình
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-3 h-3 rounded-xs bg-[#FDBA74] inline-block"></span>
                      Dưới mức trung bình
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-4 h-0.5 bg-[#2563EB] inline-block"></span>
                      Số lượng hóa đơn (Trục phải)
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-4 border-b-2 border-dashed border-emerald-600 inline-block"></span>
                      Mức doanh thu TB
                    </span>
                  </div>
                  <span className="text-gray-400 italic">
                    * Nhấn vào cột để lọc danh sách hóa đơn bên dưới
                  </span>
                </div>
              )}

              {/* Composed Chart (Cột Doanh thu + Đường Số đơn + Đường Trung bình, không bị viền đen khi click) */}
              <div className="h-80 w-full [&_svg]:outline-none [&_*]:outline-none">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 22, right: 10, left: 0, bottom: 5 }}
                      onClick={(state) => {
                        if (!isHourly && state?.activePayload?.[0]?.payload) {
                          const p = state.activePayload[0].payload;
                          if (p.rawStartDate && p.rawEndDate) {
                            setInvoiceStartDate(p.rawStartDate);
                            setInvoiceEndDate(p.rawEndDate);
                            setCurrentPage(1);
                            scrollToInvoices();
                          }
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                        dy={8} 
                      />
                      {/* Left Y Axis: Revenue */}
                      <YAxis 
                        yAxisId="left"
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                        domain={[0, maxRevenue]}
                        ticks={yTicks}
                        tickFormatter={formatYAxis}
                        width={68}
                      />
                      {/* Right Y Axis: Invoice Count */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#2563EB', fontWeight: 600 }}
                        tickFormatter={(v) => `${v} đơn`}
                        width={52}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const data = payload[0].payload;
                          const diffFromAvg = chartInsights?.avgRevenue
                            ? Math.round(((data.revenue - chartInsights.avgRevenue) / chartInsights.avgRevenue) * 100)
                            : 0;
                          return (
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-lg text-xs space-y-1.5 min-w-[210px]">
                              <p className="font-black text-gray-900 border-b border-gray-100 pb-1.5">
                                {data.fullLabel || data.label}
                              </p>
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-500">Doanh thu:</span>
                                <span className="font-black text-rose-600 text-sm">
                                  {formatCurrency(data.revenue)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-500">Số lượng đơn:</span>
                                <span className="font-bold text-blue-600">
                                  {data.invoices} hóa đơn
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-500">TB / hóa đơn:</span>
                                <span className="font-semibold text-gray-800">
                                  {data.invoices > 0 ? formatCurrency(data.revenue / data.invoices) : '0 đ'}
                                </span>
                              </div>
                              {chartInsights && (
                                <div className="pt-1 border-t border-gray-100 flex justify-between items-center">
                                  <span className="text-gray-400">So với mức TB:</span>
                                  <span className={`font-bold ${diffFromAvg >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {diffFromAvg >= 0 ? `+${diffFromAvg}% (Vượt TB)` : `${diffFromAvg}% (Dưới TB)`}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      {/* Average Revenue Reference Line */}
                      {chartInsights?.avgRevenue > 0 && (
                        <ReferenceLine
                          yAxisId="left"
                          y={chartInsights.avgRevenue}
                          stroke="#10B981"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                        />
                      )}
                      <Bar 
                        yAxisId="left"
                        dataKey="revenue" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={46}
                        className="cursor-pointer"
                      >
                        {chartData.length <= 12 && (
                          <LabelList
                            dataKey="revenue"
                            position="top"
                            formatter={formatShortMillions}
                            style={{ fontSize: '10px', fontWeight: 700, fill: '#334155' }}
                          />
                        )}
                        {chartData.map((entry, index) => {
                          const isAboveAvg = !chartInsights || entry.revenue >= chartInsights.avgRevenue;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={isAboveAvg ? '#E5482D' : '#FDBA74'}
                            />
                          );
                        })}
                      </Bar>
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="invoices"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: '#2563EB', strokeWidth: 1.5, stroke: '#fff' }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm min-h-[280px] gap-2">
                    <Receipt size={36} className="text-gray-300" />
                    <p>Không có dữ liệu doanh thu phát sinh trong bộ lọc này ({periodLabel})</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Top món ăn chạy nhất */}
            {(() => {
              const sortedTopItems = [...(reportData?.topItems || [])]
                .sort((a, b) => {
                  const qA = Number(a.TotalQuantity || 0);
                  const qB = Number(b.TotalQuantity || 0);
                  const rA = Number(a.TotalRevenue || 0);
                  const rB = Number(b.TotalRevenue || 0);
                  if (topSortBy === 'revenue') {
                    return rB !== rA ? rB - rA : qB - qA;
                  }
                  return qB !== qA ? qB - qA : rB - rA;
                })
                .slice(0, 10);

              const formatQty = (val) => {
                const n = Number(val || 0);
                return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
              };

              return (
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">
                          Top món ăn bán chạy
                        </h3>
                        <span className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg font-bold">
                          Top {sortedTopItems.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                        <button
                          type="button"
                          onClick={() => setTopSortBy('quantity')}
                          className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                            topSortBy === 'quantity'
                              ? 'bg-white text-gray-900 shadow-xs font-bold'
                              : 'text-gray-500 hover:text-gray-800 font-medium'
                          }`}
                        >
                          Theo SL
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopSortBy('revenue')}
                          className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                            topSortBy === 'revenue'
                              ? 'bg-white text-gray-900 shadow-xs font-bold'
                              : 'text-gray-500 hover:text-gray-800 font-medium'
                          }`}
                        >
                          Theo DT
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {sortedTopItems.map((item, index) => {
                        const rank = index + 1;
                        const rankBg = rank === 1 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : rank === 2 
                            ? 'bg-slate-200 text-slate-800'
                            : rank === 3 
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-600';

                        return (
                          <div key={item.MenuItemID || index} className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${rankBg}`}>
                              {rank}
                            </div>

                            <div className="flex-1 min-w-0 pr-1">
                              <p className="font-semibold text-gray-800 text-[13px] leading-snug truncate" title={item.MenuItemName}>
                                {item.MenuItemName}
                              </p>
                              <p className="text-[11px] text-gray-400 leading-tight">
                                Đã bán: <span className="font-bold text-gray-700">{formatQty(item.TotalQuantity)} {item.Unit || 'Phần'}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="font-bold text-[13px] text-gray-900 whitespace-nowrap leading-snug">
                                {formatCurrency(item.TotalRevenue)}
                              </p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-tight">
                                DOANH THU
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {sortedTopItems.length === 0 && (
                        <div className="py-12 text-center text-gray-400 text-xs">
                          Chưa có dữ liệu món ăn
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-gray-100 text-center">
                    <p className="text-[11px] text-gray-400">
                      {topSortBy === 'revenue'
                        ? 'Xếp hạng theo tổng doanh thu món ăn đã thanh toán'
                        : 'Xếp hạng theo số lượng món ăn đã phục vụ & thanh toán'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 5. BẢNG DANH SÁCH HÓA ĐƠN (CHỌN TỪ NGÀY - ĐẾN NGÀY ĐỘC LẬP & KHÔNG BỊ TRÀN) */}
          <div ref={invoiceSectionRef} className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            {/* Table Header & Date Range Filter Controls */}
            <div className="p-5 sm:p-6 border-b border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <FileText size={20} className="text-rose-500" />
                    <h3 className="font-bold text-lg text-gray-900">
                      Danh sách Hóa đơn
                    </h3>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      {filteredInvoices.length} hóa đơn
                    </span>
                    {(invoiceStartDate || invoiceEndDate || searchTerm || paymentMethodFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setInvoiceStartDate('');
                          setInvoiceEndDate('');
                          setSearchTerm('');
                          setPaymentMethodFilter('ALL');
                          setCurrentPage(1);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Xem tất cả ({masterInvoices.length} đơn)</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Chọn <strong>Từ ngày – Đến ngày</strong> bên dưới để lọc danh sách hóa đơn theo khoảng thời gian bất kỳ, sau đó bấm <strong>"Xem chi tiết"</strong>.
                  </p>
                </div>
              </div>

              {/* Filter Bar for Invoice Table: Từ ngày - Đến ngày + Search + Phương thức TT */}
              <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/70 flex items-center justify-between flex-wrap gap-3 text-xs">
                {/* Từ ngày - Đến ngày */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 font-semibold whitespace-nowrap">Từ ngày:</span>
                    <input
                      type="date"
                      value={invoiceStartDate}
                      onChange={(e) => {
                        setInvoiceStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 font-semibold whitespace-nowrap">Đến ngày:</span>
                    <input
                      type="date"
                      value={invoiceEndDate}
                      onChange={(e) => {
                        setInvoiceEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-500 cursor-pointer"
                    />
                  </div>

                  {(invoiceStartDate || invoiceEndDate) && (
                    <button
                      onClick={() => {
                        setInvoiceStartDate('');
                        setInvoiceEndDate('');
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-gray-600 font-semibold transition-colors cursor-pointer"
                    >
                      Bỏ lọc ngày ✕
                    </button>
                  )}
                </div>

                {/* Search & Payment Method */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã HĐ, bàn, khu vực..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-white pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-rose-500 w-48 sm:w-56"
                    />
                  </div>

                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => {
                      setPaymentMethodFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-rose-500 bg-white cursor-pointer"
                  >
                    <option value="ALL">Tất cả phương thức TT</option>
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                    <option value="CARD">Thẻ ngân hàng</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Compact, Non-Overflowing Invoice Table (7 Well-Proportioned Columns) */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Mã HĐ & Thời gian</th>
                    <th className="py-3 px-3">Bàn / Khu vực</th>
                    <th className="py-3 px-3 text-right">Tạm tính</th>
                    <th className="py-3 px-3 text-right">Thuế/Phí & KM</th>
                    <th className="py-3 px-3 text-right">Tổng thanh toán</th>
                    <th className="py-3 px-3 text-center">Phương thức</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {isLoadingAllInvoices && masterInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        Đang tải danh sách hóa đơn...
                      </td>
                    </tr>
                  ) : paginatedInvoices.length > 0 ? (
                    paginatedInvoices.map((inv) => {
                      const pmMeta = PAYMENT_METHOD_MAP[inv.PaymentMethod] || {
                        label: inv.PaymentMethod || 'Tiền mặt',
                        color: 'bg-gray-100 text-gray-700 border-gray-200'
                      };
                      const taxAndFee = Number(inv.VATAmount || 0) + Number(inv.ServiceFeeAmount || 0);
                      const discount = Number(inv.DiscountAmount || 0);

                      return (
                        <tr
                          key={inv.InvoiceID}
                          onClick={() => setSelectedPaymentId(inv.PaymentID)}
                          className="hover:bg-rose-50/40 transition-colors cursor-pointer group"
                        >
                          {/* Col 1: Mã HĐ & Thời gian */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-gray-900 group-hover:text-rose-600">
                              {inv.InvoiceNumber}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {inv.InvoiceDate ? format(new Date(inv.InvoiceDate), 'dd/MM/yyyy HH:mm') : 'N/A'}
                            </div>
                          </td>

                          {/* Col 2: Bàn / Khu vực & Số món */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-gray-800 whitespace-nowrap">
                                {inv.TableName || 'Bàn mang về'}
                              </span>
                              <span className="bg-gray-100 text-gray-700 font-semibold px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                {inv.ItemCount || 0} món
                              </span>
                              {inv.GuestCount > 0 && (
                                <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                  • {inv.GuestCount} khách
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {inv.AreaName || 'Khu vực chung'}
                              {isRestaurantAdmin && selectedBranch === 'all' && inv.BranchName
                                ? ` • ${inv.BranchName}`
                                : ''}
                            </div>
                          </td>

                          {/* Col 3: Tạm tính */}
                          <td className="py-3 px-3 text-right text-gray-700 font-semibold whitespace-nowrap">
                            {formatCurrency(inv.SubTotal)}
                          </td>

                          {/* Col 4: Thuế/Phí & Khuyến mãi */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="text-gray-600">+{formatCurrency(taxAndFee)}</div>
                            {discount > 0 && (
                              <div className="text-[11px] text-rose-600 font-semibold">
                                KM: -{formatCurrency(discount)}
                              </div>
                            )}
                          </td>

                          {/* Col 5: Tổng thanh toán */}
                          <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                            {formatCurrency(inv.TotalAmount)}
                          </td>

                          {/* Col 6: Phương thức thanh toán */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${pmMeta.color}`}>
                              {pmMeta.label}
                            </span>
                          </td>

                          {/* Col 7: Nút Xem chi tiết */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPaymentId(inv.PaymentID);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white font-bold text-xs transition-all cursor-pointer border border-rose-200/80"
                            >
                              <Eye size={13} />
                              <span>Xem chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <span>Không có hóa đơn nào trong khoảng ngày đã chọn.</span>
                          {(invoiceStartDate || invoiceEndDate) && (
                            <button
                              onClick={() => {
                                setInvoiceStartDate('');
                                setInvoiceEndDate('');
                                setCurrentPage(1);
                              }}
                              className="text-rose-600 font-bold underline cursor-pointer text-xs"
                            >
                              Xem lại tất cả hóa đơn ({masterInvoices.length} đơn)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Summary Row of Filtered Invoices */}
                {filteredInvoices.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50/90 border-t-2 border-gray-200 font-bold text-xs text-gray-800">
                      <td colSpan={2} className="py-3.5 px-4 text-right uppercase text-gray-500">
                        Tổng cộng ({filteredInvoices.length} hóa đơn):
                      </td>
                      <td className="py-3.5 px-3 text-right text-gray-900 whitespace-nowrap">
                        {formatCurrency(filteredSummary.subTotal)}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="text-gray-700">+{formatCurrency(filteredSummary.taxAndFee)}</div>
                        {filteredSummary.discount > 0 && (
                          <div className="text-[11px] text-rose-600">-{formatCurrency(filteredSummary.discount)}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right text-emerald-700 font-black text-sm whitespace-nowrap">
                        {formatCurrency(filteredSummary.total)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredInvoices.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span>Hiển thị</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-800 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    hóa đơn / trang (Đang xem {(currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(currentPage * pageSize, filteredInvoices.length)} trên tổng {filteredInvoices.length} đơn)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 font-bold text-gray-800">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 6. MODAL CHI TIẾT HÓA ĐƠN */}
      {selectedPaymentId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedPaymentId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2.5">
                <Receipt size={20} className="text-rose-400" />
                <h3 className="font-bold text-base">
                  Chi tiết Hóa đơn Thanh toán
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Printer size={15} />
                  <span>In hóa đơn</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentId(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isLoadingDetail ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="animate-spin text-rose-500 w-8 h-8" />
                  <span className="text-xs font-medium">Đang tải chi tiết hóa đơn...</span>
                </div>
              ) : !invoiceDetail ? (
                <div className="py-12 text-center text-red-500 font-bold text-sm">
                  Không tìm thấy dữ liệu chi tiết của hóa đơn này.
                </div>
              ) : (
                <>
                  {/* Restaurant & Branch Header */}
                  <div className="text-center border-b border-dashed border-gray-200 pb-5">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold mb-2">
                      <CheckCircle2 size={14} />
                      <span>ĐÃ HOÀN TẤT THANH TOÁN</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      HÓA ĐƠN THANH TOÁN
                    </h2>
                    <p className="text-sm font-bold text-gray-700 mt-1">{invoiceDetail.BranchName}</p>
                    {invoiceDetail.BranchAddress && (
                      <p className="text-xs text-gray-500 mt-0.5">{invoiceDetail.BranchAddress}</p>
                    )}
                    {invoiceDetail.BranchPhone && (
                      <p className="text-xs text-gray-500">SĐT: {invoiceDetail.BranchPhone}</p>
                    )}
                  </div>

                  {/* Invoice Meta Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Mã hóa đơn:</span>
                      <span className="font-mono font-bold text-gray-900 text-sm">{invoiceDetail.InvoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Khu vực / Bàn:</span>
                      <span className="font-bold text-gray-900">
                        {invoiceDetail.AreaName} — {invoiceDetail.TableName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Số lượng khách:</span>
                      <span className="font-bold text-gray-900">
                        {invoiceDetail.GuestCount ? `${invoiceDetail.GuestCount} khách` : 'Khách tại bàn'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Giờ vào bàn:</span>
                      <span className="font-semibold text-gray-700">
                        {invoiceDetail.SessionStartTime
                          ? format(new Date(invoiceDetail.SessionStartTime), 'dd/MM/yyyy HH:mm')
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Giờ thanh toán:</span>
                      <span className="font-bold text-gray-900">
                        {invoiceDetail.InvoiceDate
                          ? format(new Date(invoiceDetail.InvoiceDate), 'dd/MM/yyyy HH:mm')
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Phương thức TT:</span>
                      <span className="font-bold text-emerald-700">
                        {PAYMENT_METHOD_MAP[invoiceDetail.PaymentMethod]?.label || invoiceDetail.PaymentMethod}
                      </span>
                      {invoiceDetail.TransactionNo && (
                        <span className="block text-[10px] font-mono text-gray-400">
                          Mã GD: {invoiceDetail.TransactionNo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ordered Items Table */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2.5">
                      Chi tiết các món đã gọi ({invoiceDetail.lines?.length || 0} dòng món)
                    </h4>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-3">Tên món ăn</th>
                            <th className="py-2.5 px-3 text-center w-16">ĐVT</th>
                            <th className="py-2.5 px-3 text-center w-16">SL</th>
                            <th className="py-2.5 px-3 text-right w-28">Đơn giá</th>
                            <th className="py-2.5 px-3 text-right w-28">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(invoiceDetail.lines || []).map((line, idx) => (
                            <tr key={line.InvoiceLineID || line.OrderLineID || idx} className="hover:bg-gray-50/60">
                              <td className="py-2.5 px-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-gray-800">{line.MenuItemName}</p>
                                {line.Note && (
                                  <p className="text-[11px] text-gray-400 italic">Ghi chú: {line.Note}</p>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-500">{line.Unit || 'Phần'}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                                {Number(line.Quantity)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-600 whitespace-nowrap">
                                {formatCurrency(line.UnitPrice)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                                {formatCurrency(line.Amount || Number(line.Quantity) * Number(line.UnitPrice))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Breakdown Summary */}
                  <div className="bg-gray-50/80 p-5 rounded-xl border border-gray-200/80 space-y-2.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Tạm tính (Tiền món ăn)</span>
                      <span className="font-bold text-gray-900">{formatCurrency(invoiceDetail.SubTotal)}</span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>
                        Thuế GTGT (VAT {invoiceDetail.VATRate ? `${Number(invoiceDetail.VATRate)}%` : ''})
                      </span>
                      <span className="font-medium text-gray-800">+{formatCurrency(invoiceDetail.VATAmount)}</span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>
                        Phí phục vụ ({invoiceDetail.ServiceFeeRate ? `${Number(invoiceDetail.ServiceFeeRate)}%` : '0%'})
                      </span>
                      <span className="font-medium text-gray-800">+{formatCurrency(invoiceDetail.ServiceFeeAmount)}</span>
                    </div>

                    <div className="flex justify-between text-rose-600">
                      <span className="flex items-center gap-1.5">
                        <Tag size={14} />
                        <span>
                          Khuyến mãi / Giảm giá
                          {invoiceDetail.PromotionName ? ` (${invoiceDetail.PromotionName})` : ''}
                        </span>
                      </span>
                      <span className="font-bold">-{formatCurrency(invoiceDetail.DiscountAmount)}</span>
                    </div>

                    <div className="pt-3 border-t-2 border-dashed border-gray-300 flex items-center justify-between">
                      <div>
                        <span className="font-black text-gray-900 text-base block">TỔNG THANH TOÁN</span>
                        <span className="text-xs text-gray-500">Đã thu đủ qua {PAYMENT_METHOD_MAP[invoiceDetail.PaymentMethod]?.label || invoiceDetail.PaymentMethod}</span>
                      </div>
                      <span className="text-2xl font-black text-rose-600">
                        {formatCurrency(invoiceDetail.TotalAmount)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 shrink-0 print:hidden">
              <button
                onClick={() => setSelectedPaymentId(null)}
                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
