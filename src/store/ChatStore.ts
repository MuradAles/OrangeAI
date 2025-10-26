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
import { ChatService, MessageService } from '@/services/firebase';
import { Chat, Message, MessageStatus, MessageSyncStatus, MessageType, User } from '@/shared/types';
import type { Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';
import { createMessageActions } from './ChatStore.messages';
import { createProfileActions } from './ChatStore.profiles';

interface ChatState {
  // State
  chats: Chat[];
  currentChatId: string | null;
  activeChatId: string | null; // Currently open/viewing chat (for notifications)
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  chatsVersion: number; // Version counter to force re-renders when chats update
  
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
  refreshUserProfile: (userId: string) => Promise<void>;
  
  // Actions - Messages
  loadMessagesFromSQLite: (chatId: string) => Promise<void>;
  subscribeToMessages: (chatId: string, currentUserId?: string) => void;
  sendMessage: (chatId: string, senderId: string, text: string, translationMetadata?: {
    originalText?: string;
    originalLanguage?: string;
    translatedTo?: string;
    sentAsTranslation?: boolean;
  }) => Promise<void>;
  sendImageMessage: (chatId: string, senderId: string, imageUri: string, caption?: string) => Promise<void>;
  updateMessageStatus: (chatId: string, messageId: string, status: MessageStatus) => Promise<void>;
  retryFailedMessage: (chatId: string, messageId: string) => Promise<void>;
  addReaction: (chatId: string, messageId: string, emoji: string, userId: string) => Promise<void>;
  removeReaction: (chatId: string, messageId: string, emoji: string, userId: string) => Promise<void>;
  markChatAsRead: (chatId: string, userId: string) => Promise<void>;

  // Cleanup
  unsubscribeAll: () => void;
  clearError: () => void;
  removeChatLocally: (chatId: string, userId: string) => Promise<void>;
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
  chatsVersion: 0,
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
        // Silently process chat updates
        
        // Filter out chats where user is no longer a participant (removed from group)
        const validChats = chats.filter(chat => chat.participants.includes(userId));
        
        // If any chats were filtered out, clean them from SQLite
        const removedChats = chats.filter(chat => !chat.participants.includes(userId));
        if (removedChats.length > 0) {
          for (const chat of removedChats) {
            try {
              await SQLiteService.deleteMessagesByChatId(chat.id);
              await SQLiteService.deleteChatById(chat.id);
            } catch (error) {
              console.error(`Failed to clean chat ${chat.id}:`, error);
            }
          }
        }
        
        // Load unread counts for each VALID chat BEFORE updating state
        try {
          // Longer delay to ensure participant documents are updated
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Get active chat ID to check if user is viewing a chat
          const activeChatId = get().activeChatId;
          
          // Load unread counts in parallel and create new chat objects
          const chatsWithUnreadCounts = await Promise.all(
            validChats.map(async (chat) => {
              // Fetch the actual unread count from Firestore first
              let participantData = await ChatService.getParticipant(chat.id, userId);
              let unreadCount = participantData?.unreadCount || 0;
              
              // If we got 0 but the last message is not from us, try again after a delay
              // (This handles race condition where unread count hasn't been updated yet)
              if (unreadCount === 0 && chat.lastMessageSenderId !== userId) {
                await new Promise(resolve => setTimeout(resolve, 200));
                participantData = await ChatService.getParticipant(chat.id, userId);
                unreadCount = participantData?.unreadCount || 0;
              }
              
              // Check if user is actively viewing this chat or sent the last message
              const isCurrentlyActive = chat.id === activeChatId;
              const lastMessageIsFromUser = chat.lastMessageSenderId === userId;
              
              // Override unreadCount to 0 ONLY if:
              // 1. User is CURRENTLY actively viewing this chat (real-time)
              // 2. Last message was sent BY this user (obviously no unread for sender)
              if (isCurrentlyActive || lastMessageIsFromUser) {
                unreadCount = 0;
              }
              
              // Fetch the REAL status from the actual last message document
              // This is more accurate than chat.lastMessageStatus which can be stale
              let realStatus = chat.lastMessageStatus; // Fallback to chat status
              try {
                const { MessageService } = await import('@/services/firebase');
                const lastMessageStatus = await MessageService.getLastMessageStatus(chat.id);
                if (lastMessageStatus) {
                  realStatus = lastMessageStatus;
                }
              } catch (error) {
                console.error('Error fetching real message status:', error);
              }
              
              // Silently track unread count
              
              // 🔔 CHECK FOR NEW MESSAGES: Compare with previous state
              const previousChat = previousChats.get(chat.id);
              
              // If this is the first time seeing this chat, initialize previousChats
              // This prevents treating ALL old messages as "new" when user rejoins
              if (!previousChat) {
                previousChats.set(chat.id, {
                  lastMessageTime: chat.lastMessageTime,
                  lastMessageText: chat.lastMessageText || '',
                });
              }
              
              const isNewMessage = previousChat && (
                chat.lastMessageTime > previousChat.lastMessageTime ||
                chat.lastMessageText !== previousChat.lastMessageText
              );
              
              // If new message AND it's not from current user AND not currently viewing this chat
              if (isNewMessage && 
                  chat.lastMessageSenderId !== userId && 
                  get().activeChatId !== chat.id) {
                
                // Check if message was sent AFTER user joined (to avoid notifications for old messages)
                try {
                  const participantData = await ChatService.getParticipant(chat.id, userId);
                  const userJoinedAt = participantData?.joinedAt 
                    ? (typeof participantData.joinedAt === 'number' 
                        ? participantData.joinedAt 
                        : (participantData.joinedAt as any)?.toMillis?.() || 0)
                    : 0;
                  
                  // Only notify if message was sent AFTER user joined
                  // This prevents notifications for old messages when user rejoins group
                  if (userJoinedAt === 0 || chat.lastMessageTime > userJoinedAt) {
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
                      senderAvatar: sender?.profilePictureUrl || chat.groupIcon || undefined,
                      chatId: chat.id,
                      isImage: false, // We don't know from chat list, assume text
                    });
                  } else {
                  }
                } catch (error) {
                  console.error('Error triggering notification from chat list:', error);
                }
              }
              
              // Update previous chats map (only if we checked for new messages)
              if (previousChat) {
                previousChats.set(chat.id, {
                  lastMessageTime: chat.lastMessageTime,
                  lastMessageText: chat.lastMessageText || '',
                });
              }
              
              // Return new chat object with unread count and REAL message status
              return {
                ...chat,
                unreadCount,
                lastMessageStatus: realStatus, // Use real status from actual message document
                lastMessageSenderId: chat.lastMessageSenderId || '', // Ensure string not null
              };
            })
          );
          
          // Chats loaded with unread counts
          
          // Now update state with new chat objects including unread counts
          // Increment version to force re-renders
          set(state => ({ 
            chats: chatsWithUnreadCounts,
            chatsVersion: state.chatsVersion + 1
          }));
          
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
          
          // Sync to SQLite (background task, non-blocking)
          for (const chat of chatsWithUnreadCounts) {
            const chatRow = {
              id: chat.id,
              type: chat.type,
              participants: JSON.stringify(chat.participants), // ← Stringify array
              lastMessageText: chat.lastMessageText,
              lastMessageTime: typeof chat.lastMessageTime === 'number' 
                ? chat.lastMessageTime 
                : 0,
              lastMessageSenderId: chat.lastMessageSenderId || '',
              lastMessageStatus: chat.lastMessageStatus || null,
              unreadCount: chat.unreadCount || 0,
              groupName: chat.groupName || null,
              groupIcon: chat.groupIcon || null,
              groupDescription: chat.groupDescription || null,
              groupAdminId: chat.groupAdminId || null,
              inviteCode: chat.inviteCode || null,
              createdAt: typeof chat.createdAt === 'number' 
                ? chat.createdAt 
                : 0,
              createdBy: chat.createdBy || '',
            };
            // Non-blocking save, ignore errors
            SQLiteService.saveChat(chatRow).catch(() => {});
          }
        } catch (error) {
          console.error('Error loading unread counts or syncing to SQLite:', error);
          // Still update state even if some operations fail (without unread counts)
          set(state => ({ 
            chats: validChats.map(chat => ({ ...chat, unreadCount: 0 })),
            chatsVersion: state.chatsVersion + 1
          }));
        }
      },
      (error) => {
        console.error('Error in chat subscription:', error);
        // If permission error, likely user was removed from a group
        // Clean up local state to ensure removed chats don't appear
        if (error.message?.includes?.('permission') || error.message?.includes?.('insufficient')) {
          // Trigger a refresh by clearing error after a short delay
          setTimeout(() => {
            set({ error: null });
          }, 1000);
        } else {
          set({ error: error.message });
        }
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
      
      // Convert MessageRow[] to Message[] and filter out deleted messages
      const messages: Message[] = messageRows
        .filter(row => row.deletedForEveryone !== 1) // Filter out deleted messages
        .map(row => ({
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
          deletedForEveryone: false, // We filtered these out, so they're all false
          deletedAt: null, // Not stored in SQLite
          translations: row.translations ? JSON.parse(row.translations) : {},
          detectedLanguage: row.detectedLanguage || undefined,
          syncStatus: row.syncStatus as MessageSyncStatus,
        }));
      
      set({ messages, isLoadingMessages: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingMessages: false });
    }
  },

  // Subscribe to real-time message updates  
  // PRD: Adaptive loading based on unread count:
  // ≤50 unread: Load all at once
  // 51-500 unread: Batch loading (100, 200, rest)
  // 500+ unread: Load 50 at a time on scroll
  subscribeToMessages: (chatId: string, currentUserId?: string) => {
    // Unsubscribe from previous listener if exists
    const { messagesUnsubscribe } = get();
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
    }

    // Track if this is the initial load (to prevent notifications for old messages)
    let isInitialLoad = true;
    let hasReceivedFirstSnapshot = false; // Track if we've received the very first snapshot

    // PRD: Check unread count to determine how many messages to load
    const currentChat = get().chats.find(c => c.id === chatId);
    const unreadCount = currentChat?.unreadCount || 0;
    
    // Adaptive loading based on PRD
    let initialLoadLimit = 50; // Default
    if (unreadCount <= 50) {
      // Load all at once (or 50 whichever is larger for context)
      initialLoadLimit = Math.max(50, unreadCount + 10);
    } else if (unreadCount <= 500) {
      // First batch: 100 messages
      initialLoadLimit = 100;
      
      // Schedule second batch (200 more) after 2 seconds
      setTimeout(async () => {
        const result = await MessageService.getMessages(chatId, 200);
        const moreMessages = result.messages; // Extract messages array from result
        const currentMsgs = get().messages;
        const currentIds = new Set(currentMsgs.map(m => m.id));
        const newMsgs = moreMessages.filter((m: Message) => !currentIds.has(m.id));
        
        if (newMsgs.length > 0) {
          set({ messages: [...currentMsgs, ...newMsgs] });
          // Save to SQLite (convert Message to MessageRow)
          for (const msg of newMsgs) {
            const msgTimestamp: number = typeof msg.timestamp === 'number' 
              ? msg.timestamp 
              : ((msg.timestamp as any).getTime?.() || Date.now());
            const messageRow = {
              id: msg.id,
              chatId: msg.chatId,
              senderId: msg.senderId,
              text: msg.text,
              timestamp: msgTimestamp,
              status: msg.status,
              type: msg.type,
              imageUrl: msg.imageUrl || null,
              thumbnailUrl: msg.thumbnailUrl || null,
              caption: msg.caption || null,
              reactions: JSON.stringify(msg.reactions || {}),
              deletedForMe: 0,
              deletedForEveryone: msg.deletedForEveryone ? 1 : 0,
              syncStatus: 'synced' as MessageSyncStatus,
              // Translation metadata
              originalText: msg.originalText || null,
              originalLanguage: msg.originalLanguage || null,
              translatedTo: msg.translatedTo || null,
              sentAsTranslation: msg.sentAsTranslation ? 1 : 0,
              // Required fields
              translations: msg.translations ? JSON.stringify(msg.translations) : null,
              detectedLanguage: msg.detectedLanguage || null,
            };
            await SQLiteService.saveMessage(messageRow).catch(console.error);
          }
        }
      }, 2000);
      
      // Schedule third batch (rest) after 5 seconds if needed
      if (unreadCount > 300) {
        setTimeout(async () => {
          const result = await MessageService.getMessages(chatId, 300);
          const moreMessages = result.messages; // Extract messages array from result
          const currentMsgs = get().messages;
          const currentIds = new Set(currentMsgs.map(m => m.id));
          const newMsgs = moreMessages.filter((m: Message) => !currentIds.has(m.id));
          
          if (newMsgs.length > 0) {
            set({ messages: [...currentMsgs, ...newMsgs] });
            // Save to SQLite (convert Message to MessageRow)
            for (const msg of newMsgs) {
              const msgTimestamp: number = typeof msg.timestamp === 'number' 
                ? msg.timestamp 
                : ((msg.timestamp as any).getTime?.() || Date.now());
              const messageRow = {
                id: msg.id,
                chatId: msg.chatId,
                senderId: msg.senderId,
                text: msg.text,
                timestamp: msgTimestamp,
                status: msg.status,
                type: msg.type,
                imageUrl: msg.imageUrl || null,
                thumbnailUrl: msg.thumbnailUrl || null,
                caption: msg.caption || null,
                reactions: JSON.stringify(msg.reactions || {}),
                deletedForMe: 0,
                deletedForEveryone: msg.deletedForEveryone ? 1 : 0,
                syncStatus: 'synced' as MessageSyncStatus,
                // Translation metadata
                originalText: msg.originalText || null,
                originalLanguage: msg.originalLanguage || null,
                translatedTo: msg.translatedTo || null,
                sentAsTranslation: msg.sentAsTranslation ? 1 : 0,
                // Required fields
                translations: msg.translations ? JSON.stringify(msg.translations) : null,
                detectedLanguage: msg.detectedLanguage || null,
              };
              await SQLiteService.saveMessage(messageRow).catch(console.error);
            }
          }
        }, 5000);
      }
    } else {
      // 500+ unread: Load 50 at a time (user will scroll to load more)
      initialLoadLimit = 50;
    }

    // Subscribe with adaptive limit
    const unsubscribe = MessageService.subscribeToMessages(
      chatId,
      async (newMessages) => {
        // PRD Pattern: Merge new Firestore messages with existing state (from SQLite)
        // Don't replace everything - just add/update new messages
        
        const currentMessages = get().messages;
        const currentMessageIds = new Set(currentMessages.map(m => m.id));
        const activeChatId = get().activeChatId; // Check if this chat is actively being viewed
        
        // Separate Firestore messages into new and updates
        const messagesToAdd: Message[] = [];
        const messagesToUpdate: Message[] = [];
        
        for (const msg of newMessages) {
          
          if (currentMessageIds.has(msg.id)) {
            // Update existing message (status change, etc.)
            messagesToUpdate.push(msg);
          } else {
            // New message (not in current state)
            messagesToAdd.push(msg);
            
            // CRITICAL: Only update status for truly NEW messages (not during initial load)
            // This prevents status updates that trigger notifications for all users
            if (!isInitialLoad) {
              // If user is ACTIVELY viewing this chat AND message is from someone else:
              // Mark as "read" immediately (skip delivered)
              if (currentUserId && msg.senderId !== currentUserId && activeChatId === chatId) {
                try {
                  await MessageService.updateMessageStatus(chatId, msg.id, 'read');
                  msg.status = 'read'; // Update local copy
                  
                  // Also update chat to reset unread count
                  await ChatService.markChatAsRead(chatId, currentUserId, msg.id);
                  
                  // Update chat document's lastMessageStatus so chat list shows correct read status
                  const messageTimestamp = typeof msg.timestamp === 'number' 
                    ? msg.timestamp 
                    : (msg.timestamp as any)?.getTime?.() || Date.now();
                  await ChatService.updateChatLastMessage(
                    chatId,
                    msg.text || (msg.type === 'image' ? '📷 Photo' : ''),
                    msg.senderId,
                    'read',
                    messageTimestamp
                  );
                  
                  // IMMEDIATELY update local chat state to reset unread count (don't wait for Firestore listener)
                  const { chats } = get();
                  const updatedChats = chats.map(chat => {
                    if (chat.id === chatId) {
                      return {
                        ...chat,
                        unreadCount: 0,
                        lastMessageStatus: 'read' as any,
                      };
                    }
                    return chat;
                  });
                  set({ chats: updatedChats });
                } catch (error: any) {
                  // Silently ignore permission errors (user was removed from group)
                  if (error?.code !== 'permission-denied' && error?.message?.includes?.('Missing or insufficient permissions') === false) {
                    console.error('Error marking message as read:', error);
                  }
                }
              } 
              // If user is NOT actively viewing this chat but received the message:
              // Mark as "delivered"
              else if (currentUserId && msg.senderId !== currentUserId && msg.status === 'sent') {
                try {
                  await MessageService.updateMessageStatus(chatId, msg.id, 'delivered');
                  msg.status = 'delivered'; // Update local copy
                } catch (error: any) {
                  // Silently ignore permission errors (user was removed from group)
                  if (error?.code !== 'permission-denied' && error?.message?.includes?.('Missing or insufficient permissions') === false) {
                    console.error('Error marking message as delivered:', error);
                  }
                }
              }
            } else {
            }
            
            // 🌐 Auto-translate incoming messages if enabled
            if (currentUserId && msg.senderId !== currentUserId && !isInitialLoad) {
              try {
                // Check if auto-translate is enabled for this chat
                const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                const autoTranslateSetting = await AsyncStorage.getItem(`@auto_translate_${chatId}`);
                const autoTranslateEnabled = autoTranslateSetting ? JSON.parse(autoTranslateSetting) : false;
                
                if (autoTranslateEnabled) {
                  // Get user's preferred language
                  const { useAuthStore } = await import('@/store/AuthStore');
                  const authStore = useAuthStore.getState();
                  const preferredLanguage = authStore.user?.preferredLanguage || 'en';
                  
                  // Get message text
                  const messageText = msg.type === 'text' ? msg.text : msg.caption;
                  
                  if (messageText && messageText.trim().length > 0) {
                    // Trigger translation immediately (async, don't block message display)
                    (async () => {
                      try {
                        const { httpsCallable } = await import('firebase/functions');
                        const { functions } = await import('@/services/firebase/FirebaseConfig');
                        
                        const translateFn = httpsCallable(functions, 'translateMessage');
                        const result: any = await translateFn({
                          messageId: msg.id,
                          chatId: chatId,
                          targetLanguage: preferredLanguage,
                          messageText: messageText,
                        });
                        
                        if (result.data.success && result.data.translated) {
                          // Check if message is already in user's preferred language
                          if (result.data.detectedLanguage === preferredLanguage) {
                            return; // Don't save translation
                          }

                          // Prepare translation data
                          const translationData = {
                            text: result.data.translated,
                            formalityLevel: result.data.formalityLevel,
                            formalityIndicators: result.data.formalityIndicators,
                          };
                          
                          // Save to SQLite
                          const { SQLiteService } = await import('@/database/SQLiteService');
                          await SQLiteService.updateMessageTranslation(
                            chatId,
                            msg.id,
                            preferredLanguage,
                            translationData,
                            result.data.detectedLanguage
                          );
                          
                          // Update message in state
                          const currentState = get();
                          const updatedMessages = currentState.messages.map(m => {
                            if (m.id === msg.id) {
                              return {
                                ...m,
                                translations: {
                                  ...m.translations,
                                  [preferredLanguage]: translationData,
                                },
                                detectedLanguage: result.data.detectedLanguage || m.detectedLanguage,
                              };
                            }
                            return m;
                          });
                          
                          set({ messages: updatedMessages });
                        }
                      } catch (error) {
                        console.error('❌ Auto-translation error:', error);
                        // Silently fail - don't disrupt message display
                      }
                    })(); // Execute immediately
                  }
                }
              } catch (error) {
                console.error('Error checking auto-translate setting:', error);
                // Silently fail
              }
            }

            // 🔔 Trigger in-app notification if message is from someone else AND not actively viewing this chat
            // AND message was sent AFTER user joined (to avoid notifications for old messages when rejoining)
            // AND this is NOT the initial load (to avoid notifications when loading cached messages)
            // AND message is NOT deleted for everyone (to avoid notifications for deletions)
            // AND message is actually NEW (not an update to existing message)
            // AND message is not from current user (to avoid notifications for own actions)
            if (currentUserId && msg.senderId !== currentUserId && activeChatId !== chatId && !isInitialLoad && !currentMessageIds.has(msg.id)) {
              try {
                // Fetch user's CURRENT joinedAt for THIS chat to check if message is new
                const participantData = await ChatService.getParticipant(chatId, currentUserId);
                const userJoinedAt = participantData?.joinedAt || 0;
                
                const messageTimestamp = typeof msg.timestamp === 'number' 
                  ? msg.timestamp 
                  : (msg.timestamp as any)?.getTime?.() || Date.now();
                
                // Only notify if message was sent AFTER user joined the group
                // This prevents notifications for old messages when user rejoins
                if (userJoinedAt === 0 || messageTimestamp > userJoinedAt) {
                  const { triggerInAppNotification } = await import('@/services/NotificationHelper');
                  const sender = get().getUserProfile(msg.senderId);
                  
                  // Trigger direct in-app notification (works on emulator!)
                  triggerInAppNotification({
                    id: msg.id,
                    senderName: sender?.displayName || 'Someone',
                    messageText: msg.text || '',
                    senderAvatar: sender?.profilePictureUrl || undefined,
                    chatId,
                    isImage: msg.type === 'image',
                  });
                } else {
                }
              } catch (error) {
                console.error('Error triggering notification:', error);
              }
            }
          }
        }
        
        // Merge: Update existing messages, add new ones
        // Force new array to trigger React re-render
        let updatedMessages = currentMessages.map(existing => {
          const update = messagesToUpdate.find(m => m.id === existing.id);
          if (update) {
            // Preserve local-only fields (translations) when merging Firestore updates
            // Firestore doesn't store translations, so we keep them from existing state
            return {
              ...update,
              translations: existing.translations || {}, // Keep local translations
              detectedLanguage: existing.detectedLanguage, // Keep detected language
            };
          }
          return existing;
        });
        
        // Add new messages
        updatedMessages = [...updatedMessages, ...messagesToAdd];
        
        // Sort by timestamp (oldest first)
        updatedMessages.sort((a, b) => {
          const aTime = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
          const bTime = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
          return aTime - bTime;
        });
        
        set({ messages: updatedMessages });
        
        // Mark that we've received the first snapshot
        // Use a timeout to ensure ALL batches from initial snapshot are processed
        // before enabling notifications
        if (!hasReceivedFirstSnapshot) {
          hasReceivedFirstSnapshot = true;
          
          // Wait 2 seconds after first snapshot to ensure all initial batches are processed
          setTimeout(() => {
            if (isInitialLoad) {
              isInitialLoad = false;
            }
          }, 2000);
        }
        
        // Sync new/updated messages to SQLite for offline access (non-blocking)
        // Preserve translations from existing SQLite data
        for (const message of updatedMessages.filter(m => 
          newMessages.find(nm => nm.id === m.id)
        )) {
          const messageRow: any = {
            id: message.id,
            chatId: message.chatId,
            senderId: message.senderId,
            text: message.text,
        timestamp: typeof message.timestamp === 'number' 
          ? message.timestamp 
          : Date.now(),
        status: message.status,
        type: message.type,
        imageUrl: message.imageUrl || null,
        thumbnailUrl: message.thumbnailUrl || null,
        caption: message.caption || null,
        reactions: JSON.stringify(message.reactions || {}),
        deletedForMe: 0,
        deletedForEveryone: message.deletedForEveryone ? 1 : 0,
        translations: message.translations ? JSON.stringify(message.translations) : null,
        detectedLanguage: message.detectedLanguage || null,
        syncStatus: 'synced',
      };
      // Non-blocking save, ignore errors
      SQLiteService.saveMessage(messageRow).catch(() => {});
    }
  },
  (error) => {
    console.error('Error in message subscription:', error);
    set({ error: error.message });
  },
  initialLoadLimit // Pass adaptive limit based on unread count
  );

  set({ messagesUnsubscribe: unsubscribe });
  },

  // Import message actions from separate file
  ...createMessageActions(set, get),

  // Import profile & utility actions from separate file
  ...createProfileActions(set, get),
}));
