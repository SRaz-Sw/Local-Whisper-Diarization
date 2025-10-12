import { create } from 'zustand';
import { UserData } from '@sraz-sw/fullstack-shared';

interface NewChatStore {
  isOpen: boolean;
  isGroupMode: boolean;
  users: UserData[];
  filteredUsers: UserData[];
  searchQuery: string;
  isLoading: boolean;
  open: () => void;
  openGroupMode: () => void;
  close: () => void;
  setUsers: (users: UserData[]) => void;
  setFilteredUsers: (users: UserData[]) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  filterUsers: () => void;
}

export const useNewChatStore = create<NewChatStore>((set, get) => ({
  isOpen: false,
  isGroupMode: false,
  users: [],
  filteredUsers: [],
  searchQuery: '',
  isLoading: false,
  open: () => set({ isOpen: true, isGroupMode: false }),
  openGroupMode: () => set({ isOpen: true, isGroupMode: true }),
  close: () => set({ isOpen: false, isGroupMode: false, searchQuery: '', filteredUsers: get().users }),
  setUsers: (users) => set({ users, filteredUsers: users }),
  setFilteredUsers: (filteredUsers) => set({ filteredUsers }),
  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    get().filterUsers();
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  filterUsers: () => {
    const { users, searchQuery } = get();
    if (!searchQuery.trim()) {
      set({ filteredUsers: users });
      return;
    }
    
    const filtered = users.filter((user) => 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    set({ filteredUsers: filtered });
  }
})); 