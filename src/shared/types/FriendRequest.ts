/**
 * Friend Request Type Definitions
 * 
 * Defines friend request-related interfaces and types
 */

/**
 * Friend request status enum
 */
export type FriendRequestStatus = 'pending' | 'accepted' | 'ignored' | 'blocked';

/**
 * Friend request interface matching Firestore /friendRequests/{requestId}
 */
export interface FriendRequest {
  id: string;
  fromUserId: string;               // User who sent the request
  toUserId: string;                 // User who received the request
  status: FriendRequestStatus;      // pending | accepted | ignored | blocked
  createdAt: number;                // Request creation timestamp
  respondedAt: number | null;       // Response timestamp (null if pending)
  
  // UI fields (not in Firestore)
  fromUserName?: string;            // Sender's display name
  fromUserAvatar?: string | null;   // Sender's profile picture
  fromUserUsername?: string;        // Sender's username
}

/**
 * Send friend request data
 */
export interface SendFriendRequestData {
  fromUserId: string;
  toUserId: string;
}

/**
 * Friend request action data
 */
export interface FriendRequestAction {
  requestId: string;
  action: 'accept' | 'ignore' | 'block';
}

/**
 * Contact (friend) interface
 */
export interface Contact {
  userId: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  isOnline: boolean;
  lastSeen: number | null;
  addedAt: number;                  // When became contacts
}

/**
 * Blocked user interface
 */
export interface BlockedUser {
  userId: string;
  username: string;
  displayName: string;
  blockedAt: number;
}


