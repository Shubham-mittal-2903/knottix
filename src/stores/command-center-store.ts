import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CommandIntent } from '@/lib/command-center/types';

export interface CommandHistoryEntry {
  id: string;
  text: string;
  intent: CommandIntent;
  timestamp: number;
}

const MAX_RECENT = 8;
const MAX_FAVORITES = 8;

interface CommandCenterState {
  recent: CommandHistoryEntry[];
  favorites: CommandHistoryEntry[];
  addRecent: (entry: Omit<CommandHistoryEntry, 'id' | 'timestamp'>) => void;
  toggleFavorite: (entry: Omit<CommandHistoryEntry, 'id' | 'timestamp'>) => void;
  isFavorite: (text: string) => boolean;
}

export const useCommandCenterStore = create<CommandCenterState>()(
  persist(
    (set, get) => ({
      recent: [],
      favorites: [],
      addRecent: (entry) =>
        set((state) => {
          const filtered = state.recent.filter((r) => r.text.toLowerCase() !== entry.text.toLowerCase());
          const next: CommandHistoryEntry = { ...entry, id: `${Date.now()}`, timestamp: Date.now() };
          return { recent: [next, ...filtered].slice(0, MAX_RECENT) };
        }),
      toggleFavorite: (entry) =>
        set((state) => {
          const exists = state.favorites.some((f) => f.text.toLowerCase() === entry.text.toLowerCase());
          if (exists) {
            return { favorites: state.favorites.filter((f) => f.text.toLowerCase() !== entry.text.toLowerCase()) };
          }
          const next: CommandHistoryEntry = { ...entry, id: `${Date.now()}`, timestamp: Date.now() };
          return { favorites: [next, ...state.favorites].slice(0, MAX_FAVORITES) };
        }),
      isFavorite: (text) => get().favorites.some((f) => f.text.toLowerCase() === text.toLowerCase()),
    }),
    { name: 'knottix-command-center' },
  ),
);
