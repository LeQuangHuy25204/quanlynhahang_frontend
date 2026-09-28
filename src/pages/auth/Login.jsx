import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('waiter1'); // default for testing
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex bg-bg-page relative overflow-hidden">
      {/* Decorative Circles for Mobile/Tablet */}
      <div className="lg:hidden absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-primary/20 rounded-full blur-3xl"></div>
      <div className="lg:hidden absolute bottom-[-100px] left-[-50px] w-[200px] h-[200px] bg-primary/20 rounded-full blur-2xl"></div>

      {/* Left Panel (Desktop only) */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-black/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white text-primary rounded-xl flex items-center justify-center font-bold text-xl">
              B
            </div>
            <span className="font-extrabold text-2xl tracking-tight">BBQ KLTN</span>
          </div>
        </div>

        <div className="relative z-10 mb-20">
          <h1 className="text-[42px] font-extrabold leading-[1.15] mb-6">
            Hệ thống quản lý<br/>nhà hàng & gọi món QR
          </h1>
          <p className="text-[16px] text-white/80 max-w-[400px] leading-relaxed font-medium">
            Quản lý bàn, chế biến, thực đơn, khuyến mãi và báo cáo doanh thu — tất cả trong một.
          </p>
        </div>
        
        <div className="relative z-10 text-[13px] text-white/60 font-medium">
          © 2026 BBQ KLTN. All rights reserved.
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 lg:p-12 shadow-2xl lg:shadow-none border border-border/50 lg:border-none">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-xl">
              B
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-text-primary">BBQ KLTN</span>
          </div>

          <div className="mb-10">
            <h2 className="text-[32px] font-extrabold text-text-primary tracking-tight">Đăng nhập</h2>
            <p className="text-text-secondary mt-2 text-[15px]">Đăng nhập vào hệ thống quản lý nhà hàng</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-[14px] font-bold text-text-primary">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 bg-bg-page border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
                placeholder="Nhập tên đăng nhập..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[14px] font-bold text-text-primary">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 pr-12 bg-bg-page border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
                  placeholder="Nhập mật khẩu..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-[13px] font-bold text-primary hover:text-primary-hover transition-colors">
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 mt-4 flex items-center justify-center text-[16px]"
            >
              {isLoading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : 'Đăng nhập'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-[13px] font-medium text-text-tertiary">Demo accounts (pw: 123456):</p>
            <p className="text-[13px] font-bold text-text-secondary mt-1">admin1, manager1, cashier1, waiter1</p>
          </div>
        </div>
      </div>
    </div>
  );
}
