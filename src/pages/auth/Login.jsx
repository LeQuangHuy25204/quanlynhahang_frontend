import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('waiter1'); // default for testing
  const [password, setPassword] = useState('123456');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      const { token, staff } = res.data;
      
      login(token, staff);
      
      if (staff.roleCode === 'Waiter') navigate('/staff/tables');
      else if (staff.roleCode === 'Cashier') navigate('/cashier');
      else if (staff.roleCode === 'BranchManager' || staff.roleCode === 'RestaurantAdmin') navigate('/admin');
      
      toast.success('Đăng nhập thành công');
    } catch (err) {
      toast.error(err.message || 'Sai tài khoản hoặc mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Đăng nhập nội bộ</h2>
          <p className="text-gray-500 mt-2">Hệ thống quản lý BBQ KLTN</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="Nhập mật khẩu"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
          >
            {isLoading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : 'ĐĂNG NHẬP'}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-400 text-center">
          <p>Demo accounts (pw: 123456):</p>
          <p>admin1, manager1, cashier1, waiter1</p>
        </div>
      </div>
    </div>
  );
}
