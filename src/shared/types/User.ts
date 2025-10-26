/**
 * User Type Definitions
 * 
 * Defines user-related interfaces and types
 */

/**
 * User profile interface matching Firestore /users/{userId}
 */
export interface User {
  id: string;
  username: string;                // Unique, lowercase, alphanumeric + underscore
  displayName: string;              // User's display name
  email: string;
  profilePictureUrl: string | null; // Firebase Storage URL or null
  phoneNumber: string | null;       // Optional phone number
  phoneNumberVisible: boolean;      // Phone number visibility setting
  bio?: string;                     // Optional bio
  preferredLanguage?: string;       // Preferred language for translations (ISO 639-1 code)
  editableLanguages?: string[];    // Languages user can edit/use (ISO 639-1 codes)
  isOnline: boolean;                // Current online status
  lastSeen: number | null;          // Timestamp of last activity (null if online)
  createdAt: number;                // Account creation timestamp
}

/**
 * User search result (minimal data for search results)
 */
export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  isOnline: boolean;
}

/**
 * User profile update data (partial user)
 */
export interface UserProfileUpdate {
  displayName?: string;
  bio?: string;
  profilePictureUrl?: string | null;
  phoneNumber?: string | null;
  phoneNumberVisible?: boolean;
  preferredLanguage?: string;
  editableLanguages?: string[];
}

/**
 * User presence data (for real-time presence updates)
 */
export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: number | null;
}

/**
 * Username validation result
 */
export interface UsernameAvailability {
  available: boolean;
  username: string;
  error?: string; // Error message if invalid
}


