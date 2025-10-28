import { create } from "zustand";

interface GlobalPlayerState {
  activePlayerId: string | null;
  setActivePlayer: (id: string) => void;
  clearActivePlayer: () => void;
}

/**
 * Global audio player coordination store.
 * Ensures only one audio player plays at a time across the application.
 */
export const useGlobalPlayerStore = create<GlobalPlayerState>((set) => ({
  activePlayerId: null,
  setActivePlayer: (id) => set({ activePlayerId: id }),
  clearActivePlayer: () => set({ activePlayerId: null }),
}));
