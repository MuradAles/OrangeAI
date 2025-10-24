/**
 * Message Type Definitions
 * 
 * Defines message-related interfaces and types
 */

/**
 * Message type enum
 */
export type MessageType = 'text' | 'image';

/**
 * Message status enum
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Message sync status (for offline queue)
 */
export type MessageSyncStatus = 'synced' | 'pending' | 'failed';

/**
 * Message interface matching Firestore /chats/{chatId}/messages/{messageId}
 */
export interface Message {
  id: string;
  chatId: string;
  senderId: string;                 // User ID of sender
  text: string;                     // Message content (max 4,096 characters)
  timestamp: number;                // Message timestamp
  status: MessageStatus;            // sending | sent | delivered | read
  type: MessageType;                // text | image
  
  // Image-specific fields (for image messages)
  imageUrl?: string | null;         // Firebase Storage URL (full resolution)
  thumbnailUrl?: string | null;     // Firebase Storage URL (200x200px)
  caption?: string | null;          // Image caption (max 1,024 characters)
  
  // Interactions
  reactions?: MessageReactions;     // Emoji reactions { "😂": ["userId1"], "❤️": ["userId2", "userId3"] }
  
  // Deletion
  deletedFor?: string[];            // Array of user IDs who deleted "for me"
  deletedForEveryone?: boolean;     // True if deleted for everyone
  deletedAt?: number | null;        // Timestamp when deleted
  
  // AI Translation
  translations?: MessageTranslations; // Translations { "es": "Translated text", "fr": "..." }
  detectedLanguage?: string;         // Auto-detected source language (ISO 639-1 code)
  
  // Translation metadata (for sent-as-translation feature)
  originalText?: string;             // Original text when sent as translation
  originalLanguage?: string;         // Language of original text (ISO 639-1)
  translatedTo?: string;             // Target language for translation (ISO 639-1)
  sentAsTranslation?: boolean;       // True if message was sent as translation
  
  // Local fields (SQLite only)
  syncStatus?: MessageSyncStatus;   // synced | pending | failed (for offline queue)
  
  // UI fields (computed)
  senderName?: string;              // Sender's display name (for groups)
  senderAvatar?: string | null;     // Sender's profile picture
  isGrouped?: boolean;              // True if grouped with previous message
}

/**
 * Message reactions map
 * Key: emoji, Value: array of user IDs who reacted with that emoji
 */
export interface MessageReactions {
  [emoji: string]: string[];
}

/**
 * Message translations map with cultural analysis
 * Key: language code (ISO 639-1), Value: translation with cultural data
 * Example: { 
 *   "es": { text: "¡Hola!", culturalAnalysis: {...} },
 *   "fr": { text: "Bonjour!", culturalAnalysis: {...} }
 * }
 */
export interface MessageTranslations {
  [languageCode: string]: MessageTranslation | string; // string for backward compatibility
}

/**
 * Single translation with optional cultural analysis and formality detection
 */
export interface MessageTranslation {
  text: string;
  formalityLevel?: 'casual' | 'formal' | 'professional' | 'friendly'; // Detected formality level
  formalityIndicators?: string[]; // What made us detect this level (e.g., ["informal greeting", "slang"])
  culturalAnalysis?: {
    culturalPhrases: Array<{
      phrase: string;
      position: [number, number];
      meaning: string;
      culturalContext: string;
      examples: string[];
      confidence: number;
    }>;
    slangExpressions: Array<{
      slang: string;
      position: [number, number];
      meaning: string;
      formalEquivalent: string;
      usage: string;
      confidence: number;
    }>;
  };
}

/**
 * Message send data (for creating new messages)
 */
export interface SendMessageData {
  chatId: string;
  text: string;
  type: MessageType;
  imageUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
}

/**
 * Message update data (for editing status, reactions, etc.)
 */
export interface UpdateMessageData {
  status?: MessageStatus;
  reactions?: MessageReactions;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  deletedAt?: number;
}

/**
 * Typing indicator data
 */
export interface TypingIndicator {
  chatId: string;
  userId: string;
  username: string;
  timestamp: number;
}

/**
 * Message group (for UI rendering - messages from same sender within 1 minute)
 */
export interface MessageGroup {
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  messages: Message[];
  timestamp: number;
}

/**
 * Unread message count per chat
 */
export interface UnreadCount {
  chatId: string;
  count: number;
  lastMessageId: string;
}

/**
 * Scroll position data (for resuming at last read position)
 */
export interface ScrollPosition {
  chatId: string;
  lastReadMessageId: string | null;
  scrollYPosition: number;
  unreadCount: number;
}

/**
 * Queued message for offline queue with retry metadata
 */
export interface QueuedMessage extends Message {
  retryCount: number;
  lastAttempt: number | null;
}


