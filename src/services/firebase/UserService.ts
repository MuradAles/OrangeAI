/**
 * User Service
 * 
 * Handles user profile operations in Firestore
 */

import { Contact, User, UsernameAvailability, UserProfileUpdate } from '@/shared/types';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { firestore } from './FirebaseConfig';

/**
 * User Service
 */
export class UserService {
  private static readonly USERS_COLLECTION = 'users';

  /**
   * Create or update user profile in Firestore
   */
  static async createProfile(
    userId: string,
    profileData: Partial<User>
  ): Promise<User> {
    try {
      const userRef = doc(firestore, this.USERS_COLLECTION, userId);
      
      const userData: any = {
        id: userId,
        username: profileData.username?.toLowerCase(),
        displayName: profileData.displayName,
        email: profileData.email,
        profilePictureUrl: profileData.profilePictureUrl || null,
        phoneNumber: profileData.phoneNumber || null,
        phoneNumberVisible: profileData.phoneNumberVisible || false,
        bio: profileData.bio || '',
        isOnline: true,
        lastSeen: null,
        createdAt: profileData.createdAt || Date.now(),
      };
      
      await setDoc(userRef, userData);
      
      return userData as User;
    } catch (error: any) {
      console.error('❌ Failed to create user profile:', error);
      throw new Error('Failed to create user profile: ' + error.message);
    }
  }

  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<User | null> {
    try {
      const userRef = doc(firestore, this.USERS_COLLECTION, userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return null;
      }
      
      const data = userSnap.data();
      return {
        id: userSnap.id,
        ...data,
      } as User;
    } catch (error: any) {
      console.error('❌ Failed to get user profile:', error);
      throw new Error('Failed to get user profile: ' + error.message);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<void> {
    try {
      const userRef = doc(firestore, this.USERS_COLLECTION, userId);
      await updateDoc(userRef, updates as any);
      
    } catch (error: any) {
      console.error('❌ Failed to update user profile:', error);
      throw new Error('Failed to update user profile: ' + error.message);
    }
  }

  /**
   * Check if username is available
   */
  static async checkUsernameAvailability(
    username: string
  ): Promise<UsernameAvailability> {
    try {
      // Validate username format
      const validation = this.validateUsername(username);
      if (!validation.isValid) {
        return {
          available: false,
          username,
          error: validation.error,
        };
      }
      
      const lowercaseUsername = username.toLowerCase();
      
      // Query Firestore for existing username
      const usersRef = collection(firestore, this.USERS_COLLECTION);
      const q = query(usersRef, where('username', '==', lowercaseUsername));
      const querySnapshot = await getDocs(q);
      
      const available = querySnapshot.empty;
      
      return {
        available,
        username: lowercaseUsername,
        error: available ? undefined : 'Username is already taken',
      };
    } catch (error: any) {
      console.error('❌ Failed to check username availability:', error);
      return {
        available: false,
        username,
        error: 'Failed to check username availability',
      };
    }
  }

  /**
   * Search users by username
   */
  static async searchByUsername(searchTerm: string): Promise<User[]> {
    try {
      const lowercaseSearch = searchTerm.toLowerCase();
      
      const usersRef = collection(firestore, this.USERS_COLLECTION);
      
      // Note: Firestore doesn't support LIKE queries
      // We'll get all users and filter client-side for MVP
      // In production, use Algolia or similar for better search
      const q = query(
        usersRef,
        where('username', '>=', lowercaseSearch),
        where('username', '<=', lowercaseSearch + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      const users: User[] = [];
      
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data(),
        } as User);
      });
      
      return users;
    } catch (error: any) {
      console.error('❌ Failed to search users:', error);
      return [];
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      const lowercaseUsername = username.toLowerCase();
      
      const usersRef = collection(firestore, this.USERS_COLLECTION);
      const q = query(usersRef, where('username', '==', lowercaseUsername));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    } catch (error: any) {
      console.error('❌ Failed to get user by username:', error);
      return null;
    }
  }

