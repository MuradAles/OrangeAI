/**
 * PresenceStore - Centralized management of user online/offline status
 * 
 * Single source of truth for presence data across the entire app.
 * Ensures we only subscribe once per user, no matter how many components need the data.
 */

import { PresenceService, UserPresence } from '@/services/firebase';
import type { Unsubscribe } from 'firebase/database';
import { create } from 'zustand';

interface PresenceState {
  // Map of userId -> presence data
  presenceMap: Map<string, UserPresence>;
  
  // Map of userId -> unsubscribe function (internal tracking)
  subscriptions: Map<string, Unsubscribe>;
  
  // Version counter - increments on every presence update to force re-renders
  version: number;
  
  // Actions
  subscribeToUser: (userId: string) => void;
  getPresence: (userId: string) => UserPresence | null;
  unsubscribeFromUser: (userId: string) => void;
  cleanup: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presenceMap: new Map(),
  subscriptions: new Map(),
  version: 0,

  /**
   * Subscribe to a user's presence
   * Only subscribes once per user - subsequent calls are ignored
   * NOTE: This will NOT subscribe to your own user ID (we get currentUserId from AuthStore)
   */
  subscribeToUser: (userId: string) => {
    // Validate userId is not null/undefined
    if (!userId) {
      console.warn('PresenceStore: Cannot subscribe to user with undefined/null ID');
      return;
    }
    
    const { subscriptions } = get();
    
    // CRITICAL: Get current user ID to prevent self-subscription
    // We import this dynamically to avoid circular dependency
    const getCurrentUserId = () => {
      try {
        // @ts-ignore - dynamic import
        const { useAuthStore } = require('@/store/AuthStore');
        return useAuthStore.getState().user?.id;
      } catch {
        return null;
      }
    };
    
    const currentUserId = getCurrentUserId();
    
    // Subscribe to user presence
    
    // PREVENT subscribing to your own presence!
    if (currentUserId && userId === currentUserId) {
      return;
    }
    
    // Already subscribed? Skip!
    if (subscriptions.has(userId)) {
      return;
    }
    
    // Subscribe to this user's presence
    const unsubscribe = PresenceService.subscribeToPresence(
      userId,
      (presence) => {
        set(state => {
          const newMap = new Map(state.presenceMap);
          
          if (presence) {
            newMap.set(userId, presence);
          } else {
            // User offline or no data
            newMap.set(userId, {
              isOnline: false,
              lastSeen: Date.now(),
              userName: 'User',
            });
          }
          
          // Increment version to force re-renders
          return { 
            presenceMap: newMap,
            version: state.version + 1
          };
        });
      },
      (error) => {
        console.error(`Error subscribing to presence for ${userId}:`, error);
      }
    );
    
    // Store unsubscribe function
    set(state => {
      const newSubs = new Map(state.subscriptions);
      newSubs.set(userId, unsubscribe);
      return { subscriptions: newSubs };
    });
  },

  /**
   * Get presence data for a user
   * Returns null if not yet loaded
   * 
   * NOTE: This should be called within a component that subscribes to the store
   * to trigger re-renders when presence changes
   */
  getPresence: (userId: string) => {
    const { presenceMap } = get();
    return presenceMap.get(userId) || null;
  },

  /**
   * Unsubscribe from a user's presence
   * Call this when you no longer need updates for a specific user
   */
  unsubscribeFromUser: (userId: string) => {
    const { subscriptions } = get();
    const unsubscribe = subscriptions.get(userId);
    
    if (unsubscribe) {
      unsubscribe();
      
      set(state => {
        const newSubs = new Map(state.subscriptions);
        const newMap = new Map(state.presenceMap);
        
        newSubs.delete(userId);
        newMap.delete(userId);
        
        return {
          subscriptions: newSubs,
          presenceMap: newMap,
        };
      });
    }
  },

  /**
   * Cleanup all subscriptions
   * Call this on logout or app termination
   */
  cleanup: () => {
    const { subscriptions } = get();
    
    // Unsubscribe from all
    subscriptions.forEach(unsub => unsub());
    
    // Clear state
    set({
      subscriptions: new Map(),
      presenceMap: new Map(),
    });
  },
}));

