import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
      requiresJoinCode: false,
      participantCount: 0,
      hostName: null,
      isHost: false,
      participants: [],
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
        requiresJoinCode: false,
        participantCount: 0,
        hostName: null,
        isHost: false,
        participants: [],
      }),
    }),
    {
      name: 'customer-session',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
