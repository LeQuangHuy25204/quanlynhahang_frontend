import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Menu as MenuIcon } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function AdminLayout() {
  const { staff, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };



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
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

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
