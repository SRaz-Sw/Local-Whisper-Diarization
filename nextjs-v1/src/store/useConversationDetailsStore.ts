import { create } from 'zustand';
import { ConversationData } from '@sraz-sw/fullstack-shared';

interface ConversationDetailsStore {
  isOpen: boolean;
  currentConversation: ConversationData | null;
  open: (conversation: ConversationData) => void;
  close: () => void;
  setCurrentConversation: (conversation: ConversationData) => void;
}

export const useConversationDetailsStore = create<ConversationDetailsStore>((set) => ({
  isOpen: false,
  currentConversation: null,
  open: (conversation) => {
    console.log('Opening conversation details store with:', conversation);
    set({ isOpen: true, currentConversation: conversation });
  },
  close: () => set({ isOpen: false }),
  setCurrentConversation: (conversation) => {
    console.log('Updating current conversation in details store:', conversation);
    set({ currentConversation: conversation });
  }
})); 