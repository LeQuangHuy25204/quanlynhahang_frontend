import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Grid, Droplet, List, Tag, BarChart2, MapPin, Users, Settings, 
  LogOut, ChevronDown, Check, Building2, Store 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { toast } from 'sonner';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff, logout, setBranchId } = useAuthStore();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = staff?.roleCode;
  const isRestaurantAdmin = role === 'RestaurantAdmin';

  // Fetch branches list
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get('/branches').then(res => res.data),
  });
  const branches = branchesData || [];

  const currentBranch = branches.find(b => b.BranchID === staff?.branchId) || {
    BranchID: staff?.branchId || 1,
    Name: `Chi nhánh ${staff?.branchId || 1}`,
  };

  const handleSelectBranch = (b) => {
    if (staff?.branchId === b.BranchID) {
      setDropdownOpen(false);
      return;
    }
    setBranchId(b.BranchID);
    queryClient.invalidateQueries();
    toast.success(`Đã chuyển sang ${b.Name}`);
    setDropdownOpen(false);
  };
  
  const navItems = [
    { path: '/staff/tables', icon: <Grid size={18} />, label: 'Sơ đồ bàn', roles: ['Waiter', 'Cashier', 'BranchManager', 'RestaurantAdmin'] },
    { path: '/staff/orders', icon: <Droplet size={18} />, label: 'Gọi món & Chế biến', roles: ['Waiter', 'BranchManager', 'RestaurantAdmin'] },
    { path: '/cashier', icon: <Grid size={18} />, label: 'Thu ngân', roles: ['Cashier', 'BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/tables', icon: <Grid size={18} />, label: 'Quản lý bàn & QR', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/menu', icon: <List size={18} />, label: 'Thực đơn', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/promotions', icon: <Tag size={18} />, label: 'Khuyến mãi', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin', icon: <BarChart2 size={18} />, label: 'Báo cáo', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/branches', icon: <MapPin size={18} />, label: 'Chi nhánh', roles: ['RestaurantAdmin'] },
    { path: '/admin/staff', icon: <Users size={18} />, label: 'Nhân viên', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/config', icon: <Settings size={18} />, label: 'Cấu hình CN', roles: ['BranchManager', 'RestaurantAdmin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className={`bg-white border-r border-gray-200 w-[240px] flex-shrink-0 flex flex-col justify-between fixed md:relative h-[calc(100vh-65px)] md:h-screen z-20 transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div>
        {/* Brand Header with Interactive Branch Dropdown */}
        <div ref={dropdownRef} className="relative border-b border-gray-100">
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors select-none"
            title={isRestaurantAdmin ? "Bấm để đổi chi nhánh làm việc" : currentBranch.Name}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                B
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-[14px] text-text-primary leading-tight truncate">BBQ KLTN</h1>
                <p className="text-[11px] text-primary font-bold mt-0.5 truncate flex items-center gap-1">
                  <Store size={12} className="shrink-0" />
                  {currentBranch.Name}
                </p>
              </div>
            </div>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform duration-200 shrink-0 ml-1 ${dropdownOpen ? 'rotate-180 text-primary' : ''}`} 
            />
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-3 right-3 top-[calc(100%+4px)] bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in duration-150">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Chọn chi nhánh làm việc
              </div>
              
              <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                {branches.length === 0 ? (
                  <div className="p-3 text-xs text-gray-400 text-center">Đang tải chi nhánh...</div>
                ) : (
                  branches.map((b) => {
                    const isSelected = staff?.branchId === b.BranchID;

                    return (
                      <button
                        key={b.BranchID}
                        onClick={() => handleSelectBranch(b)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-primary-subtle text-primary font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-[13px]">{b.Name}</p>
                          <p className="text-[10px] text-gray-400 font-normal truncate mt-0.5">
                            {b.Address || `Mã CN: #${b.BranchID}`}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                            <Check size={12} />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {isRestaurantAdmin && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <Link
                    to="/admin/branches"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary-hover px-2 py-1 rounded-lg hover:bg-primary-subtle/50 transition-colors"
                  >
                    <Settings size={12} /> Quản lý danh sách chi nhánh
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Nav Items */}
        <nav className="px-3 py-3 space-y-1">
          {filteredNav.map(item => {
            const isActive = location.pathname === item.path || (item.path === '/admin' && location.pathname.startsWith('/admin') && item.path.length === 6 && location.pathname.length === 6);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors relative ${
                  isActive 
                    ? 'bg-primary-subtle text-primary' 
                    : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary'
                }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-md"></div>}
                <div className={`${isActive ? 'text-primary' : 'text-text-tertiary'}`}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Footer / User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" onClick={handleLogout}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-text-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
              {staff?.fullName ? staff.fullName.charAt(0).toUpperCase() : 'QL'}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-text-primary leading-tight truncate">
                {staff?.fullName || 'Quản lý'}
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5 truncate">
                {staff?.roleCode === 'RestaurantAdmin' ? 'Quản trị nhà hàng' : (staff?.roleCode === 'BranchManager' ? 'Quản lý chi nhánh' : staff?.roleCode)}
              </p>
            </div>
          </div>
          <LogOut size={16} className="text-text-tertiary hover:text-danger shrink-0 ml-1" />
        </div>
      </div>
    </aside>
  );
}
