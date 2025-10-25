/**
 * ChatStore - Profile & Utility Actions
 * 
 * Handles:
 * - User profile loading and caching
 * - Profile refresh
 * - Cleanup operations
 * - Chat removal
 */

import { SQLiteService } from '@/database/SQLiteService';
import { UserService } from '@/services/firebase';
import { User } from '@/shared/types';

export const createProfileActions = (set: any, get: any) => ({
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
            
            // Save to SQLite (convert Date to timestamp) - non-blocking, ignore errors
            SQLiteService.saveUser({
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
            }).catch(() => {
              // Ignore SQLite errors (database locked, etc.) - profile is already in memory
            });
          }
        }).catch(() => {
          // Ignore Firestore errors
        });
        
        return profile;
      }
      
      // Not in SQLite, load from Firestore
      const profile = await UserService.getProfile(userId);
      if (profile) {
        // Cache in memory
        const newProfiles = new Map(userProfiles);
        newProfiles.set(userId, profile);
        set({ userProfiles: newProfiles });
        
        // Save to SQLite for offline access (non-blocking, ignore errors)
        SQLiteService.saveUser({
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
        }).catch(() => {
          // Ignore SQLite errors (database locked, etc.) - profile is already in memory
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

  // Refresh user profile (force reload from Firestore)
  refreshUserProfile: async (userId: string) => {
    try {
      const profile = await UserService.getProfile(userId);
      if (profile) {
        const { userProfiles } = get();
        const updatedProfiles = new Map(userProfiles);
        updatedProfiles.set(userId, profile);
        set({ userProfiles: updatedProfiles });
        
        // Also update in SQLite
        await SQLiteService.saveUser({
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          profilePictureUrl: profile.profilePictureUrl || null,
          isOnline: profile.isOnline ? 1 : 0,
          lastSeen: profile.lastSeen || Date.now(),
          createdAt: profile.createdAt,
        });
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
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

  // Remove a chat from local state and SQLite (when user loses access)
  removeChatLocally: async (chatId: string, userId: string) => {
    try {
      
      // Remove from SQLite
      await SQLiteService.deleteMessagesByChatId(chatId);
      await SQLiteService.deleteChatById(chatId);
      
      // Remove from state
      set((state: any) => ({
        chats: state.chats.filter((chat: any) => chat.id !== chatId),
        messages: state.currentChatId === chatId ? [] : state.messages,
        currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
        chatsVersion: state.chatsVersion + 1
      }));
      
    } catch (error) {
      console.error(`❌ Failed to remove chat ${chatId} locally:`, error);
    }
  },
});

