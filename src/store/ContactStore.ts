/**
 * Contact Store
 * 
 * Manages contacts, friend requests, and blocked users state
 */

import { FriendRequestService, UserService } from '@/services/firebase';
import { BlockedUser, Contact, FriendRequest, User } from '@/shared/types';
import { Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';

/**
 * Contact Store State
 */
interface ContactStoreState {
  // Contacts (friends)
  contacts: Contact[];
  contactsLoading: boolean;
  contactsError: string | null;

  // Friend requests (incoming)
  friendRequests: FriendRequest[];
  friendRequestsLoading: boolean;
  friendRequestsError: string | null;

  // Sent requests (outgoing)
  sentRequests: FriendRequest[];
  sentRequestsLoading: boolean;

  // Blocked users
  blockedUsers: BlockedUser[];
  blockedUsersLoading: boolean;

  // Search
  searchResults: User[];
  searchLoading: boolean;
  searchError: string | null;

  // Real-time listeners
  friendRequestsUnsubscribe: Unsubscribe | null;
  sentRequestsUnsubscribe: Unsubscribe | null;

  // Actions
  loadContacts: (userId: string) => Promise<void>;
  subscribeFriendRequests: (userId: string) => void;
  subscribeSentRequests: (userId: string) => void;
  unsubscribeAll: () => void;
  
  sendFriendRequest: (fromUserId: string, toUserId: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (requestId: string, userId: string) => Promise<{ success: boolean; chatId?: string; error?: string }>;
  ignoreFriendRequest: (requestId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  cancelFriendRequest: (requestId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  
  blockUser: (userId: string, blockedUserId: string) => Promise<{ success: boolean; error?: string }>;
  unblockUser: (userId: string, blockedUserId: string) => Promise<{ success: boolean; error?: string }>;
  
  searchUsers: (searchTerm: string) => Promise<void>;
  clearSearch: () => void;
  
  // Utility
  isContact: (userId: string) => boolean;
  isBlocked: (userId: string) => boolean;
  hasPendingRequest: (userId: string) => boolean;
  hasSentRequest: (userId: string) => boolean;
  
  // Reset
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  contacts: [],
  contactsLoading: false,
  contactsError: null,

  friendRequests: [],
  friendRequestsLoading: false,
  friendRequestsError: null,

  sentRequests: [],
  sentRequestsLoading: false,

  blockedUsers: [],
  blockedUsersLoading: false,

  searchResults: [],
  searchLoading: false,
  searchError: null,

  friendRequestsUnsubscribe: null,
  sentRequestsUnsubscribe: null,
};

/**
 * Contact Store
 */
export const useContactStore = create<ContactStoreState>((set, get) => ({
  ...initialState,

  /**
   * Load user's contacts from Firestore
   */
  loadContacts: async (userId: string) => {
    try {
      set({ contactsLoading: true, contactsError: null });

      const contacts = await UserService.getContacts(userId);

      set({ 
        contacts, 
        contactsLoading: false 
      });
      
    } catch (error: any) {
      console.error('❌ Failed to load contacts:', error);
      set({ 
        contactsError: error.message, 
        contactsLoading: false 
      });
    }
  },

  /**
   * Subscribe to incoming friend requests (REAL-TIME)
   */
  subscribeFriendRequests: (userId: string) => {
    // Unsubscribe from previous listener
    const currentUnsub = get().friendRequestsUnsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    set({ friendRequestsLoading: true, friendRequestsError: null });

    // Subscribe to real-time updates
    const unsubscribe = FriendRequestService.subscribeFriendRequests(
      userId,
      (requests) => {
        set({ 
          friendRequests: requests, 
          friendRequestsLoading: false 
        });
      },
      (error) => {
        console.error('❌ Friend requests listener error:', error);
        set({ 
          friendRequestsError: error.message, 
          friendRequestsLoading: false 
        });
      }
    );

    set({ friendRequestsUnsubscribe: unsubscribe });
  },

  /**
   * Subscribe to sent friend requests (REAL-TIME)
   */
  subscribeSentRequests: (userId: string) => {
    // Unsubscribe from previous listener
    const currentUnsub = get().sentRequestsUnsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    set({ sentRequestsLoading: true });

    // Subscribe to real-time updates
    const unsubscribe = FriendRequestService.subscribeSentFriendRequests(
      userId,
      (requests) => {
        set({ 
          sentRequests: requests, 
          sentRequestsLoading: false 
        });
      },
      (error) => {
        console.error('❌ Sent requests listener error:', error);
        set({ sentRequestsLoading: false });
      }
    );

    set({ sentRequestsUnsubscribe: unsubscribe });
  },

  /**
   * Unsubscribe from all real-time listeners
   */
  unsubscribeAll: () => {
    const { friendRequestsUnsubscribe, sentRequestsUnsubscribe } = get();
    
    if (friendRequestsUnsubscribe) {
      friendRequestsUnsubscribe();
    }
    if (sentRequestsUnsubscribe) {
      sentRequestsUnsubscribe();
    }

    set({ 
      friendRequestsUnsubscribe: null, 
      sentRequestsUnsubscribe: null 
    });
  },

  /**
   * Load blocked users
   */
  loadBlockedUsers: async (userId: string) => {
    try {
      set({ blockedUsersLoading: true });

      const blocked = await FriendRequestService.getBlockedUsers(userId);

      set({ 
        blockedUsers: blocked, 
        blockedUsersLoading: false 
      });
    } catch (error: any) {
      console.error('❌ Failed to load blocked users:', error);
      set({ blockedUsersLoading: false });
    }
  },

  /**
   * Send a friend request
   */
  sendFriendRequest: async (fromUserId: string, toUserId: string) => {
    const result = await FriendRequestService.sendFriendRequest(fromUserId, toUserId);
    
    // Sent requests will auto-update via listener
    
    return result;
  },

  /**
   * Accept a friend request
   */
  acceptFriendRequest: async (requestId: string, userId: string) => {
    const result = await FriendRequestService.acceptFriendRequest(requestId, userId);
    
    if (result.success) {
      // Reload contacts (friend requests auto-update via listener)
      get().loadContacts(userId);
    }
    
    return result;
  },

  /**
   * Ignore a friend request
   */
  ignoreFriendRequest: async (requestId: string, userId: string) => {
    const result = await FriendRequestService.ignoreFriendRequest(requestId, userId);
    
    if (result.success) {
      // Remove from friend requests list
      set(state => ({
        friendRequests: state.friendRequests.filter(req => req.id !== requestId)
      }));
    }
    
    return result;
  },

  /**
   * Cancel a sent friend request
   */
  cancelFriendRequest: async (requestId: string, userId: string) => {
    const result = await FriendRequestService.cancelFriendRequest(requestId, userId);
    
    if (result.success) {
      // Remove from sent requests list
      set(state => ({
        sentRequests: state.sentRequests.filter(req => req.id !== requestId)
      }));
    }
    
    return result;
  },

  /**
   * Block a user
   */
  blockUser: async (userId: string, blockedUserId: string) => {
    const result = await FriendRequestService.blockUser(userId, blockedUserId);
    
    if (result.success) {
      // Reload contacts and blocked users
      get().loadContacts(userId);
      get().loadBlockedUsers(userId);
    }
    
    return result;
  },

  /**
   * Unblock a user
   */
  unblockUser: async (userId: string, blockedUserId: string) => {
    const result = await FriendRequestService.unblockUser(userId, blockedUserId);
    
    if (result.success) {
      // Reload blocked users
      get().loadBlockedUsers(userId);
    }
    
    return result;
  },

  /**
   * Search users by username
   */
  searchUsers: async (searchTerm: string) => {
    try {
      set({ searchLoading: true, searchError: null });

      if (!searchTerm || searchTerm.trim().length < 2) {
        set({ searchResults: [], searchLoading: false });
        return;
      }

      const users = await UserService.searchByUsername(searchTerm.trim());

      set({ 
        searchResults: users, 
        searchLoading: false 
      });
    } catch (error: any) {
      console.error('❌ Failed to search users:', error);
      set({ 
        searchError: error.message, 
        searchLoading: false 
      });
    }
  },

  /**
   * Clear search results
   */
  clearSearch: () => {
    set({ searchResults: [], searchError: null });
  },

  /**
   * Check if a user is in contacts
   */
  isContact: (userId: string) => {
    return get().contacts.some(contact => contact.userId === userId);
  },

  /**
   * Check if a user is blocked
   */
  isBlocked: (userId: string) => {
    return get().blockedUsers.some(blocked => blocked.userId === userId);
  },

  /**
   * Check if there's a pending request from this user
   */
  hasPendingRequest: (userId: string) => {
    return get().friendRequests.some(req => req.fromUserId === userId);
  },

  /**
   * Check if user has sent a request to this user
   */
  hasSentRequest: (userId: string) => {
    return get().sentRequests.some(req => req.toUserId === userId);
  },

  /**
   * Reset store
   */
  reset: () => {
    // Unsubscribe from all listeners first
    get().unsubscribeAll();
    set(initialState);
  },
}));

