import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Layouts
import CustomerLayout from '../layouts/CustomerLayout';
import StaffLayout from '../layouts/StaffLayout';
import AdminLayout from '../layouts/AdminLayout';

// Auth Pages
import Login from '../pages/auth/Login';

// Customer Pages
import QRScan from '../pages/customer/QRScan';
import JoinSession from '../pages/customer/JoinSession';
import Menu from '../pages/customer/Menu';
import Cart from '../pages/customer/Cart';
import OrderTracking from '../pages/customer/OrderTracking';
import PaymentWaiting from '../pages/customer/PaymentWaiting';

// Staff Pages (Waiter)
import TableBoard from '../pages/waiter/TableBoard';
import OrderBoard from '../pages/waiter/OrderBoard';

// Cashier Pages
import CashierBoard from '../pages/cashier/CashierBoard';
import Checkout from '../pages/cashier/Checkout';
import Invoice from '../pages/cashier/Invoice';

// Admin Pages
import Dashboard from '../pages/admin/Dashboard';
import TableManager from '../pages/admin/TableManager';
import MenuManager from '../pages/admin/MenuManager';
import StaffManager from '../pages/admin/StaffManager';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, staff } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(staff?.roleCode)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer/qr" />} />
      <Route path="/login" element={<Login />} />

      {/* Customer Routes */}
      <Route path="/customer" element={<CustomerLayout />}>
        <Route path="qr" element={<QRScan />} />
        <Route path="join" element={<JoinSession />} />
        <Route path="menu" element={<Menu />} />
        <Route path="cart" element={<Cart />} />
        <Route path="tracking" element={<OrderTracking />} />
        <Route path="payment-waiting" element={<PaymentWaiting />} />
      </Route>

      {/* Waiter Routes */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['Waiter', 'BranchManager', 'RestaurantAdmin']}>
          <StaffLayout />
        </ProtectedRoute>
      }>
        <Route path="tables" element={<TableBoard />} />
        <Route path="orders" element={<OrderBoard />} />
      </Route>

      {/* Cashier Routes */}
      <Route path="/cashier" element={
        <ProtectedRoute allowedRoles={['Cashier', 'BranchManager', 'RestaurantAdmin']}>
          <StaffLayout />
        </ProtectedRoute>
      }>
        <Route index element={<CashierBoard />} />
        <Route path="checkout/:orderId" element={<Checkout />} />
        <Route path="invoice/:paymentId" element={<Invoice />} />
      </Route>

      {/* Admin / Manager Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['BranchManager', 'RestaurantAdmin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="tables" element={<TableManager />} />
        <Route path="menu" element={<MenuManager />} />
        <Route path="staff" element={<StaffManager />} />
      </Route>
      
      <Route path="/unauthorized" element={<div className="p-10 text-center">Unauthorized Access</div>} />
      <Route path="*" element={<div className="p-10 text-center">404 Not Found</div>} />
    </Routes>
  );
}
