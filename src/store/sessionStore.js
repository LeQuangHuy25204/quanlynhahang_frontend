import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSessionStore = create(
  persist(
    (set) => ({
      sessionToken: null,
      sessionId: null,
      participantId: null,
      guestName: null,
      branchId: null,
      table: null,
      joinCode: null,
      status: null, // 0: WAITING, 1: OPEN, 2: CLOSED
      setSession: (data) => set((state) => ({ ...state, ...data })),
      clearSession: () => set({
        sessionToken: null,
        sessionId: null,
        participantId: null,
        guestName: null,
        branchId: null,
        table: null,
        joinCode: null,
        status: null,
      }),
    }),
    {
      name: 'customer-session',
    }
  )
);
