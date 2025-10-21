/**
 * MessageService - Firestore operations for messages
 * 
 * Handles:
 * - Sending messages
 * - Receiving messages (real-time listeners)
 * - Message status updates
 * - Reactions
 * - Message deletion
 * - Pagination
 */

import { Message, MessageStatus } from '@/shared/types';
import {
    arrayUnion,
    collection,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    QueryDocumentSnapshot,
    serverTimestamp,
    setDoc,
    startAfter,
    Unsubscribe,
    updateDoc
} from 'firebase/firestore';
import { firestore } from './FirebaseConfig';

export class MessageService {
  /**
   * Send a new text or image message
   */
  static async sendMessage(
    chatId: string,
    senderId: string,
    text: string,
    messageId?: string,
    imageData?: {
      type: 'image';
      imageUrl: string;
      thumbnailUrl: string;
      caption: string | null;
    }
  ): Promise<string> {
    try {
      const newMessageId = messageId || doc(collection(firestore, 'chats', chatId, 'messages')).id;
      const messageRef = doc(firestore, 'chats', chatId, 'messages', newMessageId);

      const messageData = imageData ? {
        senderId,
        text: '',
        timestamp: serverTimestamp(),
        status: 'sent' as MessageStatus,
        type: imageData.type,
        imageUrl: imageData.imageUrl,
        thumbnailUrl: imageData.thumbnailUrl,
        caption: imageData.caption,
        reactions: {},
        deletedFor: [],
        deletedForEveryone: false,
        deletedAt: null,
      } : {
        senderId,
        text,
        timestamp: serverTimestamp(),
        status: 'sent' as MessageStatus,
        type: 'text',
        imageUrl: null,
        thumbnailUrl: null,
        caption: null,
        reactions: {},
        deletedFor: [],
        deletedForEveryone: false,
        deletedAt: null,
      };

      await setDoc(messageRef, messageData);
      return newMessageId;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send an image message
   */
  static async sendImageMessage(
    chatId: string,
    senderId: string,
    imageUrl: string,
    thumbnailUrl: string,
    caption?: string,
    messageId?: string
  ): Promise<string> {
    try {
      const newMessageId = messageId || doc(collection(firestore, 'chats', chatId, 'messages')).id;
      const messageRef = doc(firestore, 'chats', chatId, 'messages', newMessageId);

      const messageData = {
        senderId,
        text: '',
        timestamp: serverTimestamp(),
        status: 'sent' as MessageStatus,
        type: 'image',
        imageUrl,
        thumbnailUrl,
        caption: caption || null,
        reactions: {},
        deletedFor: [],
        deletedForEveryone: false,
        deletedAt: null,
      };

      await setDoc(messageRef, messageData);
      return newMessageId;
    } catch (error) {
      console.error('Error sending image message:', error);
      throw error;
    }
  }

  /**
   * Get messages with pagination
   * Load 50 messages at a time
   */
  static async getMessages(
    chatId: string,
    limitCount: number = 50,
    lastMessageDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ messages: Message[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    try {
      let messagesQuery = query(
        collection(firestore, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      // If pagination, start after last document
      if (lastMessageDoc) {
        messagesQuery = query(
          collection(firestore, 'chats', chatId, 'messages'),
          orderBy('timestamp', 'desc'),
          startAfter(lastMessageDoc),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(messagesQuery);
      const messages: Message[] = [];
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          chatId,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          status: data.status,
          type: data.type,
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl,
          caption: data.caption,
          reactions: data.reactions || {},
          deletedFor: data.deletedFor || [],
          deletedForEveryone: data.deletedForEveryone || false,
          deletedAt: data.deletedAt ? data.deletedAt.toDate() : null,
          syncStatus: 'synced',
        });
        lastDoc = doc;
      });

      return { messages, lastDoc };
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time message updates
   * Returns unsubscribe function
   */
  static subscribeToMessages(
    chatId: string,
    onUpdate: (messages: Message[]) => void,
    onError: (error: Error) => void,
    limitCount: number = 50
  ): Unsubscribe {
    const messagesQuery = query(
      collection(firestore, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        try {
          const messages: Message[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
              id: doc.id,
              chatId,
              senderId: data.senderId,
              text: data.text,
              timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
              status: data.status,
              type: data.type,
              imageUrl: data.imageUrl,
              thumbnailUrl: data.thumbnailUrl,
              caption: data.caption,
              reactions: data.reactions || {},
              deletedFor: data.deletedFor || [],
              deletedForEveryone: data.deletedForEveryone || false,
              deletedAt: data.deletedAt ? data.deletedAt.toDate() : null,
              syncStatus: 'synced',
            });
          });

          // Reverse to show oldest first
          onUpdate(messages.reverse());
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
   * Update message status (sent → delivered → read)
   */
  static async updateMessageStatus(
    chatId: string,
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        status,
      });
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  /**
   * Delete message for a specific user
   */
  static async deleteMessageForMe(
    chatId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        deletedFor: arrayUnion(userId),
      });
    } catch (error) {
      console.error('Error deleting message for me:', error);
      throw error;
    }
  }

  /**
   * Delete message for everyone
   * Only own messages can be deleted for everyone
   */
  static async deleteMessageForEveryone(
    chatId: string,
    messageId: string
  ): Promise<void> {
    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        deletedForEveryone: true,
        deletedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error deleting message for everyone:', error);
      throw error;
    }
  }

  /**
   * Add reaction to a message
   */
  static async addReaction(
    chatId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (!messageSnap.exists()) {
        throw new Error('Message not found');
      }

      const data = messageSnap.data();
      const reactions = data.reactions || {};
      
      // Add user to emoji array
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }
      if (!reactions[emoji].includes(userId)) {
        reactions[emoji].push(userId);
      }

      await updateDoc(messageRef, { reactions });
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Remove reaction from a message
   */
  static async removeReaction(
    chatId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (!messageSnap.exists()) {
        throw new Error('Message not found');
      }

      const data = messageSnap.data();
      const reactions = data.reactions || {};
      
      // Remove user from emoji array
      if (reactions[emoji]) {
        reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
        
        // Remove emoji key if no users left
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      await updateDoc(messageRef, { reactions });
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  /**
   * Get a single message by ID
   */
  static async getMessageById(
    chatId: string,
    messageId: string
  ): Promise<Message | null> {
    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        return null;
      }

      const data = messageSnap.data();
      return {
        id: messageSnap.id,
        chatId,
        senderId: data.senderId,
        text: data.text,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        status: data.status,
        type: data.type,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        caption: data.caption,
        reactions: data.reactions || {},
        deletedFor: data.deletedFor || [],
        deletedForEveryone: data.deletedForEveryone || false,
        deletedAt: data.deletedAt ? data.deletedAt.toDate() : null,
        syncStatus: 'synced',
      };
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }
}

