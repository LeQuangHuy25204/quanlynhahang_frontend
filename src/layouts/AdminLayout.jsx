import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, Users, UtensilsCrossed, Grid, 
  Tag, PieChart, LogOut, Coffee, Menu as MenuIcon 
} from 'lucide-react';

export default function AdminLayout() {
  const { staff, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/admin/tables', icon: <Grid size={20} />, label: 'Khu vực & Bàn' },
    { path: '/admin/menu', icon: <UtensilsCrossed size={20} />, label: 'Thực đơn' },
    { path: '/admin/staff', icon: <Users size={20} />, label: 'Nhân viên' },
    { path: '/staff/tables', icon: <Coffee size={20} />, label: 'Xem phục vụ' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center z-20">
        <h1 className="font-bold text-xl text-primary">BBQ KLTN</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-gray-100 rounded-lg">
          <MenuIcon size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`bg-white border-r border-gray-200 w-64 flex-shrink-0 flex flex-col justify-between fixed md:relative h-[calc(100vh-65px)] md:h-screen z-10 transition-transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div>
          <div className="p-6 hidden md:block">
            <h1 className="font-bold text-2xl text-primary tracking-tight">BBQ KLTN</h1>
            <p className="text-xs text-gray-500 font-medium mt-1">Admin Portal • CN {staff?.branchId}</p>
          </div>
          
          <nav className="px-4 py-2 space-y-1">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                    active ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 p-4 rounded-xl mb-4">
            <p className="text-sm font-bold text-gray-800 leading-tight">{staff?.fullName}</p>
            <p className="text-xs text-gray-500 mt-1">{staff?.roleCode}</p>
          </div>
          <button onClick={handleLogout} className="flex justify-center items-center gap-2 text-red-500 hover:bg-red-50 w-full p-3 rounded-xl font-bold transition-colors">
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
      
      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 z-0 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}
    </div>
  );
}
