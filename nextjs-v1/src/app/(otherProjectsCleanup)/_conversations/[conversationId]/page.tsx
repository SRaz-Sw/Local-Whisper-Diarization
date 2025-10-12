"use client"; // This page uses hooks (useParams) and renders the Chat client component
// src/app/conversations/[conversationId]/page.tsx

import React from 'react';
import { useParams } from 'next/navigation';
// Assume Chat component exists and handles its own message fetching
import Chat from '../components/Chat';
// import { useConversation } from '@/hooks/useConversations'; // <-- Only needed if Chat needs full conversation props

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string | undefined;

  // Optional: Fetch full conversation details if Chat component needs them
  // const { data: conversation, isLoading, isError } = useConversation(conversationId);

  if (!conversationId) {
    // This case should ideally be handled by routing or the layout
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 text-gray-500">
        Invalid Conversation ID.
      </div>
    );
  }

  // If loading full conversation details:
  // if (isLoading) { return <div>Loading conversation details...</div> }
  // if (isError) { return <div>Error loading conversation.</div> }

  return (
    <div className="h-full flex flex-col">
      {/*
        Pass only the ID. The Chat component should be responsible
        for fetching messages, participants etc. using this ID
        via React Query hooks (useMessages, useSendMessage etc.)
      */}
      <Chat conversationId={conversationId} /* conversation={conversation} */ />
    </div>
  );
}