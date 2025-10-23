/**
 * Database Type Definitions
 * 
 * Defines SQLite table structures and database-related types
 */

/**
 * SQLite table names
 */
export enum TableName {
  Users = 'users',
  Chats = 'chats',
  Messages = 'messages',
  ScrollPositions = 'scroll_positions',
  FriendRequests = 'friend_requests',
  Metadata = 'metadata'
}

/**
 * Database metadata (for schema versioning)
 */
export interface DatabaseMetadata {
  key: string;
  value: string;
}

/**
 * User table row (SQLite)
 */
export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  isOnline: number;                 // SQLite boolean (0 or 1)
  lastSeen: number | null;
  createdAt: number;
}

/**
 * Chat table row (SQLite)
 */
export interface ChatRow {
  id: string;
  type: string;                     // 'one-on-one' or 'group'
  participants: string;             // JSON array of user IDs
  lastMessageText: string;
  lastMessageTime: number;
  lastMessageSenderId: string;
  lastMessageStatus?: string | null; // 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  unreadCount: number;
  groupName: string | null;
  groupIcon: string | null;
  groupDescription: string | null;
  groupAdminId: string | null;
  inviteCode: string | null;
  createdAt: number;
  createdBy: string;
}

/**
 * Message table row (SQLite)
 */
export interface MessageRow {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: string;                   // MessageStatus as string
  type: string;                     // MessageType as string
  imageUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  reactions: string | null;         // JSON object
  deletedForMe: number;             // SQLite boolean (0 or 1)
  deletedForEveryone: number;       // SQLite boolean (0 or 1)
  translations: string | null;      // JSON object of translations
  detectedLanguage: string | null;  // ISO 639-1 language code
  syncStatus: string;               // MessageSyncStatus as string
}

/**
 * Scroll position table row (SQLite)
 */
export interface ScrollPositionRow {
  chatId: string;
  lastReadMessageId: string | null;
  scrollYPosition: number;
  unreadCount: number;
}

/**
 * Friend request table row (SQLite)
 */
export interface FriendRequestRow {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;                   // FriendRequestStatus as string
  createdAt: number;
  respondedAt: number | null;
}

/**
 * Database query result
 */
export interface QueryResult<T> {
  rows: T[];
  rowsAffected: number;
}

/**
 * Database migration
 */
export interface Migration {
  version: number;
  name: string;
  up: string[];                     // SQL statements to apply migration
  down?: string[];                  // SQL statements to rollback (optional)
}

/**
 * Database initialization result
 */
export interface DatabaseInitResult {
  success: boolean;
  version: number;
  message: string;
}

/**
 * Database transaction callback
 */
export type TransactionCallback = (tx: any) => void;

/**
 * Database error
 */
export interface DatabaseError {
  message: string;
  sql?: string;
  error: Error;
}


