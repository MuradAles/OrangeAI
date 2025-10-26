/**
 * useChatMessages Hook
 * 
 * Handles all message-related functionality:
 * - Loading messages from SQLite and Firebase
 * - Sending messages and images
 * - Message processing and list items
 * - Chat initialization and cleanup
 */

import { Message } from '@/shared/types';
import { useChatStore } from '@/store';
import { useAuthStore } from '@/store/AuthStore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

interface UseChatMessagesOptions {
  visible: boolean;
  chatId: string | null;
  userId: string | undefined;
}

type ListItem = 
  | { type: 'message'; data: Message }
  | { type: 'date'; data: Date }
  | { type: 'unread'; data: number };

export function useChatMessages({
  visible,
  chatId,
  userId,
}: UseChatMessagesOptions) {
  const {
    messages,
    loadMessagesFromSQLite,
    subscribeToMessages,
    sendMessage,
    sendImageMessage,
    getUserProfile,
    markChatAsRead,
    retryFailedMessage,
    addReaction,
    setActiveChatId,
  } = useChatStore();

  const [isSending, setIsSending] = useState(false);
  const hasScrolledInitially = useRef(false);
  const isCleaningUp = useRef(false);

  // Load messages when modal opens
  useEffect(() => {
    if (visible && chatId && userId) {
      // Reset scroll flag when opening chat
      hasScrolledInitially.current = false;
      
      // Set active chat ID for notification routing (in Zustand store)
      setActiveChatId(chatId);
      
      // Save active chat ID to Firestore (for push notification filtering) - silent fail if offline
      const updateActiveChatInFirestore = async () => {
        try {
          const { UserService } = await import('@/services/firebase');
          await UserService.updateActiveChatId(userId, chatId);
        } catch (error) {
          // Silent fail when offline - not critical
        }
      };
      updateActiveChatInFirestore();
      
      // PRD Flow: Load from SQLite FIRST (instant <100ms), then sync from Firebase in background
      const loadMessages = async () => {
        // 1. Load from SQLite instantly (cached messages)
        await loadMessagesFromSQLite(chatId);
        
        // 2. Subscribe to Firebase for real-time updates (background sync)
        subscribeToMessages(chatId, userId);
        
        // 2.5. Sync user's preferred language to chat's detectedLanguages (non-blocking)
        // This ensures the chat knows what languages users prefer for translation
        const user = useAuthStore.getState().user;
        const preferredLanguage = user?.preferredLanguage;
        if (preferredLanguage) {
          // Capture as const for TypeScript type narrowing in async function
          const languageCode: string = preferredLanguage;
          const syncLanguage = async () => {
            try {
              const { ChatService } = await import('@/services/firebase');
              await ChatService.updateDetectedLanguages(chatId, languageCode);
            } catch (error) {
              // Silent fail when offline - not critical
            }
          };
          syncLanguage(); // Fire and forget
        }
        
        // 2.6. Detect actual languages used in chat messages (non-blocking)
        // This populates chat.detectedLanguages with real languages from messages
        const detectActualLanguages = async () => {
          try {
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('@/services/firebase/FirebaseConfig');
            
            const detectFn = httpsCallable(functions, 'detectChatLanguages');
            const result: any = await detectFn({ chatId, limit: 50 });
            
            if (result.data.success && result.data.languages.length > 0) {
              // Update chat with detected languages
              const { ChatService } = await import('@/services/firebase');
              for (const lang of result.data.languages) {
                await ChatService.updateDetectedLanguages(chatId, lang);
              }
            }
          } catch (error) {
            // Silent fail - not critical
          }
        };
        detectActualLanguages(); // Fire and forget
        
        // 3. Mark messages as read (PRD: If chat open → Mark as read)
        // Wait a bit to ensure messages are loaded first
        setTimeout(() => {
          markChatAsRead(chatId, userId);
        }, 500);
      };
      
      loadMessages();
    } else if (!visible) {
      // Clear active chat ID when modal closes
      setActiveChatId(null);
      
      // Clear active chat ID in Firestore (silent fail if offline)
      if (userId) {
        const clearActiveChatInFirestore = async () => {
          try {
            const { UserService } = await import('@/services/firebase');
            await UserService.updateActiveChatId(userId, null);
          } catch (error) {
            // Silent fail when offline - not critical
          }
        };
        clearActiveChatInFirestore();
      }
    }
    
    return () => {
      // Clear active chat ID on unmount (silent fail if offline)
      if (visible && userId) {
        setActiveChatId(null);
        
        // Clear active chat ID in Firestore
        const clearActiveChatInFirestore = async () => {
          try {
            const { UserService } = await import('@/services/firebase');
            await UserService.updateActiveChatId(userId, null);
          } catch (error) {
            // Silent fail when offline - not critical
          }
        };
        clearActiveChatInFirestore();
      }
      
      // Cleanup scroll timeout and reset flags
      hasScrolledInitially.current = false;
    };
    // Note: Don't clear messages on cleanup - keep them for quick reopening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, chatId, userId]);

  // Process messages into list items (with date separators)
  const listItems = useMemo(() => {
    const items: ListItem[] = [];
    let lastDate: string | null = null;
    
    // Sort messages by timestamp (oldest first for display)
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    sortedMessages.forEach((message) => {
      // Ensure timestamp is valid
      const messageDate = typeof message.timestamp === 'number' 
        ? new Date(message.timestamp)
        : new Date(message.timestamp);
      
      if (isNaN(messageDate.getTime())) {
        return; // Skip invalid timestamps
      }
      
      const currentDate = messageDate.toDateString();

      // Add date separator if date changed
      if (currentDate !== lastDate) {
        items.push({ type: 'date', data: messageDate });
        lastDate = currentDate;
      }

      // Add message
      items.push({ type: 'message', data: message });
    });

    // Return items in chronological order: oldest at top (index 0), newest at bottom (last index)
    return items;
  }, [messages]);

  // Check if we should show avatar (last message in group from bottom up)
  const shouldShowAvatar = useCallback((index: number): boolean => {
    // Normal order: index 0 is oldest, length-1 is newest
    // Show avatar for last message in group (next message is from different sender or too far apart)
    
    const currentItem = listItems[index];
    const nextItem = listItems[index + 1]; // Next item is newer
    
    if (!nextItem) return true; // Last item (newest message) always shows avatar
    
    if (currentItem.type !== 'message' || nextItem.type !== 'message') {
      return true;
    }
    
    const currentMsg = currentItem.data;
    const nextMsg = nextItem.data;
    
    // Different sender - show avatar for current message (last in this sender's group)
    if (currentMsg.senderId !== nextMsg.senderId) {
      return true;
    }
    
    // More than 1 minute apart - show avatar
    const currentTime = typeof currentMsg.timestamp === 'number' 
      ? currentMsg.timestamp 
      : new Date(currentMsg.timestamp).getTime();
    const nextTime = typeof nextMsg.timestamp === 'number' 
      ? nextMsg.timestamp 
      : new Date(nextMsg.timestamp).getTime();
    const timeDiff = nextTime - currentTime;
    return timeDiff > 60000;
  }, [listItems]);

  // Handle send message
  const handleSend = useCallback(async (text: string, onScrollToBottom?: () => void) => {
    if (!userId || !chatId) return;
    
    console.log('📤 Sending message:', text);
    setIsSending(true);
    try {
      await sendMessage(chatId, userId, text);
      console.log('✅ Message sent successfully');
      
      // Always scroll to bottom when user sends a message
      if (onScrollToBottom) {
        onScrollToBottom();
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [userId, chatId, sendMessage]);

  // Handle send image message
  const handleSendImage = useCallback(async (imageUri: string, caption?: string, onScrollToBottom?: () => void) => {
    if (!userId || !chatId) return;
    
    setIsSending(true);
    try {
      await sendImageMessage(chatId, userId, imageUri, caption);
      
      // Always scroll to bottom when user sends an image
      if (onScrollToBottom) {
        onScrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [userId, chatId, sendImageMessage]);

  // Handle message press (for retry on failed messages)
  const handleMessagePress = useCallback(async (message: Message) => {
    // If message is failed and user taps retry button, retry it
    if (message.status === 'failed' && message.senderId === userId && chatId) {
      try {
        await retryFailedMessage(chatId, message.id);
      } catch (error) {
        console.error('Failed to retry message:', error);
        Alert.alert('Error', 'Failed to retry message. Please try again.');
      }
    }
  }, [userId, chatId, retryFailedMessage]);

  // Handle quick emoji reaction
  const handleQuickReaction = useCallback(async (message: Message, emoji: string) => {
    if (!userId || !chatId) return;
    
    try {
      await addReaction(chatId, message.id, emoji, userId);
    } catch (error) {
      console.error('Failed to add quick reaction:', error);
      Alert.alert('Error', 'Failed to add reaction');
    }
  }, [userId, chatId, addReaction]);

  return {
    // State
    messages,
    listItems,
    isSending,
    
    // Actions
    handleSend,
    handleSendImage,
    handleMessagePress,
    handleQuickReaction,
    shouldShowAvatar,
    getUserProfile,
  };
}
