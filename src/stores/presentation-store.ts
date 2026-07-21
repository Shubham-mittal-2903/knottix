import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PresentationState {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
}

export const usePresentationStore = create<PresentationState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: 'knottix-presentation-mode' },
  ),
);
