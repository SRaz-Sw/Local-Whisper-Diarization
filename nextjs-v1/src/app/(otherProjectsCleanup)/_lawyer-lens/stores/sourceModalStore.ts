import { create } from 'zustand';

interface SourceModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

// Create a store for managing the source modal state
export const useSourceModalStore = create<SourceModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
})); 