import { create } from "zustand";

interface MainAppStateStore {
  // View and navigation state
  activeView: string; // 'overview' | 'profile' | carId
  showAIResearch: boolean;

  // Loading and data state
  isLoadingCars: boolean;
  lastLoadTime: number;

  // Actions
  setActiveView: (view: string) => void;
  setShowAIResearch: (show: boolean) => void;
  setIsLoadingCars: (loading: boolean) => void;
  setLastLoadTime: (time: number) => void;
}

export const useMainAppStateStore = create<MainAppStateStore>(
  (set, get) => ({
    // Initial state
    activeView: "overview",
    showAIResearch: false,
    isLoadingCars: true,
    lastLoadTime: 0,

    // Basic setters
    setActiveView: (view) => set({ activeView: view }),
    setShowAIResearch: (show) => set({ showAIResearch: show }),
    setIsLoadingCars: (loading) => set({ isLoadingCars: loading }),
    setLastLoadTime: (time) => set({ lastLoadTime: time }),
  }),
);
