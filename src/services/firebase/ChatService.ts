/**
 * ChatService - Firestore operations for chats
 * 
 * Handles:
 * - Chat CRUD operations
 * - Real-time chat listeners
 * - Last message updates
 * - Chat participant management
 */

import { Chat } from '@/shared/types';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { firestore } from './FirebaseConfig';

export class ChatService {
  /**
   * Check if a chat already exists between two users
   * Returns chatId if exists, null otherwise
   */
  static async findExistingChat(userId1: string, userId2: string): Promise<string | null> {
    try {
      // Query for chats where both users are participants
      const chatsRef = collection(firestore, 'chats');
      const q = query(
        chatsRef,
        where('type', '==', 'one-on-one'),
        where('participants', 'array-contains', userId1)
      );

      const snapshot = await getDocs(q);
      
      // Check if any of the results also contain userId2
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.participants.includes(userId2)) {
          return doc.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding existing chat:', error);
      throw error;
    }
  }

  /**
   * Create a new one-on-one chat
   * Or return existing chat if already exists
   */
  static async createChat(
    userId1: string,
    userId2: string,
    chatId?: string
  ): Promise<string> {
    try {
      const newChatId = chatId || doc(collection(firestore, 'chats')).id;
      const batch = writeBatch(firestore);

      // Create chat document
      const chatRef = doc(firestore, 'chats', newChatId);
      batch.set(chatRef, {
        type: 'one-on-one',
        participants: [userId1, userId2],
        lastMessageText: '',
        lastMessageTime: null, // No message yet, so no time
        lastMessageSenderId: '',
        createdAt: serverTimestamp(),
        createdBy: userId1,
        groupName: null,
        groupIcon: null,
        groupDescription: null,
        groupAdminId: null,
        inviteCode: null,
      });

      // Create participant documents
      const participant1Ref = doc(firestore, 'chats', newChatId, 'participants', userId1);
      batch.set(participant1Ref, {
        userId: userId1,
        role: 'member',
        joinedAt: serverTimestamp(),
        lastReadMessageId: '',
        lastReadTimestamp: serverTimestamp(),
        unreadCount: 0,
      });

      const participant2Ref = doc(firestore, 'chats', newChatId, 'participants', userId2);
      batch.set(participant2Ref, {
        userId: userId2,
        role: 'member',
        joinedAt: serverTimestamp(),
        lastReadMessageId: '',
        lastReadTimestamp: serverTimestamp(),
        unreadCount: 0,
      });

      await batch.commit();
      return newChatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  /**
   * Get a chat by ID
   */
  static async getChatById(chatId: string): Promise<Chat | null> {
    try {
      const chatRef = doc(firestore, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        return null;
      }

      const data = chatSnap.data();
      
      // Handle Firestore Timestamps safely - convert to number (timestamp)
      let lastMessageTime: number = 0;
      if (data.lastMessageTime) {
        if (typeof data.lastMessageTime.toDate === 'function') {
          lastMessageTime = data.lastMessageTime.toDate().getTime();
        } else if (typeof data.lastMessageTime === 'number') {
          lastMessageTime = data.lastMessageTime;
        }
      }
      
      let createdAt: number = 0;
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate().getTime();
        } else if (typeof data.createdAt === 'number') {
          createdAt = data.createdAt;
        }
      }
      
      return {
        id: chatSnap.id,
        type: data.type,
        participants: data.participants,
        lastMessageText: data.lastMessageText || '',
        lastMessageTime,
        lastMessageSenderId: data.lastMessageSenderId || '',
        lastMessageStatus: data.lastMessageStatus,
        createdAt,
        createdBy: data.createdBy,
        groupName: data.groupName,
        groupIcon: data.groupIcon,
        groupDescription: data.groupDescription,
        groupAdminId: data.groupAdminId,
        inviteCode: data.inviteCode,
      };
    } catch (error) {
      console.error('Error getting chat:', error);
      throw error;
    }
  }

