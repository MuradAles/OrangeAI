/**
 * ChatStore - Message Actions
 * 
 * Handles:
 * - Sending messages (text & image)
 * - Message status updates
 * - Message deletion
 * - Reactions
 * - Mark as read
 */

import { SQLiteService } from '@/database/SQLiteService';
import { ChatService, MessageService } from '@/services/firebase';
import { Message, MessageStatus } from '@/shared/types';
import NetInfo from '@react-native-community/netinfo';

export const createMessageActions = (set: any, get: any) => ({
  // Send a new message (optimistic update)
  sendMessage: async (chatId: string, senderId: string, text: string, translationMetadata?: {
    originalText?: string;
    originalLanguage?: string;
    translatedTo?: string;
    sentAsTranslation?: boolean;
  }) => {
    try {
      // Check network status to determine if we should queue or send immediately
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected && (networkState.isInternetReachable === null || networkState.isInternetReachable === true);
      
      // Generate a unique message ID (will be used in both local state and Firestore)
      // This prevents duplicates because Firestore will use the same ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: messageId,
        chatId,
        senderId,
        text,
        timestamp: Date.now(), // Use timestamp number instead of Date object
        status: 'sending',
        type: 'text',
        imageUrl: null,
        thumbnailUrl: null,
        caption: null,
        reactions: {},
        deletedFor: [],
        deletedForEveryone: false,
        deletedAt: null,
        syncStatus: 'pending',
        // Translation metadata
        originalText: translationMetadata?.originalText,
        originalLanguage: translationMetadata?.originalLanguage,
        translatedTo: translationMetadata?.translatedTo,
        sentAsTranslation: translationMetadata?.sentAsTranslation,
      };

      // Add to state immediately (optimistic update)
      const { messages } = get();
      set({ messages: [...messages, optimisticMessage] });

      // Save to SQLite with pending status (convert to MessageRow)
      const messageRow: any = {
        id: optimisticMessage.id,
        chatId: optimisticMessage.chatId,
        senderId: optimisticMessage.senderId,
        text: optimisticMessage.text,
        timestamp: typeof optimisticMessage.timestamp === 'number' 
          ? optimisticMessage.timestamp 
          : (optimisticMessage.timestamp as any).getTime?.() || Date.now(),
        status: optimisticMessage.status,
        type: optimisticMessage.type,
        imageUrl: optimisticMessage.imageUrl,
        thumbnailUrl: optimisticMessage.thumbnailUrl,
        caption: optimisticMessage.caption,
        reactions: JSON.stringify(optimisticMessage.reactions || {}),
        deletedForMe: 0,
        deletedForEveryone: 0,
        syncStatus: 'pending', // Always set to pending initially
        // Translation metadata
        originalText: optimisticMessage.originalText,
        originalLanguage: optimisticMessage.originalLanguage,
        translatedTo: optimisticMessage.translatedTo,
        sentAsTranslation: optimisticMessage.sentAsTranslation ? 1 : 0,
      };
      
      // Save to SQLite synchronously (wait for it)
      await SQLiteService.saveMessage(messageRow);
      console.log(`💾 Message saved to SQLite: ${messageRow.id} (syncStatus: pending)`);

      // If offline, queue the message and return early
      if (!isOnline) {
        // Message is already saved to SQLite with pending status
        // MessageQueue will process it when connection is restored
        console.log('📱 Offline: Message queued locally, will sync when online');
        return;
      }

      // Upload to Firestore in background with the same ID (online only)
      try {
        await MessageService.sendMessage(chatId, senderId, text, messageId, undefined, translationMetadata);
        
        // FIRST: Increment unread count for other participants (before updating chat document)
        const { chats } = get();
        const currentChat = chats.find((c: any) => c.id === chatId);
        if (currentChat) {
          const otherParticipants = currentChat.participants.filter((id: string) => id !== senderId);
          for (const participantId of otherParticipants) {
            try {
              await ChatService.incrementUnreadCount(chatId, participantId);
            } catch (error) {
              console.error('❌ Error incrementing unread count:', error);
            }
          }
        } else {
          console.warn(`⚠️ Chat ${chatId} not found in local state when trying to increment unread count`);
        }
        
        // DETECT LANGUAGE and update chat's detectedLanguages array (non-blocking)
        // Use originalLanguage from translation metadata if available, otherwise detect
        const detectedLanguage = translationMetadata?.originalLanguage;
        if (detectedLanguage) {
          // Non-blocking language update - don't wait for it
          ChatService.updateDetectedLanguages(chatId, detectedLanguage).catch((error) => {
            console.error('❌ Error updating detected languages:', error);
          });
        }
        
        // THEN: Update last message in chat with 'sent' status and the message timestamp
        // This triggers the chat subscription, which will now fetch the updated unread count
        await ChatService.updateChatLastMessage(chatId, text, senderId, 'sent', optimisticMessage.timestamp);
        
        // Update SQLite: mark as synced
        await SQLiteService.updateMessageStatus(messageId, 'sent', 'synced');
        console.log(`✅ Message sent successfully: ${messageId}`);
        
        // The Firestore listener will update the message with the real timestamp and 'sent' status
        // Since we use the same ID, it will replace the optimistic message automatically
        
      } catch (uploadError) {
        // Mark as failed
        const failedMessage: Message = {
          ...optimisticMessage,
          status: 'sending',
          syncStatus: 'failed',
        };
        
        // Update in state to show failed status
        set((state: any) => ({
          messages: state.messages.map((msg: Message) => 
            msg.id === messageId ? failedMessage : msg
          ),
        }));
        
        // Update in SQLite
        const failedRow: any = {
          id: failedMessage.id,
          chatId: failedMessage.chatId,
          senderId: failedMessage.senderId,
          text: failedMessage.text,
          timestamp: typeof failedMessage.timestamp === 'number' 
            ? failedMessage.timestamp 
            : (failedMessage.timestamp as any).getTime?.() || Date.now(),
          status: failedMessage.status,
          type: failedMessage.type,
          imageUrl: failedMessage.imageUrl,
          thumbnailUrl: failedMessage.thumbnailUrl,
          caption: failedMessage.caption,
          reactions: JSON.stringify(failedMessage.reactions || {}),
          deletedForMe: 0,
          deletedForEveryone: 0,
          syncStatus: failedMessage.syncStatus,
        };
        // Non-blocking save, ignore errors
        SQLiteService.saveMessage(failedRow).catch(() => {});
        
        throw uploadError;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Send image message with optional caption
  sendImageMessage: async (chatId: string, senderId: string, imageUri: string, caption?: string) => {
    try {
      // Check network status before sending
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected && (networkState.isInternetReachable === null || networkState.isInternetReachable === true);
      
      // For now, block image uploads when offline (images need to be uploaded first)
      // TODO: Implement offline image queuing with local storage
      if (!isOnline) {
        throw new Error('No internet connection. Please try again when you\'re online.');
      }
      
      const { StorageService } = await import('@/services/firebase');
      
      // Generate unique message ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create optimistic message with placeholder image
      const optimisticMessage: Message = {
        id: messageId,
        chatId,
        senderId,
        text: '', // Empty text for image messages
        timestamp: Date.now(),
        status: 'sending',
        type: 'image',
        imageUrl: imageUri, // Use local URI temporarily
        thumbnailUrl: imageUri, // Use local URI temporarily
        caption: caption || null,
        reactions: {},
        deletedFor: [],
        deletedForEveryone: false,
        deletedAt: null,
        syncStatus: 'pending',
      };

      // Add to state immediately (optimistic update)
      const { messages } = get();
      set({ messages: [...messages, optimisticMessage] });

      // Save to SQLite with pending status
      const messageRow: any = {
        id: optimisticMessage.id,
        chatId: optimisticMessage.chatId,
        senderId: optimisticMessage.senderId,
        text: optimisticMessage.text,
        timestamp: optimisticMessage.timestamp,
        status: optimisticMessage.status,
        type: optimisticMessage.type,
        imageUrl: optimisticMessage.imageUrl,
        thumbnailUrl: optimisticMessage.thumbnailUrl,
        caption: optimisticMessage.caption,
        reactions: JSON.stringify(optimisticMessage.reactions || {}),
        deletedForMe: 0,
        deletedForEveryone: 0,
        syncStatus: optimisticMessage.syncStatus,
      };
      // Non-blocking save, ignore errors
      SQLiteService.saveMessage(messageRow).catch(() => {});

      // Upload image to Storage in background
      try {
        const { imageUrl, thumbnailUrl } = await StorageService.uploadMessageImage(
          chatId,
          messageId,
          imageUri
        );

        // Send message to Firestore with real image URLs
        await MessageService.sendMessage(chatId, senderId, '', messageId, {
          type: 'image',
          imageUrl,
          thumbnailUrl,
          caption: caption || null,
        });
        
        // Increment unread count for other participants
        const { chats } = get();
        const currentChat = chats.find((c: any) => c.id === chatId);
        if (currentChat) {
          const otherParticipants = currentChat.participants.filter((id: string) => id !== senderId);
          for (const participantId of otherParticipants) {
            try {
              await ChatService.incrementUnreadCount(chatId, participantId);
            } catch (error) {
              console.error('❌ Error incrementing unread count:', error);
            }
          }
        }
        
        // Update last message in chat with timestamp
        const lastMessageText = caption || '📷 Photo';
        await ChatService.updateChatLastMessage(chatId, lastMessageText, senderId, 'sent', optimisticMessage.timestamp);
        
        // Update optimistic message with real URLs in state
        set((state: any) => ({
          messages: state.messages.map((msg: Message) => 
            msg.id === messageId 
              ? { ...msg, imageUrl, thumbnailUrl, syncStatus: 'synced' as const }
              : msg
          ),
        }));

        // Update in SQLite with real URLs
        const syncedRow: any = {
          ...messageRow,
          imageUrl,
          thumbnailUrl,
          syncStatus: 'synced',
        };
        // Non-blocking save, ignore errors
        SQLiteService.saveMessage(syncedRow).catch(() => {});
        
      } catch (uploadError) {
        console.error('❌ Error uploading image:', uploadError);
        
        // Mark as failed
        const failedMessage: Message = {
          ...optimisticMessage,
          status: 'sending',
          syncStatus: 'failed',
        };
        
        // Update state
        set((state: any) => ({
          messages: state.messages.map((msg: Message) => 
            msg.id === messageId ? failedMessage : msg
          ),
        }));
        
        // Update SQLite
        const failedRow: any = {
          ...messageRow,
          syncStatus: 'failed',
        };
        // Non-blocking save, ignore errors
        SQLiteService.saveMessage(failedRow).catch(() => {});
        
        throw uploadError;
      }
    } catch (error) {
      console.error('Error sending image message:', error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update message status (sent → delivered → read)
  updateMessageStatus: async (chatId: string, messageId: string, status: MessageStatus) => {
    try {
      await MessageService.updateMessageStatus(chatId, messageId, status);
      
      // Update in SQLite (non-blocking)
      SQLiteService.getMessageById(messageId).then(message => {
        if (message) {
          const updatedMessage = { ...message, status };
          SQLiteService.saveMessage(updatedMessage).catch(() => {});
        }
      }).catch(() => {});
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  },

  // Retry failed message
  retryFailedMessage: async (chatId: string, messageId: string) => {
    try {
      const { MessageQueue } = await import('@/database/MessageQueue');
      
      // Update UI immediately to show "sending" status
      set((state: any) => ({
        messages: state.messages.map((msg: Message) =>
          msg.id === messageId
            ? { ...msg, status: 'sending' as MessageStatus, syncStatus: 'pending' }
            : msg
        ),
      }));
      
      // Update SQLite
      const message = await SQLiteService.getMessageById(messageId);
      if (message) {
        await SQLiteService.saveMessage({
          ...message,
          status: 'sending',
          syncStatus: 'pending',
        });
      }
      
      // Attempt to retry via MessageQueue
      const success = await MessageQueue.retryMessage(messageId);
      
      if (success) {
        // Success! Message sent
        set((state: any) => ({
          messages: state.messages.map((msg: Message) =>
            msg.id === messageId
              ? { ...msg, status: 'sent' as MessageStatus, syncStatus: 'synced' }
              : msg
          ),
        }));
      } else {
        // Failed again, keep as failed
        set((state: any) => ({
          messages: state.messages.map((msg: Message) =>
            msg.id === messageId
              ? { ...msg, status: 'failed' as MessageStatus, syncStatus: 'failed' }
              : msg
          ),
        }));
      }
    } catch (error) {
      console.error('Error retrying failed message:', error);
      
      // Mark as failed again
      set((state: any) => ({
        messages: state.messages.map((msg: Message) =>
          msg.id === messageId
            ? { ...msg, status: 'failed' as MessageStatus, syncStatus: 'failed' }
            : msg
        ),
      }));
    }
  },

  // Delete message for current user only
  deleteMessageForMe: async (chatId: string, messageId: string, userId: string) => {
    try {
      await MessageService.deleteMessageForMe(chatId, messageId, userId);
      
      // Update in SQLite
      await SQLiteService.deleteMessage(messageId, userId);
      
      // Update in state
      const { messages } = get();
      const updatedMessages = messages.map((msg: Message) => 
        msg.id === messageId 
          ? { ...msg, deletedFor: [...(msg.deletedFor || []), userId] }
          : msg
      );
      set({ messages: updatedMessages });
    } catch (error) {
      console.error('Error deleting message for me:', error);
      throw error;
    }
  },

  // Delete message for everyone
  deleteMessageForEveryone: async (chatId: string, messageId: string) => {
    try {
      await MessageService.deleteMessageForEveryone(chatId, messageId);
      
      // Update in SQLite (non-blocking)
      SQLiteService.getMessageById(messageId).then(messageRow => {
        if (messageRow) {
          const updatedRow = { 
            ...messageRow, 
            deletedForEveryone: 1, // SQLite uses 1 for true
          };
          SQLiteService.saveMessage(updatedRow).catch(() => {});
        }
      }).catch(() => {});
      
      // Update in state
      const { messages } = get();
      const updatedMessages = messages.map((msg: Message) => 
        msg.id === messageId 
          ? { ...msg, deletedForEveryone: true, deletedAt: Date.now() }
          : msg
      );
      set({ messages: updatedMessages });
    } catch (error) {
      console.error('Error deleting message for everyone:', error);
      throw error;
    }
  },

  // Add reaction to a message
  addReaction: async (chatId: string, messageId: string, emoji: string, userId: string) => {
    try {
      await MessageService.addReaction(chatId, messageId, emoji, userId);
      
      // Update in SQLite
      const messageRow = await SQLiteService.getMessageById(messageId);
      if (messageRow) {
        const reactions = messageRow.reactions ? JSON.parse(messageRow.reactions) : {};
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        if (!reactions[emoji].includes(userId)) {
          reactions[emoji].push(userId);
        }
        await SQLiteService.updateReactions(messageId, reactions);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  },

  // Remove reaction from a message
  removeReaction: async (chatId: string, messageId: string, emoji: string, userId: string) => {
    try {
      await MessageService.removeReaction(chatId, messageId, emoji, userId);
      
      // Update in SQLite
      const messageRow = await SQLiteService.getMessageById(messageId);
      if (messageRow) {
        const reactions = messageRow.reactions ? JSON.parse(messageRow.reactions) : {};
        if (reactions[emoji]) {
          reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        }
        await SQLiteService.updateReactions(messageId, reactions);
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  },

  // Mark chat as read (updates all unread messages to "read" status)
  markChatAsRead: async (chatId: string, userId: string) => {
    try {
      const { messages, chats } = get();
      
      // IMMEDIATELY update local chat state to reset unread count (optimistic update)
      const updatedChatsOptimistic = chats.map((chat: any) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            unreadCount: 0,
          };
        }
        return chat;
      });
      set({ chats: updatedChatsOptimistic });
      
      // Get messages for this chat only and sort by timestamp to get the ACTUAL last message
      const chatMessages = messages.filter((m: Message) => m.chatId === chatId);
      const sortedMessages = [...chatMessages].sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp as any).getTime?.() || 0;
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp as any).getTime?.() || 0;
        return timeB - timeA; // Newest first
      });
      const lastMessage = sortedMessages[0]; // Most recent message
      
      if (lastMessage) {
        await ChatService.markChatAsRead(chatId, userId, lastMessage.id);
      }
      
      // Mark all messages from other users as "read"
      const unreadMessages = chatMessages.filter(
        (msg: Message) => msg.senderId !== userId && (msg.status === 'delivered' || msg.status === 'sent')
      );
      
      for (const msg of unreadMessages) {
        try {
          await MessageService.updateMessageStatus(chatId, msg.id, 'read');
          // Update in local state
          const updatedMessages = get().messages.map((m: Message) =>
            m.id === msg.id ? { ...m, status: 'read' as MessageStatus } : m
          );
          set({ messages: updatedMessages });
        } catch (error) {
          console.error('Error marking message as read:', msg.id, error);
        }
      }
      
      // If the last message was from someone else, update chat's lastMessageStatus to "read"
      if (lastMessage && lastMessage.senderId !== userId) {
        const messageTimestamp = typeof lastMessage.timestamp === 'number' 
          ? lastMessage.timestamp 
          : (lastMessage.timestamp as any)?.getTime?.() || Date.now();
        await ChatService.updateChatLastMessage(
          chatId,
          lastMessage.text,
          lastMessage.senderId,
          'read',
          messageTimestamp
        );
      }
      
      // Update chat list with final status
      const updatedChats = chats.map((chat: any) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            unreadCount: 0,
            // Update status to 'read' if last message was from someone else
            lastMessageStatus: (lastMessage && lastMessage.senderId !== userId) ? 'read' as any : chat.lastMessageStatus,
          };
        }
        return chat;
      });
      set({ chats: updatedChats });
      
      // Update in SQLite (non-blocking)
      SQLiteService.getChatById(chatId).then(chatRow => {
        if (chatRow) {
          SQLiteService.saveChat({
            ...chatRow,
            unreadCount: 0,
            lastMessageStatus: (lastMessage && lastMessage.senderId !== userId) ? 'read' : chatRow.lastMessageStatus,
          }).catch(() => {});
        }
      }).catch(() => {});
      
      // Chat marked as read
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  },
});

