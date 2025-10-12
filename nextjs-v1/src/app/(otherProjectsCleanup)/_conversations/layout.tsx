"use client"; 
// This layout fetches data and manages state, so it's a Client Component
// src/app/conversations/layout.tsx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useConversations } from '@/hooks/useConversations'; // Your hook
import { useCurrentUser } from '@/hooks/useAuth';        // Your auth hook
import ConversationSidebar from './ConversationsSidebar'; // We'll create this next
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile'; // Import the mobile hook
import NewChatDialog from './components/NewChatDialog'; // Import the NewChatDialog component
import ConversationDetailsDialog from './components/ConversationDetailsDialog'; // Import ConversationDetailsDialog

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // State to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);
  const router = useRouter(); 
  const pathname = usePathname(); // Get current path
  const isMobile = useIsMobile(); // Check if we're on mobile
  const isBaseRoute = pathname === '/conversations';

  // Fetch conversations and user data using React Query hooks
  const { data: conversations, isLoading: isLoadingConversations, isError: isConversationsError } = useConversations();
  const { user, isLoadingUser } = useCurrentUser();

  // useEffect runs only on the client, after the initial render
  useEffect(() => {
    setIsClient(true);
  }, []); // Empty dependency array ensures it runs only once on mount

  // Memoize the navigation callback
  const handleLogin = useCallback(() => {
    const returnUrl = encodeURIComponent(pathname);
    router.push(`/login?returnUrl=${returnUrl}`);
  }, [pathname, router]);
  
  // Memoize the loading render output to prevent recreation on every render
  const loadingContent = useMemo(() => (
    <div className="h-full flex items-center justify-center">
      Authenticating...
    </div>
  ), []);

  // Memoize the login prompt render output
  const loginPrompt = useMemo(() => (
    <div className="h-screen flex flex-col items-center justify-center">
      <h3>Please log in</h3>
      <Button onClick={handleLogin}>Login</Button>
    </div>
  ), [handleLogin]);

  if (!isClient || isLoadingUser) {
    return loadingContent;
  }
  
  if (!user) {
    return loginPrompt;
  }

  return (
    <>
      <div className="h-full flex overflow-hidden">
        <ConversationSidebar
          conversations={conversations ?? []} // Pass fetched conversations, default to empty array
          currentUser={user} // Pass current user (might be needed for unread calcs)
          isLoading={isLoadingConversations} // Pass loading state to sidebar
          isError={isConversationsError}     // Pass error state
        />
        {/* Hide main content on mobile when at base route */}
        <main className={`flex-1 h-full overflow-y-auto ${isMobile && isBaseRoute ? 'hidden' : ''}`}>
          {children}
        </main>
      </div>
      {/* Add NewChatDialog at the layout level so it's available from all child routes */}
      <NewChatDialog />
      <ConversationDetailsDialog />
    </>
  );
}