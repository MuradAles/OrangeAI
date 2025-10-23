/**
 * useChatPresence Hook
 * 
 * Handles presence subscriptions for chat participants
 * - Typing indicators
 * - Online/offline status (for one-on-one chats)
 */

import { PresenceService, TypingUser } from '@/services/firebase';
import { Chat } from '@/shared/types';
import { usePresenceStore } from '@/store';
import { useEffect, useState } from 'react';

interface UseChatPresenceOptions {
  visible: boolean;
  chatId: string | null;
  currentChat: Chat | undefined;
  userId: string | undefined;
  isGroupChat: boolean;
}

export function useChatPresence({
  visible,
  chatId,
  currentChat,
  userId,
  isGroupChat,
}: UseChatPresenceOptions) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { subscribeToUser } = usePresenceStore();

  // Subscribe to typing indicators
  useEffect(() => {
    if (!visible || !chatId || !userId) {
      setTypingUsers([]);
      return;
    }

    const unsubscribe = PresenceService.subscribeToTyping(
      chatId,
      userId,
      (users) => setTypingUsers(users),
      (error) => console.error('Error subscribing to typing:', error)
    );

    return () => {
      unsubscribe();
      setTypingUsers([]);
    };
  }, [visible, chatId, userId]);

  // Subscribe to other user's presence (online/offline status)
  // Using centralized PresenceStore - only for one-on-one chats
  useEffect(() => {
    if (!visible || !currentChat || !userId || isGroupChat) return;

    // Get the other user's ID (one-on-one only)
    const otherUserId = currentChat.participants.find(id => id !== userId);
    if (!otherUserId) return;

    // Subscribe via PresenceStore (handles deduplication)
    subscribeToUser(otherUserId);

    // No cleanup needed - PresenceStore manages subscriptions globally
  }, [visible, currentChat, userId, isGroupChat, subscribeToUser]);

  return {
    typingUsers,
  };
}


