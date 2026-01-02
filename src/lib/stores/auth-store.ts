import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  privyId: string;
  walletAddress?: string;
  name?: string;
  email?: string;
  profileImage?: string;
  createdAt?: Date;
  lastLoginAt?: Date;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (status: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user }),
      setAuthenticated: (status) => set({ isAuthenticated: status }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'stratifi-auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
