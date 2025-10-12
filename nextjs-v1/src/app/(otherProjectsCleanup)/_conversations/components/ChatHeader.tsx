import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConversationData } from '@sraz-sw/fullstack-shared';

interface ChatHeaderProps {
  chatName: string;
  chatAvatarFallback: string;
  chatImage?: string | null;
  isOnline?: boolean | null;
  onBackClick: () => void;
  onHeaderClick: () => void;
  onRefresh: () => void;
  isLoadingMessages: boolean;
  hasMessages: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatName,
  chatAvatarFallback,
  chatImage,
  isOnline,
  onBackClick,
  onHeaderClick,
  onRefresh,
  isLoadingMessages,
  hasMessages,
}) => {
  return (
    <div className="h-16 bg-muted-foreground/10 flex items-center justify-between px-4 border-b shrink-0 border-muted-foreground/20">
      <div className="flex items-center">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBackClick}
          className="md:hidden mr-2"
          aria-label="Back to conversations"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        
        {/* Avatar */}
        <Avatar className="mr-3">
          <AvatarImage src={chatImage || undefined} alt={chatName} />
          <AvatarFallback>{chatAvatarFallback}</AvatarFallback>
        </Avatar>
        
        {/* Name/Status */}
        <div
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onHeaderClick}
        >
          <div className="font-medium">{chatName || `Conversation`}</div>
          <div className="text-xs text-muted-foreground">
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>
      
      {/* Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        className="ml-auto"
      >
        {isLoadingMessages && !hasMessages ? 'Loading...' : 'Refresh'}
      </Button>
    </div>
  );
};

export default ChatHeader; 