  /**
   * Get user's contacts (friends)
   */
  static async getContacts(userId: string): Promise<Contact[]> {
    try {
      // Get contacts subcollection
      const contactsRef = collection(
        firestore,
        this.USERS_COLLECTION,
        userId,
        'contacts'
      );

      const querySnapshot = await getDocs(contactsRef);
      const contacts: Contact[] = [];

      // Fetch full profile for each contact
      for (const contactDoc of querySnapshot.docs) {
        const contactData = contactDoc.data();
        const contactProfile = await this.getProfile(contactDoc.id);

        if (contactProfile) {
          contacts.push({
            userId: contactProfile.id,
            username: contactProfile.username,
            displayName: contactProfile.displayName,
            profilePictureUrl: contactProfile.profilePictureUrl,
            isOnline: contactProfile.isOnline,
            lastSeen: contactProfile.lastSeen,
            addedAt: contactData.addedAt,
          });
        }
      }

      // Sort by display name
      contacts.sort((a, b) => a.displayName.localeCompare(b.displayName));

      return contacts;
    } catch (error: any) {
      console.error('❌ Failed to get contacts:', error);
      return [];
    }
  }

  /**
   * Update user online status
   */
  static async updateOnlineStatus(
    userId: string,
    isOnline: boolean
  ): Promise<void> {
    try {
      const userRef = doc(firestore, this.USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: isOnline ? null : Date.now(),
      });
    } catch (error: any) {
      console.error('❌ Failed to update online status:', error);
    }
  }

  /**
   * Update user's active chat ID (for notification filtering)
   * Set to null when user leaves chat
   */
  static async updateActiveChatId(
    userId: string,
    activeChatId: string | null
  ): Promise<void> {
    try {
      const userRef = doc(firestore, this.USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        activeChatId: activeChatId || null,
      });
    } catch (error: any) {
      console.error('❌ Failed to update active chat ID:', error);
    }
  }

  /**
   * Validate username format
   */
  static validateUsername(username: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!username || username.trim().length === 0) {
      return { isValid: false, error: 'Username is required' };
    }

    const trimmed = username.trim();

    if (trimmed.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters' };
    }

    if (trimmed.length > 20) {
      return { isValid: false, error: 'Username must be less than 20 characters' };
    }

    // Only lowercase letters, numbers, and underscores
    const usernameRegex = /^[a-z0-9_]+$/;
    // Check the original (not lowercased) to ensure no uppercase
    if (!usernameRegex.test(trimmed)) {
      return {
        isValid: false,
        error: 'Username can only contain lowercase letters, numbers, and underscores',
      };
    }

    // Cannot start with a number
    if (/^\d/.test(trimmed)) {
      return { isValid: false, error: 'Username cannot start with a number' };
    }

    return { isValid: true };
  }

  /**
   * Validate display name
   */
  static validateDisplayName(displayName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!displayName || displayName.trim().length === 0) {
      return { isValid: false, error: 'Display name is required' };
    }

    const trimmed = displayName.trim();

    if (trimmed.length < 2) {
      return { isValid: false, error: 'Display name must be at least 2 characters' };
    }

    if (trimmed.length > 50) {
      return { isValid: false, error: 'Display name must be less than 50 characters' };
    }

    return { isValid: true };
  }

  // ===== ALIASES FOR TEST COMPATIBILITY =====

  /**
   * Alias for getProfile (test compatibility)
   */
  static async getUserById(userId: string): Promise<User | null> {
    return this.getProfile(userId);
  }

  /**
   * Alias for createProfile (test compatibility)
   */
  static async createUserProfile(
    userId: string,
    profileData: Partial<User>
  ): Promise<User> {
    return this.createProfile(userId, profileData);
  }

  /**
   * Alias for updateProfile (test compatibility)
   */
  static async updateUserProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<void> {
    return this.updateProfile(userId, updates);
  }

  /**
   * Alias for searchByUsername (test compatibility)
   */
  static async searchUsers(searchTerm: string): Promise<User[]> {
    return this.searchByUsername(searchTerm);
  }

  /**
   * Delete user profile
   */
  static async deleteUserProfile(userId: string): Promise<void> {
    try {
      const userRef = doc(firestore, this.USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        deleted: true,
        deletedAt: Date.now(),
      });
    } catch (error) {
      console.error('❌ Failed to delete user profile:', error);
      throw error;
    }
  }

  /**
   * Validate bio length (test wrapper)
   */
  static validateBio(bio: string): boolean {
    if (!bio) return true; // Optional field
    return bio.length <= 200;
  }
}


