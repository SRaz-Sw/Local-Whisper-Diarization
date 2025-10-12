'use client';
// conversations/components/Chat.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// Hooks
import { useCurrentUser } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { useConversation } from '@/hooks/useConversations';
import { useSendMessage } from '@/hooks/useSendMessage';
import { messageKeys } from '@/hooks/useMessages';
import { useConversationDetailsStore } from '@/store/useConversationDetailsStore';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// Components
// import { ScrollArea } from '@/components/ui/scroll-area';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { ScrollBar } from '@/components/ui/scroll-area'; // Keep this if you want the styled scrollbar
import { cn } from '@/lib/utils'; // Make sure you have cn imported

import ConversationDetailsDialog from './ConversationDetailsDialog';
import ChatHeader from './ChatHeader';
import ChatItem from './ChatItem';
import ChatInput from './ChatInput';

// Types
import { useQueryClient } from '@tanstack/react-query';
import { UserData } from '@sraz-sw/fullstack-shared';
import { useChatScrollManagement } from '../hooks/useChatScrollManagement';

// Icons for pull-to-refresh
import { RefreshCcw } from 'lucide-react';

interface ChatProps {
	conversationId: string;
}

const Chat: React.FC<ChatProps> = ({ conversationId }) => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user: currentUser } = useCurrentUser();

	// Refs
	const topMessageRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Fetch Conversation Details
	const {
		data: conversationData,
		isLoading: isLoadingConversation,
		isError: isConversationError,
	} = useConversation(conversationId);

	// Fetch Messages
	const {
		messages,
		isLoading: isLoadingMessages,
		isError: isMessagesError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useMessages(conversationId);

	// Get the open function from the conversation details store
	const openConversationDetails = useConversationDetailsStore((state) => state.open);

	// Send Message Mutation
	const { mutate: sendMessage, isPending: isSendingMessage } = useSendMessage();

	// --- Callbacks (memoized) ---

	// Callback for Intersection Observer
	const handleLoadMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			console.log('Intersection observer triggered: Fetching next page...');
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Event Handlers
	const handleBackClick = useCallback(() => router.push('/conversations'), [router]);

	const handleSendMessage = useCallback(
		(messageBody: string) => {
			if (!messageBody.trim() || !conversationId) return;
			sendMessage({ conversationId: conversationId, body: messageBody });
		},
		[conversationId, sendMessage]
	);

	const handleRefresh = useCallback(() => {
		console.log('Manual refresh triggered');
		if (!conversationId) return;

		// Resetting the query clears its data and forces a refetch
		queryClient.resetQueries({ queryKey: messageKeys.infiniteList(conversationId) });
	}, [conversationId, queryClient]);

	// *** Use the consolidated scroll management hook ***
	// Moved after handleRefresh is defined
	const { isPullingToRefresh } = useChatScrollManagement({
		chatId: conversationId, // Pass the conversation ID to handle resets
		scrollContainerRef: scrollContainerRef as React.RefObject<HTMLElement>,
		bottomRef: bottomRef as React.RefObject<HTMLElement>,
		isLoadingHistory: isFetchingNextPage,
		isLoadingMessages: isLoadingMessages,
		listLength: messages.length,
		enabled: !!conversationId, // Only enable if a conversation is selected
		onRefresh: handleRefresh, // Pass the refresh handler
	});

	// Add a function to handle clicking on the conversation name
	const handleConversationHeaderClick = useCallback(() => {
		if (conversationData) {
			console.log('Opening conversation details for:', conversationData.id);
			openConversationDetails(conversationData);
		}
	}, [conversationData, openConversationDetails]);

	// Use the observer hook on the top ref
	useIntersectionObserver(topMessageRef as React.RefObject<Element>, handleLoadMore);

	// --- Memoized Values ---
	// Calculate Header Info
	const chatInfo = useMemo(() => {
		if (!conversationData) return { chatName: 'Conversation', chatAvatarFallback: '?' };

		const otherUsers = conversationData?.users?.filter((user: UserData) => user.id !== currentUser?.id);
		const otherUser = otherUsers && otherUsers.length === 1 ? otherUsers[0] : null;

		let chatName: string;
		if (conversationData?.userIds?.length && conversationData?.userIds?.length > 2) {
			const otherUserNames = otherUsers?.map((user) => user?.name).join(', ');
			// conversationData?.isGroup
			// For group chats, use the group name
			chatName = conversationData?.name || otherUserNames || 'Group Chat';
		} else {
			// For one-on-one chats, use the other user's name
			chatName = otherUser?.name || 'Unknown';
		}

		const chatAvatarFallback = chatName?.charAt(0).toUpperCase() || '?';
		const chatImage = conversationData?.isGroup ? conversationData?.imageUrl : otherUser?.image;

		return { otherUser, chatName, chatAvatarFallback, chatImage };
	}, [conversationData, currentUser?.id]);

	// --- Render Logic ---

	// Combined loading state for initial load
	if (isLoadingConversation || isLoadingMessages) {
		return (
			<div className="flex-1 flex flex-col overflow-hidden bg-secondary h-full min-w-0 items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary/90"></div>
				<p className="mt-4 text-muted-foreground">Loading conversation...</p>
			</div>
		);
	}

	// Error state
	if (isConversationError || isMessagesError) {
		return (
			<div className="flex-1 flex flex-col overflow-hidden bg-secondary h-full min-w-0 items-center justify-center text-destructive">
				<p>Error loading conversation data.</p>
			</div>
		);
	}

	// If conversation data isn't loaded, show fallback
	if (!conversationData) {
		return (
			<div className="flex-1 flex flex-col overflow-hidden bg-secondary h-full min-w-0 items-center justify-center text-muted-foreground">
				<p>Conversation not found or access denied.</p>
			</div>
		);
	}

	const blockedUsersByCurrentUser = currentUser?.blockedUserIds || [];

	// If no conversation is selected, show placeholder
	if (!conversationId) {
		return (
			<div className="flex-1 flex flex-col overflow-hidden bg-secondary h-full min-w-0">
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center p-10 bg-accent rounded-lg shadow-md max-w-md">
						<div className="flex justify-center mb-6">
							<div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-8 w-8 text-primary-foreground"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									/>
								</svg>
							</div>
						</div>
						<h3 className="text-2xl font-semibold text-muted-foreground mb-4">Welcome to WhatsApp Clone</h3>
						<p className="text-muted-foreground mb-6">
							Select a conversation from the sidebar to start chatting
						</p>
						<p className="text-sm text-muted-foreground">Your messages are end-to-end encrypted</p>
					</div>
				</div>
			</div>
		);
	}

	// If conversation is selected, show the chat interface
	return (
		<div className="flex-1 flex flex-col overflow-hidden bg-secondary h-full min-w-0">
			{/* Chat header */}
			<ChatHeader
				chatName={chatInfo.chatName}
				chatAvatarFallback={chatInfo.chatAvatarFallback}
				chatImage={chatInfo.chatImage || undefined}
				isOnline={!!chatInfo.otherUser?.isOnline}
				onBackClick={handleBackClick}
				onHeaderClick={handleConversationHeaderClick}
				onRefresh={handleRefresh}
				isLoadingMessages={isLoadingMessages}
				hasMessages={messages.length > 0}
			/>

			{/* Messages area */}
			{/* Messages area - Use Radix Primitives */}
			<ScrollAreaPrimitive.Root
				// Apply the classes previously on ScrollArea here
				className={cn('flex-1 p-4 bg-muted-foreground/10 min-h-0 relative')}
				style={{ touchAction: 'none' }} // Prevent scroll propagation on mobile
			>
				{/* Loading overlay - show when messages are loading */}
				{(isLoadingMessages || isLoadingConversation) && (
					<div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
						<div className="flex flex-col items-center gap-2">
							<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary/90"></div>
							<p className="text-muted-foreground">Loading messages...</p>
						</div>
					</div>
				)}

				<ScrollAreaPrimitive.Viewport
					// --- Apply the ref HERE ---
					ref={scrollContainerRef}
					// Apply classes needed for the viewport itself (size, rounding)
					// Also ensure it handles overflow
					className="size-full rounded-[inherit]"
					style={{
						overflowY: 'auto',
						touchAction: 'pan-y', // Enable vertical touch scrolling only
						WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
					}}
				>
					{/* Content START */}

					{/* Load More Trigger (at the very top) */}
					<div
						ref={topMessageRef}
						style={{ height: '1px', width: '100%', background: 'transparent', pointerEvents: 'none' }}
						aria-hidden="true"
					>
						{isFetchingNextPage && (
							<div className="text-center p-2 text-muted-foreground text-sm h-8 flex items-center justify-center bg-accent/30 rounded-md my-2">
								<div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary/90 mr-2"></div>
								Loading older messages...
							</div>
						)}
						{!isFetchingNextPage && !hasNextPage && messages.length > 0 && (
							<div className="text-center p-2 text-muted-foreground text-xs h-8 flex items-center justify-center bg-accent/20 rounded-md my-2">
								Beginning of conversation
							</div>
						)}
						{/* Placeholder with same height when neither applies to prevent layout shift */}
						{!isFetchingNextPage && hasNextPage && messages.length > 0 && <div className="h-8 my-2"></div>}
					</div>

					{/* Render Messages */}
					{messages.length > 0
						? messages.map(
								(
									message // Removed index, key on ChatItem
								) => (
									<ChatItem
										key={message.id}
										message={message}
										isSender={message.senderId === currentUser?.id}
										isGroupChat={conversationData?.isGroup || false}
										isSenderBlocked={(currentUser?.blockedUserIds || []).includes(message.senderId)}
									/>
								)
						  )
						: // No messages placeholder (if not loading)
						  !isLoadingMessages &&
						  !isLoadingConversation && (
								<div className="flex items-center justify-center h-full">
									<div className="text-center p-6 py-12 bg-accent rounded-lg shadow-md max-w-sm">
										<p className="text-muted-foreground">No messages in this conversation yet.</p>
									</div>
								</div>
						  )}

					{/* Element to scroll to */}
					<div ref={bottomRef} style={{ height: '1px', width: '100%' }} />

					{/* Pull to refresh indicator */}
					{isPullingToRefresh && (
						<div className=" my-10 mx-auto transform flex items-center justify-center bg-primary-foreground/20 text-primary rounded-full p-4 shadow-md transition-all">
							<RefreshCcw className="h-5 w-5 animate-spin" />
						</div>
					)}

					{/* Content END */}
				</ScrollAreaPrimitive.Viewport>

				{/* Keep the styled ScrollBar */}
				<ScrollBar orientation="vertical" />
				<ScrollAreaPrimitive.Corner />
			</ScrollAreaPrimitive.Root>

			{/* Message input */}
			<ChatInput onSendMessage={handleSendMessage} disabled={isSendingMessage} />

			{/* Conversation Details Dialog */}
			<ConversationDetailsDialog />
		</div>
	);
};

export default Chat;
