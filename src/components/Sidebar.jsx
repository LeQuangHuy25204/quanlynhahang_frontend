import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Grid, Droplet, List, Tag, BarChart2, MapPin, Users, Settings, LogOut, ChevronDown 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { staff, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = staff?.roleCode;
  
  const navItems = [
    { path: '/staff/tables', icon: <Grid size={18} />, label: 'Sơ đồ bàn', roles: ['Waiter', 'Cashier', 'BranchManager', 'RestaurantAdmin'] },
    { path: '/staff/orders', icon: <Droplet size={18} />, label: 'Gọi món & Chế biến', roles: ['Waiter', 'BranchManager', 'RestaurantAdmin'] },
    { path: '/cashier', icon: <Grid size={18} />, label: 'Thu ngân', roles: ['Cashier', 'BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/menu', icon: <List size={18} />, label: 'Thực đơn', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/promotions', icon: <Tag size={18} />, label: 'Khuyến mãi', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin', icon: <BarChart2 size={18} />, label: 'Báo cáo', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/branches', icon: <MapPin size={18} />, label: 'Chi nhánh', roles: ['RestaurantAdmin'] },
    { path: '/admin/staff', icon: <Users size={18} />, label: 'Nhân viên', roles: ['BranchManager', 'RestaurantAdmin'] },
    { path: '/admin/config', icon: <Settings size={18} />, label: 'Cấu hình', roles: ['BranchManager', 'RestaurantAdmin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className={`bg-white border-r border-gray-200 w-[240px] flex-shrink-0 flex flex-col justify-between fixed md:relative h-[calc(100vh-65px)] md:h-screen z-10 transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg">
              B
            </div>
            <div>
              <h1 className="font-bold text-[15px] text-text-primary leading-tight">BBQ KLTN</h1>
              <p className="text-[11px] text-text-tertiary font-medium mt-0.5">Chi nhánh {staff?.branchId || 'Quận 1'}</p>
            </div>
          </div>
          <ChevronDown size={16} className="text-text-tertiary" />
        </div>
        
        {/* Nav Items */}
        <nav className="px-3 py-2 space-y-1">
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-text-primary text-white flex items-center justify-center font-bold text-xs">
              {staff?.fullName ? staff.fullName.charAt(0).toUpperCase() + 'L' : 'QL'}
            </div>
            <div>
              <p className="text-[13px] font-bold text-text-primary leading-tight">
                {staff?.fullName || 'Quản lý'}
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                {staff?.roleCode === 'RestaurantAdmin' ? 'Quản trị nhà hàng' : (staff?.roleCode === 'BranchManager' ? 'Quản lý chi nhánh' : staff?.roleCode)}
              </p>
            </div>
          </div>
          <LogOut size={16} className="text-text-tertiary hover:text-danger" />
        </div>
      </div>
    </aside>
  );
}
