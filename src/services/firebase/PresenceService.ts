/**
 * PresenceService - Firebase Realtime Database operations for presence features
 * 
 * Handles:
 * - Typing indicators (who's currently typing in a chat)
 * - Online/offline status (user presence)
 * - Last seen timestamps
 * 
 * Why Realtime Database instead of Firestore?
 * - Designed for ephemeral, high-frequency updates
 * - Built-in .onDisconnect() for automatic cleanup
 * - More cost-effective for presence features
 * - Better performance for real-time updates
 */

import {
    get,
    onDisconnect,
    onValue,
    ref,
    remove,
    serverTimestamp,
    set,
    Unsubscribe,
} from 'firebase/database';
import { database } from './FirebaseConfig';

/**
 * Typing indicator structure in Realtime Database:
 * /typing/{chatId}/{userId} = {
 *   timestamp: <server timestamp>,
 *   userName: "John Doe"
 * }
 */

export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export interface UserPresence {
  isOnline: boolean;
  lastSeen: number;
  userName: string;
}

export class PresenceService {
  /**
   * Start typing indicator for a user in a chat
   * Updates every 2 seconds while user is typing
   */
  static async startTyping(
    chatId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const typingRef = ref(database, `typing/${chatId}/${userId}`);
      
      await set(typingRef, {
        userName,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error starting typing indicator:', error);
      throw error;
    }
  }

  /**
   * Stop typing indicator for a user in a chat
   * Called when user stops typing (3 seconds of inactivity)
   */
  static async stopTyping(chatId: string, userId: string): Promise<void> {
    try {
      const typingRef = ref(database, `typing/${chatId}/${userId}`);
      await remove(typingRef);
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
      throw error;
    }
  }

  /**
   * Subscribe to typing indicators for a chat
   * Returns list of users currently typing (excluding current user)
   */
  static subscribeToTyping(
    chatId: string,
    currentUserId: string,
    onUpdate: (typingUsers: TypingUser[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const typingRef = ref(database, `typing/${chatId}`);

    return onValue(
      typingRef,
      (snapshot) => {
        try {
          const typingUsers: TypingUser[] = [];
          const now = Date.now();
          
          snapshot.forEach((childSnapshot) => {
            const userId = childSnapshot.key;
            const data = childSnapshot.val();
            
            // Skip current user (don't show "You are typing...")
            if (userId === currentUserId) return;
            
            // Only include if timestamp is recent (< 3 seconds old)
            // This handles stale data if stopTyping failed
            if (data?.timestamp) {
              const timeDiff = now - data.timestamp;
              if (timeDiff < 3000) {
                typingUsers.push({
                  userId: userId!,
                  userName: data.userName || 'Someone',
                  timestamp: data.timestamp,
                });
              }
            }
          });
          
          onUpdate(typingUsers);
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
   * Set user online status
   * Called when app comes to foreground
   */
  static async setOnline(userId: string, userName: string): Promise<void> {
    if (!userId) {
      console.error('❌ Firebase: Cannot set online - userId is undefined');
      return;
    }
    
    try {
      console.log('🔥 Firebase: Setting ONLINE for', userId.substring(0, 8));
      const presenceRef = ref(database, `presence/${userId}`);
      
      // Set user as online
      await set(presenceRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        userName,
      });
      console.log('✅ Firebase: ONLINE write complete');
      
      // Set up auto-disconnect to mark offline when connection drops
      const disconnectRef = onDisconnect(presenceRef);
      await disconnectRef.set({
        isOnline: false,
        lastSeen: serverTimestamp(),
        userName,
      });
      console.log('✅ Firebase: onDisconnect handler set');
    } catch (error) {
      console.error('❌ Firebase: Error setting online status:', error);
      throw error;
    }
  }

  /**
   * Set user offline status
   * Called when app goes to background or user logs out
   */
  static async setOffline(userId: string, userName: string): Promise<void> {
    if (!userId) {
      console.error('❌ Firebase: Cannot set offline - userId is undefined');
      return;
    }
    
    try {
      console.log('🔥 Firebase: Setting OFFLINE for', userId.substring(0, 8));
      const presenceRef = ref(database, `presence/${userId}`);
      
      // Cancel any pending onDisconnect operations before explicitly setting offline
      try {
        await onDisconnect(presenceRef).cancel();
        console.log('✅ Firebase: onDisconnect cancelled');
      } catch {
        // Ignore cancel errors - may already be cancelled or not exist
        console.log('⚠️ Firebase: onDisconnect cancel skipped (may not exist)');
      }
      
      await set(presenceRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
        userName,
      });
      console.log('✅ Firebase: OFFLINE write complete');
    } catch (error) {
      console.error('❌ Firebase: Error setting offline status:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a user's online/offline status
   */
  static subscribeToPresence(
    userId: string,
    onUpdate: (presence: UserPresence | null) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    if (!userId) {
      console.error('❌ Firebase: Cannot subscribe to presence - userId is undefined');
      // Return a no-op unsubscribe function
      return () => {};
    }
    
    console.log('🔥 Firebase: Creating presence subscription for', userId.substring(0, 8));
    const presenceRef = ref(database, `presence/${userId}`);

    return onValue(
      presenceRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          console.log('🔥 Firebase: Received presence data for', userId?.substring(0, 8) || 'unknown', ':', data);
          
          if (data) {
            onUpdate({
              isOnline: data.isOnline || false,
              lastSeen: data.lastSeen || Date.now(),
              userName: data.userName || 'User',
            });
          } else {
            // No presence data - user is offline
            console.log('⚠️ Firebase: No presence data for', userId?.substring(0, 8) || 'unknown', '- marking offline');
            onUpdate(null);
          }
        } catch (error) {
          console.error('❌ Firebase: Error in presence callback:', error);
          onError(error as Error);
        }
      },
      (error) => {
        console.error('❌ Firebase: Error subscribing to presence:', error);
        onError(error as Error);
      }
    );
  }

  /**
   * Subscribe to multiple users' presence (for contacts list)
   */
  static subscribeToMultiplePresence(
    userIds: string[],
    onUpdate: (presenceMap: Record<string, UserPresence>) => void,
    onError: (error: Error) => void
  ): Unsubscribe[] {
    const unsubscribes: Unsubscribe[] = [];
    const presenceMap: Record<string, UserPresence> = {};

    userIds.forEach((userId) => {
      const unsubscribe = this.subscribeToPresence(
        userId,
        (presence) => {
          if (presence) {
            presenceMap[userId] = presence;
          } else {
            // User offline or no data
            presenceMap[userId] = {
              isOnline: false,
              lastSeen: Date.now(),
              userName: 'User',
            };
          }
          onUpdate({ ...presenceMap });
        },
        onError
      );
      
      unsubscribes.push(unsubscribe);
    });

    // Return cleanup function that unsubscribes all
    return unsubscribes;
  }

  /**
   * Get user's current presence status (one-time read)
   */
  static async getUserPresence(userId: string): Promise<UserPresence | null> {
    try {
      const presenceRef = ref(database, `presence/${userId}`);
      const snapshot = await get(presenceRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || Date.now(),
          userName: data.userName || 'User',
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user presence:', error);
      throw error;
    }
  }

  /**
   * Clean up all typing indicators for a user across all chats
   * Called on logout or app termination
   */
  static async cleanupUserTyping(userId: string): Promise<void> {
    try {
      // In production, you might want to keep a list of active chats
      // For now, we rely on the 3-second timeout in subscribeToTyping
      console.log('User typing cleanup triggered for:', userId);
    } catch (error) {
      console.error('Error cleaning up typing indicators:', error);
    }
  }

  /**
   * Update presence heartbeat
   * Call this every 30 seconds while app is active to keep user online
   */
  static async updatePresenceHeartbeat(
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const presenceRef = ref(database, `presence/${userId}`);
      
      await set(presenceRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        userName,
      });
    } catch (error) {
      console.error('Error updating presence heartbeat:', error);
      // Don't throw - heartbeat failures shouldn't crash the app
    }
  }
}