  /**
   * Get all chats for a user
   */
  static async getUserChats(userId: string): Promise<Chat[]> {
    try {
      const chatsQuery = query(
        collection(firestore, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('lastMessageTime', 'desc')
      );

      const snapshot = await getDocs(chatsQuery);
      const chats: Chat[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Handle Firestore Timestamps safely - convert to number (timestamp)
        let lastMessageTime: number = 0;
        if (data.lastMessageTime) {
          if (typeof data.lastMessageTime.toDate === 'function') {
            lastMessageTime = data.lastMessageTime.toDate().getTime();
          } else if (typeof data.lastMessageTime === 'number') {
            lastMessageTime = data.lastMessageTime;
          }
        }
        
        let createdAt: number = 0;
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate().getTime();
          } else if (typeof data.createdAt === 'number') {
            createdAt = data.createdAt;
          }
        }
        
        chats.push({
          id: doc.id,
          type: data.type,
          participants: data.participants,
          lastMessageText: data.lastMessageText || '',
          lastMessageTime,
          lastMessageSenderId: data.lastMessageSenderId || '',
          lastMessageStatus: data.lastMessageStatus,
          createdAt,
          createdBy: data.createdBy,
          groupName: data.groupName,
          groupIcon: data.groupIcon,
          groupDescription: data.groupDescription,
          groupAdminId: data.groupAdminId,
          inviteCode: data.inviteCode,
        });
      }

      return chats;
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw error;
    }
  }

  /**
   * Update chat's last message info
   * Called after sending a new message
   */
  static async updateChatLastMessage(
    chatId: string,
    messageText: string,
    senderId: string,
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed',
    timestamp?: number
  ): Promise<void> {
    try {
      const chatRef = doc(firestore, 'chats', chatId);
      const updateData: any = {
        lastMessageText: messageText,
        lastMessageTime: timestamp !== undefined ? timestamp : serverTimestamp(),
        lastMessageSenderId: senderId,
      };
      
      if (status) {
        updateData.lastMessageStatus = status;
      }
      
      await updateDoc(chatRef, updateData);
    } catch (error) {
      console.error('Error updating last message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time chat updates for a user
   * Returns unsubscribe function
   */
  static subscribeToChats(
    userId: string,
    onUpdate: (chats: Chat[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const chatsQuery = query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(
      chatsQuery,
      async (snapshot) => {
        try {
          const chats: Chat[] = [];
          
          for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Handle Firestore Timestamps safely - DO NOT default to current time
            // Convert to number (timestamp) for consistency
            let lastMessageTime: number = 0;
            if (data.lastMessageTime) {
              if (typeof data.lastMessageTime.toDate === 'function') {
                lastMessageTime = data.lastMessageTime.toDate().getTime();
              } else if (typeof data.lastMessageTime === 'number') {
                lastMessageTime = data.lastMessageTime;
              }
            }
            
            let createdAt: number = 0;
            if (data.createdAt) {
              if (typeof data.createdAt.toDate === 'function') {
                createdAt = data.createdAt.toDate().getTime();
              } else if (typeof data.createdAt === 'number') {
                createdAt = data.createdAt;
              }
            }
            
            const chat = {
              id: doc.id,
              type: data.type,
              participants: data.participants,
              lastMessageText: data.lastMessageText || '',
              lastMessageTime,
              lastMessageSenderId: data.lastMessageSenderId || '',
              lastMessageStatus: data.lastMessageStatus,
              createdAt,
              createdBy: data.createdBy,
              groupName: data.groupName,
              groupIcon: data.groupIcon,
              groupDescription: data.groupDescription,
              groupAdminId: data.groupAdminId,
              inviteCode: data.inviteCode,
            };
            
            chats.push(chat);
          }

          onUpdate(chats);
        } catch (error) {
          onError(error as Error);
        }
      },
      (error) => {
        onError(error as Error);
      }
    );
  }

  /**
   * Get participant data
   */
  static async getParticipant(
    chatId: string,
    userId: string
  ): Promise<{ unreadCount: number; joinedAt?: number } | null> {
    try {
      const participantRef = doc(firestore, 'chats', chatId, 'participants', userId);
      const participantSnap = await getDoc(participantRef);
      
      if (!participantSnap.exists()) {
        return null;
      }
      
      const data = participantSnap.data();
      return {
        unreadCount: data.unreadCount || 0,
        joinedAt: data.joinedAt?.toMillis?.() || 0,
      };
    } catch (error) {
      console.error('Error getting participant:', error);
      return null;
    }
  }

  /**
   * Update unread count for a participant
   */
  static async updateUnreadCount(
    chatId: string,
    userId: string,
    count: number
  ): Promise<void> {
    try {
      const participantRef = doc(firestore, 'chats', chatId, 'participants', userId);
      await updateDoc(participantRef, {
        unreadCount: count,
      });
    } catch (error) {
      console.error('Error updating unread count:', error);
      throw error;
    }
  }
  
  /**
   * Increment unread count for a participant
   */
  static async incrementUnreadCount(
    chatId: string,
    userId: string
  ): Promise<void> {
    try {
      const participantRef = doc(firestore, 'chats', chatId, 'participants', userId);
      const participantSnap = await getDoc(participantRef);
      
      if (participantSnap.exists()) {
        const currentCount = participantSnap.data().unreadCount || 0;
        await updateDoc(participantRef, {
          unreadCount: currentCount + 1,
        });
      }
    } catch (error) {
      console.error('Error incrementing unread count:', error);
      throw error;
    }
  }

  /**
   * Mark chat as read (reset unread count)
   */
  static async markChatAsRead(
    chatId: string,
    userId: string,
    lastMessageId: string
  ): Promise<void> {
    try {
      const participantRef = doc(firestore, 'chats', chatId, 'participants', userId);
      await updateDoc(participantRef, {
        lastReadMessageId: lastMessageId,
        lastReadTimestamp: serverTimestamp(),
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Error marking chat as read:', error);
      throw error;
    }
  }

}

