'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNewChatStore } from '@/store/useNewChatStore';
import { useCurrentUser } from '@/hooks/useAuth';
import { useConversations, useCreateConversation } from '@/hooks/useConversations';
import { UserData } from '@sraz-sw/fullstack-shared';
import apiService from '@/lib/api';

// UI Components
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X, Search, UserPlus, Users, Check, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function NewChatDialog() {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const { data: conversations } = useConversations();
  const { mutate: createConversation, isPending: isCreating } = useCreateConversation();
  
  const { 
    isOpen, 
    isGroupMode,
    close, 
    open,
    openGroupMode,
    searchQuery, 
    setSearchQuery, 
    users, 
    filteredUsers, 
    setUsers, 
    setIsLoading, 
    isLoading 
  } = useNewChatStore();
  
  // Local state for selected users (used in group mode)
  const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);
  const [groupName, setGroupName] = useState<string>('');

  // Fetch all users when dialog opens
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const allUsers = await apiService.getUsers();
        
        // Filter out current user in all cases
        let availableUsers = allUsers.filter(user => user.id !== currentUser.id);
        
        // For individual chats, also filter out users with existing 1-on-1 conversations
        if (!isGroupMode && conversations) {
          const existingContactIds = new Set<string>();
          
          conversations.forEach(conversation => {
            if (!conversation.isGroup && conversation.users) {
              conversation.users.forEach(user => {
                if (user.id !== currentUser.id) {
                  existingContactIds.add(user.id);
                }
              });
            }
          });
          
          availableUsers = availableUsers.filter(user => !existingContactIds.has(user.id));
        }
        
        setUsers(availableUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
    // Clear selection when mode changes
    setSelectedUsers([]);
    setGroupName('');
  }, [isOpen, isGroupMode, currentUser, conversations, setUsers, setIsLoading]);

  const handleStartIndividualChat = async (user: UserData) => {
    try {
      if (!currentUser) return;
      
      // Format request according to API expectations
      // Create conversation name in "currentUser - otherUser" format
      const conversationName = `${currentUser.name} - ${user.name}`;
      
      const conversationData = {
        userIds: [user.id],
        isGroup: false,
        name: conversationName // Format name as requested
      };
      
      createConversation(conversationData, {
        onSuccess: (response) => {
          router.push(`/conversations/${response.id}`);
          close();
        }
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };
  
  const handleCreateGroup = async () => {
    try {
      if (!currentUser || selectedUsers.length === 0) return;
      
      const userIds = selectedUsers.map(user => user.id);
      
      // Generate default group name if not provided
      const finalGroupName = groupName.trim() || 
        `Group with ${selectedUsers.map(u => u.name).join(', ').substring(0, 30)}...`;
      
      // Format request according to API expectations
      const conversationData = {
        userIds,
        isGroup: true,
        name: finalGroupName
      };
      
      createConversation(conversationData, {
        onSuccess: (response) => {
          router.push(`/conversations/${response.id}`);
          close();
        }
      });
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };
  
  const toggleUserSelection = (user: UserData) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };
  
  const isUserSelected = (userId: string) => {
    return selectedUsers.some(user => user.id === userId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent 
        className="w-[95%] max-w-full sm:max-w-[95%] md:max-w-lg p-0 bg-accent overflow-hidden max-h-[90vh] h-[90vh] md:h-auto md:max-h-[70vh] flex flex-col rounded-t-lg md:rounded-lg mx-auto mt-[10vh] md:mt-0"
        aria-describedby="new-chat-description"
      >
        <DialogHeader className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {isGroupMode && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mr-2 text-primary-foreground hover:bg-primary/100 rounded-full"
                  onClick={() => open()} // Go back to regular mode
                  aria-label="Back to contacts"
                  type="button"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <DialogTitle className="text-xl font-semibold">
                {isGroupMode ? 'New group' : 'New chat'}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary-foreground hover:bg-ring/30 rounded-full"
                aria-label="Close dialog"
                type="button"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          {isGroupMode && selectedUsers.length > 0 && (
            <div className="mt-2 text-sm">
              {selectedUsers.length} participant{selectedUsers.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </DialogHeader>
        
        {/* Hidden description for accessibility */}
        <DialogDescription id="new-chat-description" className="sr-only">
          {isGroupMode 
            ? 'Select participants to create a new group conversation' 
            : 'Start a new conversation with a contact'}
        </DialogDescription>
        
        <div className="p-3 sticky top-16 z-10 bg-secondary shadow-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={isGroupMode ? "Search participants" : "Search name or number"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-accent"
            />
          </div>
        </div>
        
        {isGroupMode && selectedUsers.length > 0 && (
          <div className="bg-accent p-3 border-b border-muted-foreground/20">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <Badge 
                  key={user.id} 
                  variant="secondary"
                  className="flex items-center gap-1 py-1 px-2"
                >
                  {user.name}
                  <Button 
                    onClick={() => toggleUserSelection(user)}
                    variant="ghost"
                    className="ml-1 rounded-full hover:bg-muted-foreground/10 p-0.5"
                    aria-label={`Remove ${user.name}`}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            
            {selectedUsers.length >= 2 && (
              <Input
                placeholder="Group name (optional)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-3"
              />
            )}
          </div>
        )}
        
        {!isGroupMode && (
          <Button 
            variant="ghost" 
            className="flex items-center justify-start p-4 hover:bg-muted-foreground/10 w-full text-left border-b border-muted-foreground/20"
            onClick={openGroupMode}
            aria-label="Create new group"
            type="button"
          >
            <div className="mr-3 text-primary/90">
              <Users className="h-6 w-6" />
            </div>
            <span>New group</span>
          </Button>
        )}
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary/90"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="divide-y">
              {filteredUsers.map(user => (
                <div 
                  key={user.id}
                  className={`p-3 hover:bg-muted-foreground/10 cursor-pointer flex items-center justify-between ${
                    isGroupMode && isUserSelected(user.id) ? 'bg-ring/20' : ''
                  }`}
                  onClick={() => isGroupMode ? toggleUserSelection(user) : handleStartIndividualChat(user)}
                >
                  <div className="flex items-center">
                    <Avatar className="mr-3 h-12 w-12">
                      <AvatarImage src={user.image} />
                      <AvatarFallback className="bg-ring/20 text-primary/90">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.email && <div className="text-sm text-muted-foreground">{user.email}</div>}
                    </div>
                  </div>
                  {isGroupMode && isUserSelected(user.id) && (
                    <div className="text-primary/90">
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="p-8 text-center text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {isGroupMode ? 'No users available' : 'No new contacts available'}
            </div>
          )}
        </div>
        
        {isGroupMode && selectedUsers.length >= 2 && (
          <DialogFooter className="px-4 py-3 border-t border-muted-foreground/20 bg-accent sticky bottom-0">
            <Button 
              className="w-full bg-primary/90 hover:bg-primary/100 text-primary-foreground"
              onClick={handleCreateGroup}
              disabled={isCreating}
              aria-label="Create group"
              type="button"
            >
              {isCreating ? 'Creating...' : 'Create group'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}