'use client'; // Must be a client component
// FILE ___________ src/app/providers.tsx

import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useInitializeQueryClientPersistence } from '@/lib/query-services/queryClientPersist'; // Import the hook
import { ThemeProvider } from 'next-themes';

export default function ProvidersClientSide({ children }: { children: React.ReactNode }) {
	// This hook gets the client instance AND initializes persistence on first client render
	const queryClient = useInitializeQueryClientPersistence();
	
	// Avoid theme hydration mismatch by only rendering theme provider on client
	const [mounted, setMounted] = useState(false);
	
	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		// Provide the client to your App
		<QueryClientProvider client={queryClient}>
			{mounted ? (
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					{children}
				</ThemeProvider>
			) : (
				<>{children}</>
			)}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}
