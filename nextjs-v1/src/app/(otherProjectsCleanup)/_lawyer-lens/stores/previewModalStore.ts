import { create } from 'zustand';
import { FileUploadedData } from '@sraz-sw/copyfact-shared';

interface PreviewModalState {
  isOpen: boolean;
  file: FileUploadedData | null;
  activeTab: string;
  
  // Actions
  open: (file: FileUploadedData) => void;
  close: () => void;
  setActiveTab: (tab: string) => void;
}

export const usePreviewModalStore = create<PreviewModalState>((set) => ({
  isOpen: false,
  file: null,
  activeTab: 'info',
  
  // Open the modal with a file
  open: (file: FileUploadedData) => set({ 
    isOpen: true, 
    file,
    // Reset to the info tab when opening a new file
    activeTab: 'info'
  }),
  
  // Close the modal
  close: () => set({ 
    isOpen: false,
    // Keep the file data in the store for smooth transitions
    // Will be replaced on next open
  }),
  
  // Switch between tabs
  setActiveTab: (tab: string) => set({ activeTab: tab }),
}));
