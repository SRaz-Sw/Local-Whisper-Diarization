import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AIInputWithSearch } from './ai-input-with-search';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const [messageBody, setMessageBody] = useState('');

  const handleSend = useCallback((messageToSend: string, withSearch: boolean = false) => {
    if (!messageToSend.trim()) return;
    
    onSendMessage(messageToSend);
    setMessageBody('');
  }, [onSendMessage]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(messageBody, false);
      }
    },
    [handleSend, messageBody]
  );

  const handleFileSelect = useCallback((file: File) => {
    console.log('File selected (TODO: IMPLEMENT WITH FILE UPLOAD):', file);
  }, []);

  return (
    <div className="bg-muted-foreground/10 p-3 pb-0 flex items-center shrink-0 border-t border-muted-foreground/20">
      {/* <Input
        type="text"
        placeholder="Type a message..."
        value={messageBody}
        onChange={(e) => setMessageBody(e.target.value)}
        onKeyDown={handleKeyPress}
        className="flex-1 p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/90 mr-2"
        disabled={disabled}
      />
      <Button
        onClick={handleSend}
        className="bg-primary/90 text-primary-foreground p-2 rounded-full hover:bg-primary/100 transition-colors disabled:opacity-50"
        disabled={!messageBody.trim() || disabled}
        aria-label="Send message"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </Button> */}
      <AIInputWithSearch onSubmit={handleSend} 
      onFileSelect={handleFileSelect}
      />
    </div>
  );
};

export default ChatInput; 