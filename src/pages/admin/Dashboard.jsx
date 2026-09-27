import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { DollarSign, Receipt, TrendingUp, ShoppingBag, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboardSummary', startDate, endDate],
    queryFn: () => apiClient.get(`/reports/dashboard-summary?startDate=${startDate}&endDate=${endDate}`).then(res => res.data),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['branchRevenue', startDate, endDate],
    queryFn: () => apiClient.get(`/reports/branch-revenue?startDate=${startDate}&endDate=${endDate}`).then(res => res.data),
  });

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

  const chartData = revenueData?.revenue?.map(d => ({
    date: format(new Date(d.Date), 'dd/MM'),
    revenue: Number(d.TotalRevenue)
  })).reverse() || [];

  const StatCard = ({ title, value, icon, subtitle }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-gray-500 font-medium text-sm mb-1">{title}</h3>
        <p className="text-2xl font-black text-gray-800 tracking-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Tổng quan</h1>
        <p className="text-gray-500 mt-2">Dữ liệu 30 ngày qua ({format(new Date(startDate), 'dd/MM')} - {format(new Date(endDate), 'dd/MM')})</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Tổng doanh thu" 
          value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary?.totalRevenue || 0)} 
          icon={<DollarSign size={24} />} 
          subtitle="Đã trừ khuyến mãi"
        />
        <StatCard 
          title="Tổng đơn hàng" 
          value={new Intl.NumberFormat('vi-VN').format(summary?.totalInvoices || 0)} 
          icon={<Receipt size={24} />} 
          subtitle="Đơn đã thanh toán"
        />
        <StatCard 
          title="Giá trị đơn TB" 
          value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary?.avgOrderValue || 0)} 
          icon={<TrendingUp size={24} />} 
          subtitle="Doanh thu / số đơn"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg text-gray-800 mb-6">Biểu đồ doanh thu</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8f8f8' }}
                  formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                  labelStyle={{ fontWeight: 'bold', color: '#333' }}
                />
                <Bar dataKey="revenue" fill="#E5482D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg text-gray-800 mb-6">Top món ăn</h3>
          <div className="space-y-4">
            {revenueData?.topItems?.slice(0, 5).map((item, index) => (
              <div key={item.MenuItemID} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-100 text-gray-500' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{item.MenuItemName}</p>
                  <p className="text-xs text-gray-500">{Number(item.TotalQuantity)} {item.Unit} đã bán</p>
                </div>
                <div className="font-bold text-sm text-gray-700">
                  {new Intl.NumberFormat('vi-VN').format(Number(item.TotalRevenue) / 1000)}k
                </div>
              </div>
            ))}
            
            {(!revenueData?.topItems || revenueData.topItems.length === 0) && (
              <p className="text-center text-gray-400 py-10">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
