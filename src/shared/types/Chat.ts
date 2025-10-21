/**
 * Chat Type Definitions
 * 
 * Defines chat-related interfaces and types
 */

/**
 * Chat type enum
 */
export type ChatType = 'one-on-one' | 'group';

/**
 * User role in a chat (for groups)
 */
export type ChatRole = 'admin' | 'member';

/**
 * Chat interface matching Firestore /chats/{chatId}
 */
export interface Chat {
  id: string;
  type: ChatType;                   // 'one-on-one' or 'group'
  participants: string[];           // Array of user IDs
  lastMessageText: string;          // Preview text of last message
  lastMessageTime: number;          // Timestamp of last message
  lastMessageSenderId: string;      // Who sent the last message
  createdAt: number;                // Chat creation timestamp
  createdBy: string;                // User ID who created the chat
  
  // Group-specific fields (null for one-on-one)
  groupName?: string | null;
  groupIcon?: string | null;        // Firebase Storage URL
  groupDescription?: string | null;
  groupAdminId?: string | null;     // Current admin user ID
  inviteCode?: string | null;       // Permanent invite code for groups
  
  // UI-specific fields (not in Firestore)
  unreadCount?: number;             // Local unread count (from SQLite)
  otherUserName?: string;           // For one-on-one: other user's display name
  otherUserAvatar?: string | null;  // For one-on-one: other user's profile picture
  otherUserOnline?: boolean;        // For one-on-one: other user's online status
}

/**
 * Chat participant details
 * Matches Firestore /chats/{chatId}/participants/{userId}
 */
export interface ChatParticipant {
  userId: string;
  role: ChatRole;                   // 'admin' or 'member'
  joinedAt: number;                 // Timestamp when joined
  lastReadMessageId: string | null; // Last message read by this user
  lastReadTimestamp: number | null; // Timestamp of last read
  unreadCount: number;              // Number of unread messages
}

/**
 * Chat creation data
 */
export interface CreateChatData {
  type: ChatType;
  participants: string[];           // User IDs
  groupName?: string;               // Required for groups
  groupDescription?: string;
  groupIcon?: string;               // Firebase Storage URL
}

/**
 * Group chat update data
 */
export interface UpdateGroupData {
  groupName?: string;
  groupDescription?: string;
  groupIcon?: string;
}

/**
 * Chat list item (optimized for display)
 */
export interface ChatListItem {
  id: string;
  type: ChatType;
  name: string;                     // Display name (username or group name)
  avatar: string | null;            // Profile picture or group icon
  lastMessage: string;              // Last message preview
  lastMessageTime: number;
  unreadCount: number;
  isOnline: boolean;                // For one-on-one chats
  isTyping: boolean;                // Typing indicator
}


