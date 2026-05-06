import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  role: string | null;
  setToken: (t: string) => void;
  setRole: (r: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      setToken: (token) => set({ token }),
      setRole: (role) => set({ role }),
      logout: () => set({ token: null, role: null }),
    }),
    { name: "admin-auth" }
  )
);
