/**
 * useChatScroll Hook - OPTIMIZED FOR SMOOTH SCROLLING
 * 
 * Handles chat scrolling with consistent behavior:
 * - Always opens at bottom (newest messages)
 * - No random scroll positions
 * - Auto-scroll for new messages IF user is at bottom
 * - Smooth animations
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseChatScrollOptions {
  visible: boolean;
  chatId: string | null;
  messagesLength: number;
  userId: string | undefined;
  flashListRef: React.RefObject<any>;
}

export function useChatScroll({
  visible,
  chatId,
  messagesLength,
  flashListRef,
}: UseChatScrollOptions) {
  
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isAtBottomRef = useRef(true);
  const previousMessagesLength = useRef(0);
  const previousChatId = useRef<string | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);

  // Detect when chat changes
  const chatChanged = previousChatId.current !== chatId;
  
  // Reset state when chat changes or closes
  useEffect(() => {
    if (!visible || chatChanged) {
      setIsReady(false);
      setShowJumpToBottom(false);
      isAtBottomRef.current = true;
      hasInitializedRef.current = false;
      previousMessagesLength.current = 0;
      
      // Clear any pending scroll timeouts
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    }
    
    if (visible && chatId) {
      previousChatId.current = chatId;
    }
  }, [visible, chatId, chatChanged]);

  // Reliable scroll to bottom
  const scrollToBottom = useCallback((animated = true) => {
    if (!flashListRef.current || messagesLength === 0) {
      return;
    }

    try {
      // Use scrollToEnd for consistent behavior
      flashListRef.current.scrollToEnd({ animated });
      isAtBottomRef.current = true;
      setShowJumpToBottom(false);
    } catch (error) {
      // FlashList not ready yet, ignore
    }
  }, [flashListRef, messagesLength]);

  // Smart scroll with proper timing
  const debouncedScrollToBottom = useCallback((animated = true, delay = 100) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      scrollToBottom(animated);
      scrollTimeoutRef.current = null;
    }, delay);
  }, [scrollToBottom]);

  // Initialize scroll position on first render
  useEffect(() => {
    if (!visible || !chatId || messagesLength === 0) {
      return;
    }

    // Only run once per chat open
    if (hasInitializedRef.current) {
      return;
    }

    // Mark as ready and scroll after a short delay
    // This ensures FlashList has rendered the items
    const initTimeout = setTimeout(() => {
      setIsReady(true);
      scrollToBottom(false); // No animation on initial load
      hasInitializedRef.current = true;
    }, 200);

    return () => clearTimeout(initTimeout);
  }, [visible, chatId, messagesLength, scrollToBottom]);

  // Handle new messages - auto-scroll ONLY if user is at bottom
  useEffect(() => {
    if (!visible || !chatId || !isReady) {
      return;
    }

    const hasNewMessages = messagesLength > previousMessagesLength.current;
    
    if (hasNewMessages) {
      if (isAtBottomRef.current) {
        // User is at bottom, auto-scroll to show new messages
        debouncedScrollToBottom(true, 100);
      } else {
        // User scrolled up, don't interrupt - just show button
        setShowJumpToBottom(true);
      }
    }
    
    previousMessagesLength.current = messagesLength;
  }, [messagesLength, visible, chatId, isReady, debouncedScrollToBottom]);

  // Track scroll position
  const handleScroll = useCallback((event: any) => {
    if (!isReady) return;

    try {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const offsetY = contentOffset.y;
      const contentHeight = contentSize.height;
      const scrollViewHeight = layoutMeasurement.height;
      
      // Calculate distance from bottom
      const distanceFromBottom = contentHeight - (offsetY + scrollViewHeight);
      const isNearBottom = distanceFromBottom < 50; // Tighter threshold
      
      // Update state
      const wasAtBottom = isAtBottomRef.current;
      isAtBottomRef.current = isNearBottom;
      
      // Show/hide jump button (only if scrolled up significantly AND have messages)
      const shouldShow = !isNearBottom && messagesLength > 10 && distanceFromBottom > 200;
      setShowJumpToBottom(shouldShow);
      
      // If user scrolled back to bottom, dismiss button
      if (isNearBottom && !wasAtBottom) {
        setShowJumpToBottom(false);
      }
    } catch (error) {
      // Ignore scroll errors
    }
  }, [messagesLength, isReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollToBottom,
    debouncedScrollToBottom,
    handleScroll,
    showJumpToBottom,
    handleJumpToBottom: () => scrollToBottom(true),
    isReady, // Expose ready state
  };
}
