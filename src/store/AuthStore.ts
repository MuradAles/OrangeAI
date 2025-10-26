/**
 * Authentication Store
 * 
 * Global state management for authentication using Zustand
 */

import { SQLiteService } from '@/database/SQLiteService';
import { AuthService } from '@/services/firebase/AuthService';
import { UserService } from '@/services/firebase/UserService';
import { User } from '@/shared/types';
import { User as FirebaseUser } from 'firebase/auth';
import { create } from 'zustand';

/**
 * Authentication State
 */
interface AuthState {
  // State
  user: User | null;                    // Complete user profile from Firestore
  firebaseUser: FirebaseUser | null;    // Firebase auth user
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  loadUserProfile: (userId: string) => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

/**
 * Create Authentication Store
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial State
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  /**
   * Initialize auth state
   * Sets up Firebase auth listener
   */
  initialize: async () => {
    try {
      
      // Set up auth state listener
      AuthService.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          set({ firebaseUser, isAuthenticated: true });
          
          // Load user profile from Firestore
          await get().loadUserProfile(firebaseUser.uid);
        } else {
          set({
            firebaseUser: null,
            user: null,
            isAuthenticated: false,
          });
        }
        
        set({ isInitialized: true, isLoading: false });
      });
      
    } catch (error: any) {
      console.error('❌ Auth initialization failed:', error);
      set({
        error: error.message,
        isInitialized: true,
        isLoading: false,
      });
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Validate inputs
      if (!AuthService.validateEmail(email)) {
        throw new Error('Invalid email format');
      }
      
      const passwordValidation = AuthService.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }
      
      // Create Firebase auth user
      const firebaseUser = await AuthService.signUpWithEmail(email, password);
      
      
      set({
        firebaseUser,
        isAuthenticated: true,
        isLoading: false,
      });
      
      // Try to load user profile (will be null for new users)
      await get().loadUserProfile(firebaseUser.uid);
      
    } catch (error: any) {
      // Don't log auth credential errors - they're expected user scenarios
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Sign in
      const firebaseUser = await AuthService.signInWithEmail(email, password);
      
      
      set({
        firebaseUser,
        isAuthenticated: true,
        isLoading: false,
      });
      
      // Load user profile
      await get().loadUserProfile(firebaseUser.uid);
      
    } catch (error: any) {
      // Don't log auth credential errors - they're expected user scenarios
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Sign out
   */
  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Set user offline BEFORE signing out (while auth token still valid)
      const currentUser = get().user;
      if (currentUser?.id && currentUser?.displayName) {
        try {
          const { PresenceService } = await import('@/services/firebase');
          await PresenceService.setOffline(currentUser.id, currentUser.displayName);
        } catch (presenceError) {
          console.warn('⚠️ Failed to set offline status during logout:', presenceError);
          // Continue with logout even if presence update fails
        }
      }
      
      // Clean up all presence subscriptions BEFORE logout
      try {
        const { usePresenceStore } = await import('@/store');
        const presenceStore = usePresenceStore.getState();
        presenceStore.cleanup();
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup presence subscriptions:', cleanupError);
      }
      
      // Clean up AI Assistant conversation history
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const userId = currentUser?.id;
        if (userId) {
          const aiAssistantKey = `@ai_assistant_conversation_${userId}`;
          await AsyncStorage.default.removeItem(aiAssistantKey);
          console.log('🧹 Cleared AI Assistant conversation history for user:', userId);
        }
      } catch (aiCleanupError) {
        console.warn('⚠️ Failed to cleanup AI Assistant history:', aiCleanupError);
      }
      
      await AuthService.signOut();
      
      // Clear state
      set({
        user: null,
        firebaseUser: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      
    } catch (error: any) {
      console.error('❌ Sign out failed:', error);
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Send email verification
   */
  sendEmailVerification: async () => {
    try {
      set({ isLoading: true, error: null });
      await AuthService.sendEmailVerification();
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to send verification email:', error);
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      await AuthService.resetPassword(email);
      set({ isLoading: false });
    } catch (error: any) {
      // Don't log auth errors - they're expected user scenarios
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Check if email is verified
   */
  checkEmailVerification: async (): Promise<boolean> => {
    try {
      const isVerified = await AuthService.isEmailVerified();
      return isVerified;
    } catch (error) {
      console.error('❌ Failed to check email verification:', error);
      return false;
    }
  },

  /**
   * Load user profile from Firestore
   */
  loadUserProfile: async (userId: string) => {
    try {
      // STEP 1: Load from SQLite instantly (prevents auth flash)
      const cachedUser = await SQLiteService.getUserById(userId);
      if (cachedUser) {
        // Convert SQLite format to User format
        const userProfile = {
          id: cachedUser.id,
          username: cachedUser.username,
          displayName: cachedUser.displayName,
          email: '', // Will be updated from Firestore
          bio: '', // Will be updated from Firestore
          profilePictureUrl: cachedUser.profilePictureUrl,
          phoneNumber: null,
          phoneNumberVisible: false,
          isOnline: cachedUser.isOnline === 1,
          lastSeen: cachedUser.lastSeen,
          createdAt: cachedUser.createdAt,
          preferredLanguage: 'en', // Default, will be updated from Firestore
        };
        
        // Set cached profile immediately (prevents auth flash)
        set({ user: userProfile });
      }
      
      // STEP 2: Load fresh profile from Firestore (background sync)
      const userProfile = await UserService.getProfile(userId);
      
      if (userProfile) {
        set({ user: userProfile });
        
        // Save to SQLite
        await SQLiteService.saveUser({
          id: userProfile.id,
          username: userProfile.username,
          displayName: userProfile.displayName,
          profilePictureUrl: userProfile.profilePictureUrl,
          isOnline: userProfile.isOnline ? 1 : 0,
          lastSeen: userProfile.lastSeen,
          createdAt: userProfile.createdAt,
        });
        
      } else {
        set({ user: null });
      }
    } catch (error: any) {
      console.error('❌ Failed to load user profile:', error);
      set({ error: error.message });
    }
  },

  /**
   * Update user profile
   */
  updateUserProfile: async (updates: Partial<User>) => {
    try {
      const { user } = get();
      if (!user) throw new Error('No user logged in');
      
      set({ isLoading: true, error: null });
      
      // Update in Firestore
      await UserService.updateProfile(user.id, updates);
      
      // Update local state
      const updatedUser = { ...user, ...updates };
      set({ user: updatedUser, isLoading: false });
      
      // Update SQLite
      await SQLiteService.saveUser({
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        profilePictureUrl: updatedUser.profilePictureUrl,
        isOnline: updatedUser.isOnline ? 1 : 0,
        lastSeen: updatedUser.lastSeen,
        createdAt: updatedUser.createdAt,
      });
      
      
    } catch (error: any) {
      console.error('❌ Failed to update profile:', error);
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Set user manually
   */
  setUser: (user: User | null) => {
    set({ user });
  },

  /**
   * Set error manually
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));


