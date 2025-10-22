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

import { Message, MessageStatus, User } from '@/shared/types';
import { Logger } from '@/shared/utils/Logger';
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
import { NotificationHelper } from '../NotificationHelper';
import { firestore } from './FirebaseConfig';
import { MessagingService } from './MessagingService';

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

      // 🔔 Send push notification to other participants (only if they're offline or not in this chat)
      try {
        // Get chat to find participants
        const chatDoc = await getDoc(doc(firestore, 'chats', chatId));
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          const participants = chatData.participants || [];
          const isGroup = chatData.type === 'group';
          
          // Get recipients (all participants except sender)
          const recipients = participants.filter((id: string) => id !== senderId);
          
          if (recipients.length > 0) {
            // Get sender info
            const senderDoc = await getDoc(doc(firestore, 'users', senderId));
            if (senderDoc.exists()) {
              const sender = { id: senderId, ...senderDoc.data() } as User;
              
              // Filter recipients: Only send push notifications to users who are OFFLINE or NOT in this chat
              const { PresenceService } = await import('./PresenceService');
              const recipientsToNotify: string[] = [];
              const recipientNames: string[] = [];
              
              for (const recipientId of recipients) {
                const recipientDoc = await getDoc(doc(firestore, 'users', recipientId));
                if (recipientDoc.exists()) {
                  const recipientData = recipientDoc.data();
                  const recipientUsername = recipientData.username || 'Unknown';
                  
                  // Check if user is online using Firebase Realtime Database presence
                  const presence = await PresenceService.getUserPresence(recipientId);
                  const isOnline = presence?.isOnline || false;
                  
                  // Only send push notification if user is OFFLINE
                  // In-app notifications will handle the case when user is online
                  if (!isOnline) {
                    recipientsToNotify.push(recipientId);
                    recipientNames.push(recipientUsername);
                    console.log(`📱 Queuing push notification for ${recipientUsername} (offline)`);
                  } else {
                    // User is online - skip push notification (in-app notification will show instead)
                    console.log(`📱 Skipping push notification for ${recipientUsername} (online - using in-app notification)`);
                  }
                } else {
                  recipientNames.push('Unknown');
                }
              }
              
              // Log message sent (all recipients)
              const messagePreview = imageData 
                ? `📷 ${imageData.caption || 'Image'}` 
                : text;
              Logger.messageSent(
                senderId,
                sender.username,
                recipients,
                recipients.map((id, i) => recipientNames[i] || 'Unknown'),
                messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : '')
              );
              
              // Only send push notifications to filtered recipients
              if (recipientsToNotify.length > 0) {
                // Format notification
                let notificationConfig;
                if (imageData) {
                  notificationConfig = NotificationHelper.formatImageNotification(
                    sender,
                    imageData.caption || '',
                    chatId,
                    isGroup,
                    chatData.groupName
                  );
                } else {
                  notificationConfig = NotificationHelper.formatMessageNotification(
                    sender,
                    text,
                    chatId,
                    isGroup,
                    chatData.groupName
                  );
                }
                
                // Send notification only to offline users or users not in this chat
                await MessagingService.sendNotificationToUsers(
                  recipientsToNotify,
                  notificationConfig.title,
                  notificationConfig.body,
                  notificationConfig.data,
                  senderId,
                  sender.username
                );
              } else {
                console.log('📱 No push notifications needed (all recipients are online and in chat)');
              }
            }
          }
        }
      } catch (notifError) {
        // Don't fail message send if notification fails
        console.warn('⚠️  Push notification failed (message still sent):', (notifError as Error).message);
      }

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

  /**
   * Get the last message's real status from the actual message document
   * This is more accurate than using chat.lastMessageStatus which can be stale
   */
  static async getLastMessageStatus(
    chatId: string
  ): Promise<MessageStatus | null> {
    try {
      // Query for the most recent message
      const messagesQuery = query(
        collection(firestore, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(messagesQuery);
      
      if (snapshot.empty) {
        return null;
      }

      const lastMessage = snapshot.docs[0].data();
      return lastMessage.status as MessageStatus;
    } catch (error) {
      console.error('Error getting last message status:', error);
      return null;
    }
  }
}

