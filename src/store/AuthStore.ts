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
      console.log('🔐 Initializing auth...');
      
      // Set up auth state listener
      AuthService.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          console.log('✅ User authenticated:', firebaseUser.uid);
          set({ firebaseUser, isAuthenticated: true });
          
          // Load user profile from Firestore
          await get().loadUserProfile(firebaseUser.uid);
        } else {
          console.log('ℹ️  No user authenticated');
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
      
      console.log('✅ Sign up successful');
      
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
      
      console.log('✅ Sign in successful');
      
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
          console.log('✅ User marked offline before logout');
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
        console.log('✅ Presence subscriptions cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup presence subscriptions:', cleanupError);
      }
      
      await AuthService.signOut();
      
      // Clear state
      set({
        user: null,
        firebaseUser: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      console.log('✅ Sign out successful');
      
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
        
        console.log('✅ User profile loaded');
      } else {
        console.log('ℹ️  No profile found for user');
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
      
      console.log('✅ User profile updated');
      
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


