import { create } from 'zustand';
import type { User, AuthResponse } from '@/types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: (user: User, accessToken: string) => {
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },

  setUser: (user: User) => {
    set({ user });
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  initAuth: async () => {
    try {
      set({ isLoading: true });
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      // Attempt to silently refresh token using the HTTP-only refresh cookie
      const res = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Includes HTTP-only cookies
      });

      if (!res.ok) {
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const data: AuthResponse = await res.json();
      if (data.success && data.accessToken && data.user) {
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err) {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
