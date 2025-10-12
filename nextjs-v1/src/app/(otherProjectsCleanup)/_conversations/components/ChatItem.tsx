import React from 'react';
import { MessageData, UserData } from '@sraz-sw/fullstack-shared';

interface ChatItemProps {
  message: MessageData;
  isSender: boolean;
  isGroupChat: boolean;
  isSenderBlocked: boolean;
}

const ChatItem: React.FC<ChatItemProps> = ({ message, isSender, isGroupChat, isSenderBlocked }) => {
  return (
    <div
      aria-label={isSenderBlocked ? 'Message from blocked user' : ''}
      title={isSenderBlocked ? 'Message from blocked user' : ''}
      className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-2 ${
        isSenderBlocked ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div
        className={`max-w-[75%] px-3 py-2 rounded-lg shadow-md break-words ${
          isSender ? 'ml-auto bg-ring/20' : 'bg-accent'
        }`}
      >
        {/* Sender Name for Group Chats */}
        {!isSender && isGroupChat && (
          <div className="text-xs font-semibold text-chart-2 mb-1">
            {message.sender?.name || '...'}
          </div>
        )}
        
        {/* Message Body */}
        <div className="text-sm">{message.body}</div>
        
        {/* Timestamp and Status */}
        <div className="text-right mt-1 flex items-center justify-end space-x-1">
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          {isSender && (
            <span className="text-xs text-muted-foreground">
              {message.status === 'pending' && '⏳'}
              {message.status === 'sent' && '✓'}
              {/* {message.status === 'delivered' && '✓✓'} */}
              {/* {message.status === 'read' && <span className="text-blue-500">✓✓</span>} */}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatItem; 