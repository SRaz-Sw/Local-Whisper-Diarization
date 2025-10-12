'use client';
// src/app/conversations/page.tsx
import React from 'react';
import { useNewChatStore } from '@/store/useNewChatStore';
import NewChatDialog from './components/NewChatDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ConversationsBasePage() {
  const { open: openNewChatDialog } = useNewChatStore();

  return (
    <>
      <div className="hidden md:flex flex-col h-full items-center justify-center bg-muted-foreground/10 text-muted-foreground">
        {/* This content is hidden on mobile by default because the sidebar takes over */}
        <p className="mb-4">Select a conversation to start chatting.</p>
        <Button onClick={openNewChatDialog} className="bg-primary/90 hover:bg-primary/100 text-primary-foreground">
          <Plus size={16} className="mr-2" /> New Chat
        </Button>
      </div>
      <NewChatDialog />
    </>
  );
}
// Note: On mobile, the sidebar defined in the layout will likely overlay this
// when isMobileNavigatorOpen is true. This component mainly provides the
// placeholder content for desktop when no chat is selected.