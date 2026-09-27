import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      staff: null,
      isAuthenticated: false,
      login: (token, staff) => set({ token, staff, isAuthenticated: true }),
      logout: () => set({ token: null, staff: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
