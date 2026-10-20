import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppRoutes from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-2xl mb-4">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Đã xảy ra lỗi giao diện</h2>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            {this.state.error?.message || 'Có sự cố hiển thị component. Vui lòng tải lại hoặc quay về trang chủ.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover shadow-sm"
            >
              Tải lại trang
            </button>
            <button
              onClick={() => {
                window.location.href = '/login';
              }}
              className="px-5 py-2.5 bg-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-300"
            >
              Về trang đăng nhập
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
