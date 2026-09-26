import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Role } from "@/lib/types";

interface AppState {
  mode: Role;
  setMode: (mode: Role) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: "seeker",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "spare-app",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ mode: s.mode }),
    }
  )
);
