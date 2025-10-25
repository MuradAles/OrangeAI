/**
 * useChatScroll Hook - SIMPLIFIED
 * 
 * Handles essential chat scrolling:
 * - Scroll to bottom on chat open
 * - Auto-scroll for new messages IF user is at bottom
 * - Show "Jump to Bottom" button when scrolled up
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
  const isAtBottomRef = useRef(true);
  const previousMessagesLength = useRef(0);

  // Simple scroll to bottom with safety checks
  const scrollToBottom = useCallback((animated = true) => {
    try {
      if (flashListRef.current && messagesLength > 0) {
        flashListRef.current.scrollToEnd({ animated });
        isAtBottomRef.current = true;
        setShowJumpToBottom(false);
      }
    } catch (error) {
      // Silently ignore scroll errors - FlashList not ready yet
      console.log('Scroll error (ignoring):', error);
    }
  }, [flashListRef, messagesLength]);

  // Scroll to bottom with small delay (for reliability)
  const debouncedScrollToBottom = useCallback((animated = true) => {
    if (messagesLength > 0) {
      setTimeout(() => scrollToBottom(animated), 150);
    }
  }, [scrollToBottom, messagesLength]);

  // Scroll to bottom when chat opens (with delay for FlashList to mount)
  useEffect(() => {
    if (visible && chatId && messagesLength > 0) {
      // Wait a bit longer for FlashList to fully render
      setTimeout(() => {
        scrollToBottom(false);
      }, 300);
      previousMessagesLength.current = messagesLength;
    }
  }, [visible, chatId, messagesLength, scrollToBottom]);

  // Auto-scroll on new messages IF user is at bottom
  useEffect(() => {
    if (!visible || !chatId) return;

    // Check if new messages arrived
    const hasNewMessages = messagesLength > previousMessagesLength.current;
    
    if (hasNewMessages && isAtBottomRef.current) {
      // User is at bottom + new messages = auto-scroll
      debouncedScrollToBottom(true);
    }
    
    previousMessagesLength.current = messagesLength;
  }, [messagesLength, visible, chatId, debouncedScrollToBottom]);

  // Handle scroll events - track if user is at bottom
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Check if at bottom (within 100px)
    const distanceFromBottom = contentHeight - (offsetY + scrollViewHeight);
    const isNearBottom = distanceFromBottom < 100;
    
    isAtBottomRef.current = isNearBottom;
    setShowJumpToBottom(!isNearBottom && messagesLength > 10);
  }, [messagesLength]);

  return {
    scrollToBottom,
    debouncedScrollToBottom,
    handleScroll,
    showJumpToBottom,
    handleJumpToBottom: scrollToBottom, // Just use scrollToBottom directly
    isInitializing: false, // No longer needed
    contentOffset: undefined, // No longer saving/restoring position
  };
}
