// src/hooks/useIntersectionObserver.ts
import { useState, useEffect, RefObject, useCallback, useRef } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean; // Option to stop observing after visible once
}

export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  callback: () => void, // Callback to run when element intersects
  {
    threshold = 0.1, // Default threshold
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  }: UseIntersectionObserverOptions = {} // Default options object
): boolean { // Return boolean indicating if currently intersecting
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries; // Get the first entry
      const currentlyIntersecting = entry.isIntersecting;

      setIsIntersecting(currentlyIntersecting); // Update state

      if (currentlyIntersecting) {
        callback(); // Call the provided callback when intersecting
        if (freezeOnceVisible && observerRef.current) {
          observerRef.current.unobserve(entry.target); // Stop observing if needed
        }
      }
    },
    [callback, freezeOnceVisible]
  );

  useEffect(() => {
    const node = elementRef?.current; // DOM node
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || !node) return;

    // Ensure previous observer is disconnected
    if (observerRef.current) observerRef.current.disconnect();

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersect, {
      threshold,
      root,
      rootMargin,
    });

    // Observe the target node
    observerRef.current.observe(node);

    // Clean up on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRef, threshold, root, rootMargin, handleIntersect]); // Re-run effect if dependencies change

  return isIntersecting;
}