/**
 * SQLite Database Schema
 * 
 * Defines all database tables and their structure
 */

/**
 * Database schema version
 * Increment this when making schema changes
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Database name
 */
export const DATABASE_NAME = 'messageai.db';

/**
 * Create users table
 */
export const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    displayName TEXT NOT NULL,
    profilePictureUrl TEXT,
    isOnline INTEGER DEFAULT 0,
    lastSeen INTEGER,
    createdAt INTEGER NOT NULL,
    UNIQUE(username)
  );
`;

/**
 * Create chats table
 */
export const CREATE_CHATS_TABLE = `
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    participants TEXT NOT NULL,
    lastMessageText TEXT,
    lastMessageTime INTEGER,
    lastMessageSenderId TEXT,
    lastMessageStatus TEXT,
    unreadCount INTEGER DEFAULT 0,
    groupName TEXT,
    groupIcon TEXT,
    groupDescription TEXT,
    groupAdminId TEXT,
    inviteCode TEXT,
    createdAt INTEGER NOT NULL,
    createdBy TEXT NOT NULL
  );
`;

/**
 * Create messages table
 */
export const CREATE_MESSAGES_TABLE = `
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chatId TEXT NOT NULL,
    senderId TEXT NOT NULL,
    text TEXT,
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL,
    type TEXT NOT NULL,
    imageUrl TEXT,
    thumbnailUrl TEXT,
    caption TEXT,
    reactions TEXT,
    deletedForMe INTEGER DEFAULT 0,
    deletedForEveryone INTEGER DEFAULT 0,
    syncStatus TEXT DEFAULT 'synced',
    FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
  );
`;

/**
 * Create scroll_positions table
 */
export const CREATE_SCROLL_POSITIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS scroll_positions (
    chatId TEXT PRIMARY KEY,
    lastReadMessageId TEXT,
    scrollYPosition INTEGER DEFAULT 0,
    unreadCount INTEGER DEFAULT 0,
    FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
  );
`;

/**
 * Create friend_requests table
 */
export const CREATE_FRIEND_REQUESTS_TABLE = `
  CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    fromUserId TEXT NOT NULL,
    toUserId TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    respondedAt INTEGER
  );
`;

/**
 * Create metadata table (for schema versioning)
 */
export const CREATE_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

/**
 * Create indexes for performance optimization
 */
export const CREATE_INDEXES = [
  // Messages indexes
  `CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_chatId_timestamp ON messages(chatId, timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_syncStatus ON messages(syncStatus)`,
  
  // Chats indexes
  `CREATE INDEX IF NOT EXISTS idx_chats_lastMessageTime ON chats(lastMessageTime)`,
  
  // Users indexes
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
  
  // Friend requests indexes
  `CREATE INDEX IF NOT EXISTS idx_friend_requests_toUserId ON friend_requests(toUserId)`,
  `CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status)`,
];

/**
 * All table creation statements
 */
export const CREATE_ALL_TABLES = [
  CREATE_METADATA_TABLE,
  CREATE_USERS_TABLE,
  CREATE_CHATS_TABLE,
  CREATE_MESSAGES_TABLE,
  CREATE_SCROLL_POSITIONS_TABLE,
  CREATE_FRIEND_REQUESTS_TABLE,
  ...CREATE_INDEXES,
];

/**
 * Drop all tables (for testing/reset)
 */
export const DROP_ALL_TABLES = [
  'DROP TABLE IF EXISTS scroll_positions;',
  'DROP TABLE IF EXISTS friend_requests;',
  'DROP TABLE IF EXISTS messages;',
  'DROP TABLE IF EXISTS chats;',
  'DROP TABLE IF EXISTS users;',
  'DROP TABLE IF EXISTS metadata;',
];


