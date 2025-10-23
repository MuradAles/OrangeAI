/**
 * Authentication Service
 * 
 * Handles all Firebase Authentication operations
 * Email/Password authentication (Google Sign-In skipped for MVP)
 */

import {
  createUserWithEmailAndPassword,
  sendEmailVerification as firebaseSendEmailVerification,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from './FirebaseConfig';

/**
 * Authentication Service
 */
export class AuthService {
  /**
   * Sign up with email and password
   */
  static async signUpWithEmail(
    email: string,
    password: string
  ): Promise<FirebaseUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      // User created successfully
      return userCredential.user;
    } catch (error: any) {
      // Don't log auth errors - they're expected user scenarios, not app errors
      // The UI will handle displaying the message to the user
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  static async signInWithEmail(
    email: string,
    password: string
  ): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      // User signed in successfully
      return userCredential.user;
    } catch (error: any) {
      // Don't log credential errors - they're expected user scenarios, not app errors
      // The UI will handle displaying the message to the user
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      // User signed out successfully
    } catch (error: any) {
      console.error('❌ Sign out failed:', error.message);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send email verification to current user
   */
  static async sendEmailVerification(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }
      
      if (user.emailVerified) {
        // Email already verified
        return;
      }
      
      await firebaseSendEmailVerification(user);
      // Verification email sent successfully
    } catch (error: any) {
      console.error('❌ Failed to send verification email:', error.message);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      // Password reset email sent successfully
    } catch (error: any) {
      // Don't log auth errors - they're expected user scenarios, not app errors
      throw this.handleAuthError(error);
    }
  }

  /**
   * Check if current user's email is verified
   */
  static async isEmailVerified(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    
    // Reload user to get latest verification status
    await user.reload();
    return user.emailVerified;
  }

  /**
   * Get current user
   */
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Get current user ID
   */
  static getCurrentUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  /**
   * Listen to authentication state changes
   */
  static onAuthStateChanged(
    callback: (user: FirebaseUser | null) => void
  ): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Update user profile (display name)
   */
  static async updateUserProfile(displayName: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }
      
      await updateProfile(user, { displayName });
      // User profile updated successfully
    } catch (error: any) {
      console.error('❌ Failed to update profile:', error.message);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Handle Firebase Auth errors and return user-friendly messages
   */
  private static handleAuthError(error: any): Error {
    const errorCode = error.code;
    let message = error.message;

    switch (errorCode) {
      case 'auth/email-already-in-use':
        message = 'This email is already registered. Please sign in instead.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address format.';
        break;
      case 'auth/operation-not-allowed':
        message = 'Email/password authentication is not enabled.';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak. Please use at least 6 characters.';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        // Group these together for security (prevents user enumeration)
        message = 'Incorrect email or password';
        break;
      case 'auth/invalid-credential':
        // This error is used in newer Firebase versions for security (prevents user enumeration)
        message = 'Incorrect email or password';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection.';
        break;
      case 'auth/missing-password':
        message = 'Please enter your password.';
        break;
      case 'auth/invalid-login-credentials':
        message = 'Incorrect email or password';
        break;
      default:
        message = error.message || 'An unknown error occurred.';
    }

    return new Error(message);
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}


