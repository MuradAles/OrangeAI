/**
 * ChatStore - State management for chats and messages
 * 
 * Handles:
 * - Active chats list
 * - Current chat selection
 * - Messages for current chat
 * - Real-time listeners
 * - Optimistic updates
 * - Sync with SQLite
 */

import { SQLiteService } from '@/database/SQLiteService';
import { ChatService, MessageService, UserService } from '@/services/firebase';
import { Chat, Message, MessageStatus, MessageSyncStatus, MessageType, User } from '@/shared/types';
import type { Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';

interface ChatState {
  // State
  chats: Chat[];
  currentChatId: string | null;
  activeChatId: string | null; // Currently open/viewing chat (for notifications)
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  
  // User profiles cache (for displaying names/avatars in chat list)
  userProfiles: Map<string, User>;
  
  // Unsubscribe functions for cleanup
  chatsUnsubscribe: Unsubscribe | null;
  messagesUnsubscribe: Unsubscribe | null;

  // Actions - Chats
  loadChatsFromSQLite: (userId: string) => Promise<void>;
  subscribeToChats: (userId: string) => void;
  selectChat: (chatId: string) => void;
  setActiveChatId: (chatId: string | null) => void;
  createChat: (userId1: string, userId2: string) => Promise<string>;
  
  // Actions - User Profiles
  loadUserProfile: (userId: string) => Promise<User | null>;
  getUserProfile: (userId: string) => User | null;
  
  // Actions - Messages
  loadMessagesFromSQLite: (chatId: string) => Promise<void>;
  subscribeToMessages: (chatId: string, currentUserId?: string) => void;
  sendMessage: (chatId: string, senderId: string, text: string) => Promise<void>;
  sendImageMessage: (chatId: string, senderId: string, imageUri: string, caption?: string) => Promise<void>;
  updateMessageStatus: (chatId: string, messageId: string, status: MessageStatus) => Promise<void>;
  deleteMessageForMe: (chatId: string, messageId: string, userId: string) => Promise<void>;
  deleteMessageForEveryone: (chatId: string, messageId: string) => Promise<void>;
  addReaction: (chatId: string, messageId: string, emoji: string, userId: string) => Promise<void>;
  removeReaction: (chatId: string, messageId: string, emoji: string, userId: string) => Promise<void>;
  markChatAsRead: (chatId: string, userId: string) => Promise<void>;
  blockUserAndDeleteChat: (chatId: string) => Promise<void>;

  // Cleanup
  unsubscribeAll: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial State
  chats: [],
  currentChatId: null,
  activeChatId: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  error: null,
  userProfiles: new Map(),
  chatsUnsubscribe: null,
  messagesUnsubscribe: null,

  // Load chats from SQLite (instant, for initial display)
  loadChatsFromSQLite: async (userId: string) => {
    try {
      set({ isLoadingChats: true, error: null });
      const chatRows = await SQLiteService.getChats(userId);
      
      // Helper function to safely parse participants
      const parseParticipants = (participantsStr: string | any): string[] => {
        if (Array.isArray(participantsStr)) {
          return participantsStr;
        }
        
        if (typeof participantsStr !== 'string') {
          return [];
        }
        
        try {
          // Try normal JSON parse first
          return JSON.parse(participantsStr);
        } catch {
          // If that fails, try to fix malformed JSON like "[id1, id2]"
          try {
            // Remove brackets and split by comma
            const cleaned = participantsStr.replace(/[\[\]]/g, '').trim();
            if (cleaned) {
              return cleaned.split(',').map(id => id.trim()).filter(id => id.length > 0);
            }
          } catch {
            console.error('Failed to fix malformed participants:', participantsStr);
          }
        }
        
        return [];
      };
      
      // Helper function to safely parse timestamp (returns number, not Date)
      const parseTimestamp = (dateValue: any, allowZero: boolean = false): number => {
        if (!dateValue || dateValue === '{}' || dateValue === 0 || dateValue === null) {
          return allowZero ? 0 : Date.now(); // Return 0 for lastMessageTime, current time for createdAt
        }
        
        // If it's already a number, return it
        if (typeof dateValue === 'number') {
          return dateValue;
        }
        
        const date = new Date(dateValue);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return allowZero ? 0 : Date.now(); // Return 0 for lastMessageTime, current time for createdAt
        }
        
        return date.getTime();
      };
      
      // Convert ChatRow to Chat (parse JSON fields)
      const chats: Chat[] = chatRows.map((row) => {
        try {
          const participants = parseParticipants(row.participants);
          
          // Skip chats with invalid participants
          if (participants.length === 0) {
            console.warn('Skipping chat with no valid participants:', row.id);
            return null;
          }
          
          return {
            id: row.id,
            type: row.type as 'one-on-one' | 'group',
            participants,
            lastMessageText: row.lastMessageText,
            lastMessageTime: parseTimestamp(row.lastMessageTime, true), // Allow 0 for no messages
            lastMessageSenderId: row.lastMessageSenderId,
            lastMessageStatus: row.lastMessageStatus as any,
            unreadCount: row.unreadCount || 0, // Load unread count from SQLite
            createdAt: parseTimestamp(row.createdAt, false), // Don't allow 0 for createdAt
            createdBy: row.createdBy,
            groupName: row.groupName || undefined,
            groupIcon: row.groupIcon || undefined,
            groupDescription: row.groupDescription || undefined,
            groupAdminId: row.groupAdminId || undefined,
            inviteCode: row.inviteCode || undefined,
          };
        } catch (parseError) {
          console.error('Error parsing chat row:', row.id, parseError);
          return null;
        }
      }).filter((chat) => chat !== null) as Chat[]; // Filter out invalid chats
      
      set({ chats, isLoadingChats: false });
      
      // Load user profiles for all chat participants
      const loadUserProfile = get().loadUserProfile;
      const profileLoadPromises: Promise<any>[] = [];
      for (const chat of chats) {
        for (const participantId of chat.participants) {
          if (participantId !== userId) {
            profileLoadPromises.push(loadUserProfile(participantId));
          }
        }
      }
      // Wait for all profiles to load
      await Promise.all(profileLoadPromises).catch(error => {
        console.warn('Some profiles failed to load:', error);
      });
    } catch (error) {
      console.error('Error loading chats from SQLite:', error);
      set({ error: (error as Error).message, isLoadingChats: false });
    }
  },

  // Subscribe to real-time chat updates
  subscribeToChats: (userId: string) => {
    // Unsubscribe from previous listener if exists
    const { chatsUnsubscribe } = get();
    if (chatsUnsubscribe) {
      chatsUnsubscribe();
    }

    // Keep track of previous chat states to detect new messages
    let previousChats = new Map<string, { lastMessageTime: number, lastMessageText: string }>();

    const unsubscribe = ChatService.subscribeToChats(
      userId,
      async (chats) => {
        console.log('💬 Chat updates received, checking for new messages...');
        
        // Load unread counts for each chat BEFORE updating state
        try {
          // Longer delay to ensure participant documents are updated
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Load unread counts in parallel and create new chat objects
          const chatsWithUnreadCounts = await Promise.all(
            chats.map(async (chat) => {
              // Try multiple times to get the unread count (in case of timing issues)
              let participantData = await ChatService.getParticipant(chat.id, userId);
              let unreadCount = participantData?.unreadCount || 0;
              
              // If we got 0 but the last message is not from us, try again after a delay
              if (unreadCount === 0 && chat.lastMessageSenderId !== userId) {
                await new Promise(resolve => setTimeout(resolve, 200));
                participantData = await ChatService.getParticipant(chat.id, userId);
                unreadCount = participantData?.unreadCount || 0;
              }
              
              if (unreadCount > 0) {
                console.log(`🔴 Chat "${chat.lastMessageText?.substring(0, 30)}..." has ${unreadCount} UNREAD messages!`);
              }
              
              // 🔔 CHECK FOR NEW MESSAGES: Compare with previous state
              const previousChat = previousChats.get(chat.id);
              const isNewMessage = previousChat && (
                chat.lastMessageTime > previousChat.lastMessageTime ||
                chat.lastMessageText !== previousChat.lastMessageText
              );
              
              // If new message AND it's not from current user AND not currently viewing this chat
              if (isNewMessage && 
                  chat.lastMessageSenderId !== userId && 
                  get().activeChatId !== chat.id) {
                
                console.log('🆕 NEW MESSAGE detected in chat list!', {
                  chatId: chat.id,
                  from: chat.lastMessageSenderId,
                  text: chat.lastMessageText?.substring(0, 50),
                  activeChatId: get().activeChatId,
                });
                
                // Trigger notification
                try {
                  const { triggerInAppNotification } = await import('@/services/NotificationHelper');
                  
                  // Get sender profile (may already be cached)
                  let sender = get().getUserProfile(chat.lastMessageSenderId);
                  
                  // If not cached, try to load it
                  if (!sender) {
                    sender = await get().loadUserProfile(chat.lastMessageSenderId);
                  }
                  
                  triggerInAppNotification({
                    id: `${chat.id}_${chat.lastMessageTime}`,
                    senderName: sender?.displayName || chat.groupName || 'Someone',
                    messageText: chat.lastMessageText || '',
                    senderAvatar: sender?.profilePictureUrl || chat.groupIcon,
                    chatId: chat.id,
                    isImage: false, // We don't know from chat list, assume text
                  });
                  
                  console.log('✅ Notification triggered from chat list update');
                } catch (error) {
                  console.error('❌ Error triggering notification from chat list:', error);
                }
              }
              
              // Update previous chats map
              previousChats.set(chat.id, {
                lastMessageTime: chat.lastMessageTime,
                lastMessageText: chat.lastMessageText || '',
              });
              
              // Return new chat object with unread count
              return {
                ...chat,
                unreadCount,
              };
            })
          );
          
          console.log(`📊 Loaded ${chatsWithUnreadCounts.filter(c => c.unreadCount > 0).length} chats with unread messages`);
          
          // Now update state with new chat objects including unread counts
          set({ chats: chatsWithUnreadCounts }); // New array with new objects
          
          // Load user profiles for all chat participants (wait for them to load)
          const loadUserProfile = get().loadUserProfile;
          const profileLoadPromises: Promise<any>[] = [];
          for (const chat of chatsWithUnreadCounts) {
            for (const participantId of chat.participants) {
              if (participantId !== userId) {
                profileLoadPromises.push(loadUserProfile(participantId));
              }
            }
          }
          // Wait for all profiles to load before continuing
          await Promise.all(profileLoadPromises);
          
          // Sync to SQLite (background task)
          for (const chat of chatsWithUnreadCounts) {
            const chatRow = {
              id: chat.id,
              type: chat.type,
              participants: JSON.stringify(chat.participants), // ← Stringify array
              lastMessageText: chat.lastMessageText,
              lastMessageTime: typeof chat.lastMessageTime === 'number' 
                ? chat.lastMessageTime 
                : (chat.lastMessageTime instanceof Date ? chat.lastMessageTime.getTime() : 0),
              lastMessageSenderId: chat.lastMessageSenderId,
              lastMessageStatus: chat.lastMessageStatus || null,
              unreadCount: chat.unreadCount || 0,
              groupName: chat.groupName || null,
              groupIcon: chat.groupIcon || null,
              groupDescription: chat.groupDescription || null,
              groupAdminId: chat.groupAdminId || null,
              inviteCode: chat.inviteCode || null,
              createdAt: typeof chat.createdAt === 'number' 
                ? chat.createdAt 
                : (chat.createdAt instanceof Date ? chat.createdAt.getTime() : 0),
              createdBy: chat.createdBy,
            };
            await SQLiteService.saveChat(chatRow);
          }
        } catch (error) {
          console.error('Error loading unread counts or syncing to SQLite:', error);
          // Still update state even if some operations fail (without unread counts)
          set({ chats: chats.map(chat => ({ ...chat, unreadCount: 0 })) });
        }
      },
      (error) => {
        console.error('Error in chat subscription:', error);
        set({ error: error.message });
      }
    );

    set({ chatsUnsubscribe: unsubscribe });
  },

  // Select a chat to view
  selectChat: (chatId: string) => {
    set({ currentChatId: chatId, messages: [] });
  },

  // Set active chat ID (when chat is actually being viewed)
  setActiveChatId: (chatId: string | null) => {
    set({ activeChatId: chatId });
  },

  // Create a new one-on-one chat
  createChat: async (userId1: string, userId2: string) => {
    try {
      const chatId = await ChatService.createChat(userId1, userId2);
      return chatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Load messages from SQLite (instant, for initial display)
  loadMessagesFromSQLite: async (chatId: string) => {
    try {
      set({ isLoadingMessages: true, error: null });
      const messageRows = await SQLiteService.getMessages(chatId, 50);
      
      // Convert MessageRow[] to Message[]
      const messages: Message[] = messageRows.map(row => ({
        id: row.id,
        chatId: row.chatId,
        senderId: row.senderId,
        text: row.text,
        timestamp: row.timestamp, // Already a number
        status: row.status as MessageStatus,
        type: row.type as MessageType,
        imageUrl: row.imageUrl,
        thumbnailUrl: row.thumbnailUrl,
        caption: row.caption,
        reactions: row.reactions ? JSON.parse(row.reactions) : {},
        deletedFor: [], // Not stored separately in SQLite
        deletedForEveryone: row.deletedForEveryone === 1,
        deletedAt: null, // Not stored in SQLite
        syncStatus: row.syncStatus as MessageSyncStatus,
      }));
      
      set({ messages, isLoadingMessages: false });
    } catch (error) {
      console.error('Error loading messages from SQLite:', error);
      set({ error: (error as Error).message, isLoadingMessages: false });
    }
  },

  // Subscribe to real-time message updates  
  // PRD: This should only listen for NEW messages, not load all historical messages
  subscribeToMessages: (chatId: string, currentUserId?: string) => {
    // Unsubscribe from previous listener if exists
    const { messagesUnsubscribe } = get();
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
    }

    const unsubscribe = MessageService.subscribeToMessages(
      chatId,
      async (newMessages) => {
        // PRD Pattern: Merge new Firestore messages with existing state (from SQLite)
        // Don't replace everything - just add/update new messages
        
        const currentMessages = get().messages;
        const currentMessageIds = new Set(currentMessages.map(m => m.id));
        
        // Separate Firestore messages into new and updates
        const messagesToAdd: Message[] = [];
        const messagesToUpdate: Message[] = [];
        
        for (const msg of newMessages) {
          if (currentMessageIds.has(msg.id)) {
            // Update existing message (status change, etc.)
            const oldMessage = currentMessages.find(m => m.id === msg.id);
            if (oldMessage && oldMessage.status !== msg.status) {
              console.log(`📝 Message status CHANGED!`);
              console.log(`   Message: "${msg.text.substring(0, 30)}..."`);
              console.log(`   Old status: ${oldMessage.status} → New status: ${msg.status}`);
              if (msg.status === 'read') {
                console.log(`   🎉 YOUR MESSAGE WAS READ!`);
              }
            }
            messagesToUpdate.push(msg);
          } else {
            // New message (not in current state)
            messagesToAdd.push(msg);
            console.log(`📨 NEW MESSAGE RECEIVED!`);
            console.log(`   From: ${msg.senderId === currentUserId ? 'YOU' : msg.senderId}`);
            console.log(`   Text: "${msg.text}"`);
            console.log(`   Status: ${msg.status}`);
            console.log(`   Time: ${new Date(msg.timestamp).toLocaleTimeString()}`);
            
            // Mark as "delivered" if it's not our own message and status is still "sent"
            if (currentUserId && msg.senderId !== currentUserId && msg.status === 'sent') {
              try {
                await MessageService.updateMessageStatus(chatId, msg.id, 'delivered');
                msg.status = 'delivered'; // Update local copy
                console.log(`   ✅ Marked as DELIVERED`);
              } catch (error) {
                console.error('Error marking message as delivered:', error);
              }
            }

            // 🔔 Trigger in-app notification if message is from someone else
            if (currentUserId && msg.senderId !== currentUserId) {
              try {
                const { triggerInAppNotification } = await import('@/services/NotificationHelper');
                const sender = get().getUserProfile(msg.senderId);
                
                // Trigger direct in-app notification (works on emulator!)
                triggerInAppNotification({
                  id: msg.id,
                  senderName: sender?.displayName || 'Someone',
                  messageText: msg.text || '',
                  senderAvatar: sender?.profilePictureUrl,
                  chatId,
                  isImage: msg.type === 'image',
                });
                console.log(`   🔔 In-app notification triggered`);
              } catch (error) {
                console.error('   ❌ Error triggering notification:', error);
              }
            }
          }
        }
        
        // Merge: Update existing messages, add new ones
        let updatedMessages = currentMessages.map(existing => {
          const update = messagesToUpdate.find(m => m.id === existing.id);
          return update || existing;
        });
        
        // Add new messages
        updatedMessages = [...updatedMessages, ...messagesToAdd];
        
        set({ messages: updatedMessages });
        
        // Sync new messages to SQLite for offline access
        try {
          for (const message of newMessages) {
            const messageRow: any = {
              id: message.id,
              chatId: message.chatId,
              senderId: message.senderId,
              text: message.text,
              timestamp: typeof message.timestamp === 'number' 
                ? message.timestamp 
                : (message.timestamp as any).getTime?.() || Date.now(),
              status: message.status,
              type: message.type,
              imageUrl: message.imageUrl,
              thumbnailUrl: message.thumbnailUrl,
              caption: message.caption,
              reactions: JSON.stringify(message.reactions || {}),
              deletedForMe: 0,
              deletedForEveryone: message.deletedForEveryone ? 1 : 0,
              syncStatus: 'synced',
            };
            await SQLiteService.saveMessage(messageRow);
          }
        } catch (error) {
          console.error('Error syncing messages to SQLite:', error);
        }
      },
      (error) => {
        console.error('Error in message subscription:', error);
        set({ error: error.message });
      }
    );

    set({ messagesUnsubscribe: unsubscribe });
  },

  // Send a new message (optimistic update)
  sendMessage: async (chatId: string, senderId: string, text: string) => {
    try {
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
        syncStatus: optimisticMessage.syncStatus,
      };
      await SQLiteService.saveMessage(messageRow);

      // Upload to Firestore in background with the same ID
      try {
        await MessageService.sendMessage(chatId, senderId, text, messageId);
        
        // FIRST: Increment unread count for other participants (before updating chat document)
        const { chats } = get();
        const currentChat = chats.find(c => c.id === chatId);
        if (currentChat) {
          const otherParticipants = currentChat.participants.filter(id => id !== senderId);
          console.log(`📊 Incrementing unread count for participants:`, otherParticipants);
          for (const participantId of otherParticipants) {
            try {
              await ChatService.incrementUnreadCount(chatId, participantId);
              console.log(`✅ Incremented unread count for ${participantId} in chat ${chatId}`);
            } catch (error) {
              console.error('❌ Error incrementing unread count:', error);
            }
          }
        } else {
          console.warn(`⚠️ Chat ${chatId} not found in local state when trying to increment unread count`);
        }
        
        // THEN: Update last message in chat with 'sent' status and the message timestamp
        // This triggers the chat subscription, which will now fetch the updated unread count
        await ChatService.updateChatLastMessage(chatId, text, senderId, 'sent', optimisticMessage.timestamp);
        
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
        set((state) => ({
          messages: state.messages.map(msg => 
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
        await SQLiteService.saveMessage(failedRow);
        
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
      await SQLiteService.saveMessage(messageRow);

      // Upload image to Storage in background
      try {
        console.log('📸 Uploading image to Firebase Storage...');
        const { imageUrl, thumbnailUrl } = await StorageService.uploadMessageImage(
          chatId,
          messageId,
          imageUri
        );
        console.log('✅ Image uploaded successfully');

        // Send message to Firestore with real image URLs
        await MessageService.sendMessage(chatId, senderId, '', messageId, {
          type: 'image',
          imageUrl,
          thumbnailUrl,
          caption: caption || null,
        });
        
        // Increment unread count for other participants
        const { chats } = get();
        const currentChat = chats.find(c => c.id === chatId);
        if (currentChat) {
          const otherParticipants = currentChat.participants.filter(id => id !== senderId);
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
        set((state) => ({
          messages: state.messages.map(msg => 
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
        await SQLiteService.saveMessage(syncedRow);
        
      } catch (uploadError) {
        console.error('❌ Error uploading image:', uploadError);
        
        // Mark as failed
        const failedMessage: Message = {
          ...optimisticMessage,
          status: 'sending',
          syncStatus: 'failed',
        };
        
        // Update state
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === messageId ? failedMessage : msg
          ),
        }));
        
        // Update SQLite
        const failedRow: any = {
          ...messageRow,
          syncStatus: 'failed',
        };
        await SQLiteService.saveMessage(failedRow);
        
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
      
      // Update in SQLite
      const message = await SQLiteService.getMessageById(messageId);
      if (message) {
        const updatedMessage = { ...message, status };
        await SQLiteService.saveMessage(updatedMessage);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
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
      const updatedMessages = messages.map(msg => 
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
      
      // Update in SQLite
      const messageRow = await SQLiteService.getMessageById(messageId);
      if (messageRow) {
        const updatedRow = { 
          ...messageRow, 
          deletedForEveryone: 1, // SQLite uses 1 for true
        };
        await SQLiteService.saveMessage(updatedRow);
      }
      
      // Update in state
      const { messages } = get();
      const updatedMessages = messages.map(msg => 
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
      
      // Get messages for this chat only and sort by timestamp to get the ACTUAL last message
      const chatMessages = messages.filter(m => m.chatId === chatId);
      const sortedMessages = [...chatMessages].sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp as any).getTime?.() || 0;
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp as any).getTime?.() || 0;
        return timeB - timeA; // Newest first
      });
      const lastMessage = sortedMessages[0]; // Most recent message
      
      console.log(`📖 Marking chat as read. Last message: "${lastMessage?.text}" from ${lastMessage?.senderId === userId ? 'YOU' : 'OTHER'}`);
      
      if (lastMessage) {
        await ChatService.markChatAsRead(chatId, userId, lastMessage.id);
      }
      
      // Mark all messages from other users as "read"
      const unreadMessages = chatMessages.filter(
        msg => msg.senderId !== userId && (msg.status === 'delivered' || msg.status === 'sent')
      );
      
      console.log(`📖 Marking ${unreadMessages.length} messages as read`);
      
      for (const msg of unreadMessages) {
        try {
          await MessageService.updateMessageStatus(chatId, msg.id, 'read');
          console.log(`   ✅ Marked as read: "${msg.text.substring(0, 30)}..."`);
          // Update in local state
          const updatedMessages = get().messages.map(m =>
            m.id === msg.id ? { ...m, status: 'read' as MessageStatus } : m
          );
          set({ messages: updatedMessages });
        } catch (error) {
          console.error('Error marking message as read:', msg.id, error);
        }
      }
      
      // If the last message was from someone else, update chat's lastMessageStatus to "read"
      if (lastMessage && lastMessage.senderId !== userId) {
        console.log(`🔄 Updating chat lastMessageStatus to "read"`);
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
      
      // Update chat list to reset unread count to 0 and update status
      const updatedChats = chats.map(chat => {
        if (chat.id === chatId) {
          console.log(`🔄 Updating chat list: unreadCount 0, status: ${lastMessage?.senderId !== userId ? 'read' : chat.lastMessageStatus}`);
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
      
      // Update in SQLite
      const chatRow = await SQLiteService.getChatById(chatId);
      if (chatRow) {
        await SQLiteService.saveChat({
          ...chatRow,
          unreadCount: 0,
          lastMessageStatus: (lastMessage && lastMessage.senderId !== userId) ? 'read' : chatRow.lastMessageStatus,
        });
      }
      
      console.log(`✅ Chat marked as read successfully`);
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  },

  // Block user and delete chat completely (hard delete from Firebase and SQLite)
  blockUserAndDeleteChat: async (chatId: string) => {
    try {
      console.log(`🚫 Blocking user and deleting chat: ${chatId}`);
      
      // Delete chat from Firestore (including all messages)
      await ChatService.deleteChat(chatId);
      
      // Delete all messages from SQLite
      await SQLiteService.deleteMessagesByChatId(chatId);
      
      // Delete chat from SQLite
      await SQLiteService.deleteChatById(chatId);
      
      // Remove from state
      const { chats, messages } = get();
      set({
        chats: chats.filter(c => c.id !== chatId),
        messages: messages.filter(m => m.chatId !== chatId),
      });
      
      console.log(`✅ Chat ${chatId} blocked and deleted successfully`);
    } catch (error) {
      console.error('Error blocking user and deleting chat:', error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Load user profile from SQLite first, then Firestore if not found
  loadUserProfile: async (userId: string) => {
    const { userProfiles } = get();
    
    // Check if already cached in memory
    if (userProfiles.has(userId)) {
      return userProfiles.get(userId)!;
    }
    
    try {
      // Try loading from SQLite first (instant, offline support)
      const userRow = await SQLiteService.getUserById(userId);
      if (userRow) {
        const profile: User = {
          id: userRow.id,
          username: userRow.username,
          displayName: userRow.displayName,
          email: '', // Not stored in SQLite
          profilePictureUrl: userRow.profilePictureUrl || null,
          phoneNumber: null, // Not stored in SQLite
          phoneNumberVisible: false, // Not stored in SQLite
          bio: '', // Not stored in SQLite
          isOnline: userRow.isOnline === 1,
          lastSeen: userRow.lastSeen || Date.now(),
          createdAt: userRow.createdAt,
        };
        
        // Cache in memory
        const newProfiles = new Map(userProfiles);
        newProfiles.set(userId, profile);
        set({ userProfiles: newProfiles });
        
        // Fetch from Firestore in background to update
        UserService.getProfile(userId).then(async (firestoreProfile) => {
          if (firestoreProfile) {
            // Update cache
            const updatedProfiles = new Map(get().userProfiles);
            updatedProfiles.set(userId, firestoreProfile);
            set({ userProfiles: updatedProfiles });
            
            // Save to SQLite (convert Date to timestamp)
            await SQLiteService.saveUser({
              id: firestoreProfile.id,
              username: firestoreProfile.username,
              displayName: firestoreProfile.displayName,
              profilePictureUrl: firestoreProfile.profilePictureUrl || null,
              isOnline: firestoreProfile.isOnline ? 1 : 0,
              lastSeen: typeof firestoreProfile.lastSeen === 'number' 
                ? firestoreProfile.lastSeen 
                : (firestoreProfile.lastSeen as any)?.getTime?.() || Date.now(),
              createdAt: typeof firestoreProfile.createdAt === 'number' 
                ? firestoreProfile.createdAt 
                : (firestoreProfile.createdAt as any).getTime?.() || Date.now(),
            });
          }
        }).catch(err => console.error('Error updating profile from Firestore:', err));
        
        return profile;
      }
      
      // Not in SQLite, load from Firestore
      const profile = await UserService.getProfile(userId);
      if (profile) {
        // Cache in memory
        const newProfiles = new Map(userProfiles);
        newProfiles.set(userId, profile);
        set({ userProfiles: newProfiles });
        
        // Save to SQLite for offline access (convert Date to timestamp)
        await SQLiteService.saveUser({
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          profilePictureUrl: profile.profilePictureUrl || null,
          isOnline: profile.isOnline ? 1 : 0,
          lastSeen: typeof profile.lastSeen === 'number' 
            ? profile.lastSeen 
            : (profile.lastSeen as any)?.getTime?.() || Date.now(),
          createdAt: typeof profile.createdAt === 'number' 
            ? profile.createdAt 
            : (profile.createdAt as any).getTime?.() || Date.now(),
        });
        
        return profile;
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  },

  // Get cached user profile
  getUserProfile: (userId: string) => {
    const { userProfiles } = get();
    return userProfiles.get(userId) || null;
  },

  // Unsubscribe from all listeners
  unsubscribeAll: () => {
    const { chatsUnsubscribe, messagesUnsubscribe } = get();
    if (chatsUnsubscribe) {
      chatsUnsubscribe();
    }
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
    }
    set({ chatsUnsubscribe: null, messagesUnsubscribe: null });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

