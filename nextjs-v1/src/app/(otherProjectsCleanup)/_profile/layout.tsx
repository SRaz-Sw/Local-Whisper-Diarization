"use client"; 

import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { useCurrentUser } from '@/hooks/useAuth';        // Your auth hook

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';


export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // State to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);
  const router = useRouter(); 
  const pathname = usePathname(); // Get current path


  // Fetch conversations and user data using React Query hooks
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
          {children}
    </>
  );
}