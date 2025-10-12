// conversations/hooks/useChatScrollManagement.ts
import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';

type UseChatScrollManagementProps = {
  chatId: string | null | undefined;
  scrollContainerRef: React.RefObject<HTMLElement>;
  bottomRef: React.RefObject<HTMLElement>;
  isLoadingHistory: boolean;
  isLoadingMessages: boolean; // Flag for initial/refresh load
  listLength: number;
  enabled?: boolean;
  onRefresh?: () => void; // Add callback for refresh action
};

const SCROLL_NEAR_BOTTOM_THRESHOLD = 150;
const PULL_TO_REFRESH_THRESHOLD = 80; // Pixels needed to pull down to trigger refresh
const SPRING_ANIMATION_DURATION = 300; // Duration in ms for spring animation

export function useChatScrollManagement({
  chatId,
  scrollContainerRef,
  bottomRef,
  isLoadingHistory,
  isLoadingMessages,
  listLength,
  enabled = true,
  onRefresh,
}: UseChatScrollManagementProps): { isPullingToRefresh: boolean } {

  const didInitialScrollRef = useRef(false);
  const scrollSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const wasLoadingHistoryRef = useRef(false);
  const previousChatIdRef = useRef(chatId);
  const prevIsLoadingMessagesRef = useRef(isLoadingMessages);
  
  // Spring animation state
  const springAnimationRef = useRef<number | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const [isPullingToRefresh, setIsPullingToRefresh] = useState(false);
  const isAtBottomRef = useRef(false); // Track if scroll is at bottom

  // Check if at bottom utility
  const checkIfAtBottom = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const scrollContainer = scrollContainerRef.current;
    const atBottom = Math.abs(
      (scrollContainer.scrollHeight - scrollContainer.scrollTop) - scrollContainer.clientHeight
    ) < SCROLL_NEAR_BOTTOM_THRESHOLD;
    
    isAtBottomRef.current = atBottom;
    return atBottom;
  }, [scrollContainerRef]);
  
  // Helper function to apply spring animation
  const applySpringAnimation = useCallback((element: HTMLElement, targetPosition: number, direction: 'top' | 'bottom') => {
    // Cancel any existing animation
    if (springAnimationRef.current !== null) {
      cancelAnimationFrame(springAnimationRef.current);
    }

    const startPosition = element.scrollTop;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();
    
    // Spring animation function
    const animateSpring = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / SPRING_ANIMATION_DURATION, 1);
      
      // Ease out cubic + slight overshoot for spring effect
      let easedProgress: number;
      if (progress < 0.7) {
        // Accelerate faster at start
        easedProgress = 1.2 * progress * progress * progress;
      } else {
        // Add slight overshoot effect near the end
        easedProgress = 1 + Math.sin((progress - 0.7) * 5) * 0.1 * (1 - progress);
      }
      
      // Calculate current position with easing
      const currentPosition = startPosition + distance * easedProgress;
      
      // Apply scroll
      element.scrollTop = currentPosition;
      
      // Continue animation if not complete
      if (progress < 1) {
        springAnimationRef.current = requestAnimationFrame(animateSpring);
      } else {
        springAnimationRef.current = null;
        // Update isAtBottom state after animation completes
        if (direction === 'bottom') {
          isAtBottomRef.current = true;
        }
      }
    };
    
    // Start animation
    springAnimationRef.current = requestAnimationFrame(animateSpring);
  }, []);

  // --- Reset initial scroll flag on chat change OR when initial/refresh load starts ---
  useEffect(() => {
    let didReset = false; // Flag to prevent potential double reset if both conditions met simultaneously

    // Reset if Chat ID changes
    if (chatId !== previousChatIdRef.current) {
      if (didInitialScrollRef.current || previousChatIdRef.current === undefined) { // Only log/reset if it needs resetting or first time
          console.log(`ChatScrollManagement: Chat ID changed from ${previousChatIdRef.current ?? 'undefined'} to ${chatId}. Resetting initial scroll flag.`);
          didInitialScrollRef.current = false;
      }
      previousChatIdRef.current = chatId; // Update previous chat ID
      didReset = true;
    }

    // *** Reset if initial/refresh loading STARTS for the current chat ***
    // (isLoadingMessages becomes true when it wasn't previously)
    if (isLoadingMessages && !prevIsLoadingMessagesRef.current && !didReset) {
        // Only reset if it wasn't already false
        if (didInitialScrollRef.current) {
             console.log(`ChatScrollManagement: Initial/Refresh loading started (isLoadingMessages became true). Resetting initial scroll flag.`);
             didInitialScrollRef.current = false;
        }
    }

    // Update previous loading state *after* all checks for the next cycle
    prevIsLoadingMessagesRef.current = isLoadingMessages;

  }, [chatId, isLoadingMessages]); // Depend on these to detect relevant changes


  // --- Effect 1: Capture scroll state BEFORE history loading starts ---
  useEffect(() => {
    if (!enabled || !scrollContainerRef.current || !chatId) return;
    const scrollContainer = scrollContainerRef.current;
    if (isLoadingHistory && !wasLoadingHistoryRef.current) {
      if (scrollContainer.scrollTop > 10) {
        console.log(`ChatScrollManagement: [Start History Load] Capturing snapshot.`);
        scrollSnapshotRef.current = {
          scrollHeight: scrollContainer.scrollHeight,
          scrollTop: scrollContainer.scrollTop,
        };
      } else {
        console.log('ChatScrollManagement: [Start History Load] Near top, skipping snapshot.');
        scrollSnapshotRef.current = null;
      }
      wasLoadingHistoryRef.current = true;
    }
  }, [enabled, chatId, isLoadingHistory, scrollContainerRef]);

  // Add scroll event listener to track scroll position
  useEffect(() => {
    if (!enabled || !scrollContainerRef.current) return;
    
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = () => {
      checkIfAtBottom();
    };
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, scrollContainerRef, checkIfAtBottom]);

  // --- Effect 2: Adjust scroll position AFTER history messages render ---
  useLayoutEffect(() => {
    if (!enabled || !scrollContainerRef.current || !chatId) return;
    const scrollContainer = scrollContainerRef.current;
    if (scrollSnapshotRef.current && !isLoadingHistory && wasLoadingHistoryRef.current) {
      const { scrollHeight: prevScrollHeight, scrollTop: prevScrollTop } = scrollSnapshotRef.current;
      const newScrollHeight = scrollContainer.scrollHeight;
      const heightDifference = newScrollHeight - prevScrollHeight;
      if (heightDifference > 0) {
        // Apply spring effect when new content is loaded at the top
        applySpringAnimation(scrollContainer, prevScrollTop + heightDifference, 'top');
        console.log(`ChatScrollManagement: [End History Load] Applied spring scroll animation.`);
      } else {
         console.log(`ChatScrollManagement: [End History Load] No height difference.`);
      }
      scrollSnapshotRef.current = null;
      wasLoadingHistoryRef.current = false;
    } else if (!isLoadingHistory && wasLoadingHistoryRef.current) {
         console.log("ChatScrollManagement: [End History Load] Flag reset (no snapshot).");
         wasLoadingHistoryRef.current = false;
    }
  }, [enabled, chatId, listLength, isLoadingHistory, scrollContainerRef, applySpringAnimation]);


  // --- Effect 3: Handle Initial Scroll & Scroll-on-New Message ---
  useEffect(() => {
    if (!enabled || !scrollContainerRef.current || !bottomRef.current || !chatId) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const bottomEl = bottomRef.current;

    // --- Initial Scroll ---
    // Condition: Initial scroll flag is false, initial/refresh loading just finished, list has content
    if (!didInitialScrollRef.current && !isLoadingMessages && listLength > 0) {
      console.log('ChatScrollManagement: Performing initial/refresh scroll to bottom.');
      applySpringAnimation(scrollContainer, scrollContainer.scrollHeight - scrollContainer.clientHeight, 'bottom');
      didInitialScrollRef.current = true; // Set flag *after* successful condition met
      return; // Prevent subsequent logic in this run
    }

    // --- Subsequent Scrolls (for new messages) ---
    // Condition: Initial scroll IS done, NOT loading history
    if (didInitialScrollRef.current && !isLoadingHistory) {
      const userScrollPosition = scrollContainer.scrollTop + scrollContainer.clientHeight;
      const isNearBottom = Math.abs(scrollContainer.scrollHeight - userScrollPosition) < SCROLL_NEAR_BOTTOM_THRESHOLD;

      if (isNearBottom) {
        // Avoid tiny scrolls if already effectively at the bottom
        if (Math.abs(scrollContainer.scrollHeight - userScrollPosition) > 1) {
            console.log(`ChatScrollManagement: Scrolling to bottom (spring) - user near bottom.`);
            applySpringAnimation(scrollContainer, scrollContainer.scrollHeight - scrollContainer.clientHeight, 'bottom');
        }
      }
    }

  }, [enabled, chatId, listLength, isLoadingHistory, isLoadingMessages, scrollContainerRef, bottomRef, applySpringAnimation]);

  // Setup touch handlers for pull-to-refresh
  useEffect(() => {
    if (!enabled || !scrollContainerRef.current || !onRefresh) return;
    
    const scrollContainer = scrollContainerRef.current;
    
    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull-to-refresh when at bottom
      checkIfAtBottom();
      if (isAtBottomRef.current) {
        touchStartRef.current = e.touches[0].clientY;
        pullDistanceRef.current = 0;
      } else {
        touchStartRef.current = null;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartRef.current === null) return;
      
      // User is pulling down from bottom
      const touchY = e.touches[0].clientY;
      const pullDistance = touchY - touchStartRef.current;
      
      // Only activate when pulling down (positive distance)
      if (pullDistance > 0) {
        // Prevent default scroll behavior when we're handling the pull
        e.preventDefault();
        pullDistanceRef.current = pullDistance;
        
        // Scale down the visual pull to make it feel more natural
        const scaledPull = Math.min(PULL_TO_REFRESH_THRESHOLD * 1.5, pullDistance * 0.5);
        
        // Apply visual indicator
        setIsPullingToRefresh(pullDistance > PULL_TO_REFRESH_THRESHOLD / 2);
        
        // Apply a transform to create the pulling effect
        if (bottomRef.current) {
          bottomRef.current.style.transform = `translateY(${scaledPull}px)`;
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (touchStartRef.current === null) return;
      
      // Reset visual state
      if (bottomRef.current) {
        // Apply spring-back animation
        bottomRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        bottomRef.current.style.transform = 'translateY(0)';
        
        // Clear transition after animation completes
        setTimeout(() => {
          if (bottomRef.current) {
            bottomRef.current.style.transition = '';
          }
        }, 300);
      }
      
      // Trigger refresh if pulled enough
      if (pullDistanceRef.current > PULL_TO_REFRESH_THRESHOLD && onRefresh) {
        console.log('ChatScrollManagement: Pull-to-refresh triggered');
        onRefresh();
      }
      
      // Reset state
      touchStartRef.current = null;
      pullDistanceRef.current = 0;
      setIsPullingToRefresh(false);
    };
    
    // Add event listeners with proper options to ensure they capture events
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    scrollContainer.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      // Clean up event listeners
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove, { capture: true } as EventListenerOptions);
      scrollContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, scrollContainerRef, bottomRef, checkIfAtBottom]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (springAnimationRef.current !== null) {
        cancelAnimationFrame(springAnimationRef.current);
      }
    };
  }, []);

  return { isPullingToRefresh };
}