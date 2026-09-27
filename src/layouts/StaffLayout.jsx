import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, LogOut, Coffee, ChefHat, Receipt } from 'lucide-react';

export default function StaffLayout() {
  const { staff, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isCashier = staff?.roleCode === 'Cashier' || staff?.roleCode === 'BranchManager' || staff?.roleCode === 'RestaurantAdmin';
  const isWaiter = staff?.roleCode === 'Waiter' || staff?.roleCode === 'BranchManager' || staff?.roleCode === 'RestaurantAdmin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop / Top nav for Mobile */}
      <aside className="bg-white border-b md:border-r border-gray-200 w-full md:w-64 flex-shrink-0 flex md:flex-col justify-between">
        <div className="flex md:flex-col items-center md:items-stretch overflow-x-auto p-2 md:p-4 gap-2">
          <div className="hidden md:block mb-6 px-4 py-2">
            <h1 className="font-bold text-xl text-primary">BBQ KLTN</h1>
            <p className="text-xs text-gray-500 font-medium">Chi nhánh {staff?.branchId}</p>
          </div>
          
          {isWaiter && (
            <>
              <NavItem icon={<Coffee />} label="Bàn" active={location.pathname === '/staff/tables'} onClick={() => navigate('/staff/tables')} />
              <NavItem icon={<ChefHat />} label="Đơn món" active={location.pathname === '/staff/orders'} onClick={() => navigate('/staff/orders')} />
            </>
          )}
          {isCashier && (
            <NavItem icon={<Receipt />} label="Thu ngân" active={location.pathname.startsWith('/cashier')} onClick={() => navigate('/cashier')} />
          )}
          {(staff?.roleCode === 'BranchManager' || staff?.roleCode === 'RestaurantAdmin') && (
            <NavItem icon={<LayoutDashboard />} label="Quản lý" active={false} onClick={() => navigate('/admin')} />
          )}
        </div>
        
        <div className="p-4 hidden md:block border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
              {staff?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">{staff?.fullName}</p>
              <p className="text-xs text-gray-500">{staff?.roleCode}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:bg-red-50 w-full p-2 rounded-lg text-sm font-medium transition-colors">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        <Outlet />
      </main>
      
      {/* Mobile Logout Button */}
      <button 
        onClick={handleLogout}
        className="md:hidden fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 md:w-full md:justify-start ${
      active ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {React.cloneElement(icon, { size: 18 })}
    <span className="hidden md:inline">{label}</span>
    <span className="md:hidden">{label}</span>
  </button>
);
