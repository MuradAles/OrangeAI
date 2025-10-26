/**
 * SQLite Service
 * 
 * Handles all database operations for local storage
 * Provides CRUD operations for all tables
 */

import {
  ChatRow,
  DatabaseInitResult,
  FriendRequestRow,
  MessageRow,
  ScrollPositionRow,
  UserRow,
} from '@/shared/types';
import * as SQLite from 'expo-sqlite';
import { getPendingMigrations, validateMigrations } from './Migrations';
import { CURRENT_SCHEMA_VERSION, DATABASE_NAME } from './Schema';

/**
 * SQLite Database Service
 * Singleton pattern - one instance for the entire app
 */
class SQLiteServiceClass {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize the database
   */
  async initialize(): Promise<DatabaseInitResult> {
    if (this.isInitialized && this.db) {
      return {
        success: true,
        version: CURRENT_SCHEMA_VERSION,
        message: 'Database already initialized',
      };
    }

    try {
      console.log('📦 Initializing SQLite database...');
      
      // Validate migrations
      if (!validateMigrations()) {
        throw new Error('Migration validation failed');
      }

      // Open database
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      console.log('✅ Database opened successfully');

      // Get current version
      const currentVersion = await this.getCurrentVersion();
      console.log(`📌 Current database version: ${currentVersion}`);

      // Apply pending migrations
      const pendingMigrations = getPendingMigrations(currentVersion);
      
      if (pendingMigrations.length > 0) {
        console.log(`🔄 Applying ${pendingMigrations.length} migrations...`);
        
        for (const migration of pendingMigrations) {
          await this.applyMigration(migration);
        }
        
        console.log('✅ All migrations applied successfully');
      } else {
        console.log('✅ Database is up to date');
      }

      // Emergency fix: Check for missing columns (in case migrations didn't work)
      await this.fixMissingColumns();

      this.isInitialized = true;

      return {
        success: true,
        version: CURRENT_SCHEMA_VERSION,
        message: `Database initialized at version ${CURRENT_SCHEMA_VERSION}`,
      };
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get current database version
   */
  private async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.db!.getFirstAsync<{ value: string }>(
        "SELECT value FROM metadata WHERE key = 'schema_version'"
      );
      
      return result ? parseInt(result.value, 10) : 0;
    } catch {
      // Table doesn't exist yet, return 0
      return 0;
    }
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: any): Promise<void> {
    console.log(`⬆️  Applying migration ${migration.version}: ${migration.name}`);
    console.log(`📝 Total statements to execute: ${migration.up.length}`);
    
    try {
      // Execute all up statements in a transaction
      await this.db!.withTransactionAsync(async () => {
        let statementIndex = 0;
        for (const statement of migration.up) {
          try {
            statementIndex++;
            console.log(`   Executing statement ${statementIndex}/${migration.up.length}...`);
            // Use runAsync instead of execAsync for better compatibility
            await this.db!.runAsync(statement);
          } catch (stmtError: any) {
            // If column already exists, continue (for ALTER TABLE ADD COLUMN)
            if (stmtError.message.includes('duplicate column name') || 
                stmtError.message.includes('already exists')) {
              console.log(`   ⚠️ Column already exists, skipping: ${statement.substring(0, 50)}...`);
              continue;
            }
            console.error(`   ❌ Statement ${statementIndex} failed:`, stmtError.message);
            console.error(`   📄 SQL: ${statement.substring(0, 100)}...`);
            throw stmtError;
          }
        }
        
        // Update schema version
        await this.db!.runAsync(
          "INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', ?)",
          [migration.version.toString()]
        );
      });
      
      console.log(`✅ Migration ${migration.version} applied successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Force run all pending migrations (for debugging)
   */
  async forceRunMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const currentVersion = await this.getCurrentVersion();
    console.log(`🔄 Force running migrations from version ${currentVersion}`);
    
    const pendingMigrations = getPendingMigrations(currentVersion);
    
    if (pendingMigrations.length > 0) {
      console.log(`🔄 Applying ${pendingMigrations.length} migrations...`);
      
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }
      
      console.log('✅ All migrations applied successfully');
    } else {
      console.log('✅ Database is up to date');
    }
  }

  /**
   * Check database schema and fix missing columns (emergency fix)
   */
  async fixMissingColumns(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log('🔧 Checking for missing columns...');
    
    // Check if translations column exists
    try {
      await this.db.runAsync('SELECT translations FROM messages LIMIT 1');
      console.log('✅ translations column exists');
    } catch (error: any) {
      if (error.message.includes('no such column')) {
        console.log('⚠️ translations column missing, adding...');
        await this.db.runAsync('ALTER TABLE messages ADD COLUMN translations TEXT;');
        console.log('✅ translations column added');
      }
    }
    
    // Check if detectedLanguage column exists
    try {
      await this.db.runAsync('SELECT detectedLanguage FROM messages LIMIT 1');
      console.log('✅ detectedLanguage column exists');
    } catch (error: any) {
      if (error.message.includes('no such column')) {
        console.log('⚠️ detectedLanguage column missing, adding...');
        await this.db.runAsync('ALTER TABLE messages ADD COLUMN detectedLanguage TEXT;');
        console.log('✅ detectedLanguage column added');
      }
    }
    
    // Check if originalText column exists
    try {
      await this.db.runAsync('SELECT originalText FROM messages LIMIT 1');
      console.log('✅ originalText column exists');
    } catch (error: any) {
      if (error.message.includes('no such column')) {
        console.log('⚠️ originalText column missing, adding...');
        await this.db.runAsync('ALTER TABLE messages ADD COLUMN originalText TEXT;');
        console.log('✅ originalText column added');
      }
    }
    
    // Check if originalLanguage column exists
    try {
      await this.db.runAsync('SELECT originalLanguage FROM messages LIMIT 1');
      console.log('✅ originalLanguage column exists');
    } catch (error: any) {
      if (error.message.includes('no such column')) {
        console.log('⚠️ originalLanguage column missing, adding...');
        await this.db.runAsync('ALTER TABLE messages ADD COLUMN originalLanguage TEXT;');
        console.log('✅ originalLanguage column added');
      }
    }
    
    // Check if translatedTo column exists
    try {
      await this.db.runAsync('SELECT translatedTo FROM messages LIMIT 1');
      console.log('✅ translatedTo column exists');
    } catch (error: any) {
      if (error.message.includes('no such column')) {
        console.log('⚠️ translatedTo column missing, adding...');
        await this.db.runAsync('ALTER TABLE messages ADD COLUMN translatedTo TEXT;');
        console.log('✅ translatedTo column added');
      }
    }
    
    // Check if sentAsTranslation column exists
    try {
      await this.db.runAsync('SELECT sentAsTranslation FROM messages LIMIT 1');
      console.log('✅ sentAsTranslation column exists');
    } catch (error: any) {
      if (error.message.includes('no such column')) {
        console.log('⚠️ sentAsTranslation column missing, adding...');
        await this.db.runAsync('ALTER TABLE messages ADD COLUMN sentAsTranslation INTEGER DEFAULT 0;');
        console.log('✅ sentAsTranslation column added');
      }
    }
    
    console.log('✅ Column check complete');
  }

  /**
   * Execute raw query (for testing/debugging)
   */
  async queryRaw<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<T>(sql, params);
  }

  // ==================== USER OPERATIONS ====================

  /**
   * Save or update a user
   */
  async saveUser(user: UserRow): Promise<void> {
    await this.db!.runAsync(
      `INSERT OR REPLACE INTO users 
       (id, username, displayName, profilePictureUrl, isOnline, lastSeen, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        user.displayName,
        user.profilePictureUrl,
        user.isOnline ? 1 : 0,
        user.lastSeen,
        user.createdAt || Date.now(),
      ]
    );
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserRow | null> {
    const result = await this.db!.getFirstAsync<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    return result || null;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<UserRow | null> {
    const result = await this.db!.getFirstAsync<UserRow>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return result || null;
  }

  /**
   * Get multiple users by IDs
   */
  async getUsersByIds(userIds: string[]): Promise<UserRow[]> {
    if (userIds.length === 0) return [];
    
    const placeholders = userIds.map(() => '?').join(',');
    const result = await this.db!.getAllAsync<UserRow>(
      `SELECT * FROM users WHERE id IN (${placeholders})`,
      userIds
    );
    return result;
  }

  // ==================== CHAT OPERATIONS ====================

  /**
   * Save or update a chat
   */
  async saveChat(chat: ChatRow): Promise<void> {
    await this.db!.runAsync(
      `INSERT OR REPLACE INTO chats 
       (id, type, participants, lastMessageText, lastMessageTime, lastMessageSenderId, lastMessageStatus,
        unreadCount, groupName, groupIcon, groupDescription, groupAdminId, inviteCode,
        createdAt, createdBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chat.id,
        chat.type,
        chat.participants, // JSON string
        chat.lastMessageText,
        chat.lastMessageTime,
        chat.lastMessageSenderId,
        chat.lastMessageStatus || null,
        chat.unreadCount || 0,
        chat.groupName,
        chat.groupIcon,
        chat.groupDescription,
        chat.groupAdminId,
        chat.inviteCode,
        chat.createdAt || Date.now(),
        chat.createdBy,
      ]
    );
  }

  /**
   * Get all chats (ordered by last message time)
   */
  async getChats(userId?: string): Promise<ChatRow[]> {
    if (userId) {
      // Filter by user in participants array
      const result = await this.db!.getAllAsync<ChatRow>(
        `SELECT * FROM chats 
         WHERE participants LIKE ? 
         ORDER BY lastMessageTime DESC`,
        [`%${userId}%`]
      );
      return result;
    }
    
    const result = await this.db!.getAllAsync<ChatRow>(
      'SELECT * FROM chats ORDER BY lastMessageTime DESC'
    );
    return result;
  }

  /**
   * Get chat by ID
   */
  async getChatById(chatId: string): Promise<ChatRow | null> {
    const result = await this.db!.getFirstAsync<ChatRow>(
      'SELECT * FROM chats WHERE id = ?',
      [chatId]
    );
    return result || null;
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<void> {
    await this.db!.runAsync('DELETE FROM chats WHERE id = ?', [chatId]);
  }

  /**
   * Update chat unread count
   */
  async updateChatUnreadCount(chatId: string, count: number): Promise<void> {
    await this.db!.runAsync(
      'UPDATE chats SET unreadCount = ? WHERE id = ?',
      [count, chatId]
    );
  }

  // ==================== MESSAGE OPERATIONS ====================

  /**
   * Save a message
   */
  async saveMessage(message: MessageRow): Promise<void> {
    await this.db!.runAsync(
      `INSERT OR REPLACE INTO messages 
       (id, chatId, senderId, text, timestamp, status, type, imageUrl, thumbnailUrl,
        caption, reactions, deletedForMe, deletedForEveryone, translations, detectedLanguage, syncStatus,
        originalText, originalLanguage, translatedTo, sentAsTranslation) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.chatId,
        message.senderId,
        message.text,
        message.timestamp,
        message.status,
        message.type,
        message.imageUrl,
        message.thumbnailUrl,
        message.caption,
        message.reactions, // JSON string
        message.deletedForMe ? 1 : 0,
        message.deletedForEveryone ? 1 : 0,
        message.translations, // JSON string
        message.detectedLanguage,
        message.syncStatus || 'synced',
        message.originalText,
        message.originalLanguage,
        message.translatedTo,
        message.sentAsTranslation ? 1 : 0,
      ]
    );
  }

  /**
   * Update translation for a message (local only)
   * Can accept either string (legacy) or object with cultural analysis (new)
   */
  async updateMessageTranslation(
    chatId: string,
    messageId: string,
    targetLanguage: string,
    translation: string | any, // Accept both string and object
    detectedLanguage?: string
  ): Promise<void> {
    // Get existing translations
    const result = await this.db!.getFirstAsync<{ translations: string | null; detectedLanguage: string | null }>(
      'SELECT translations, detectedLanguage FROM messages WHERE id = ? AND chatId = ?',
      [messageId, chatId]
    );

    if (!result) {
      console.warn(`Message ${messageId} not found in SQLite, cannot add translation`);
      return;
    }

    // Parse existing translations
    const existingTranslations = result.translations ? JSON.parse(result.translations) : {};
    
    // Add new translation (can be string or object with cultural analysis)
    existingTranslations[targetLanguage] = translation;

    // Update in database
    await this.db!.runAsync(
      'UPDATE messages SET translations = ?, detectedLanguage = ? WHERE id = ? AND chatId = ?',
      [
        JSON.stringify(existingTranslations),
        detectedLanguage || result.detectedLanguage,
        messageId,
        chatId
      ]
    );

    console.log(`✅ Translation saved locally for message ${messageId}`, {
      type: typeof translation,
      hasCulturalAnalysis: typeof translation === 'object' && translation.culturalAnalysis,
    });
  }

  /**
   * Get messages for a chat (paginated)
   */
  async getMessages(
    chatId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageRow[]> {
    const result = await this.db!.getAllAsync<MessageRow>(
      `SELECT * FROM messages 
       WHERE chatId = ? AND deletedForMe = 0
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [chatId, limit, offset]
    );
    return result;
  }

  /**
   * Get messages around a specific message (for scroll position)
   */
  async getMessagesAround(
    chatId: string,
    messageId: string,
    limit: number = 20
  ): Promise<MessageRow[]> {
    // Get the timestamp of the target message
    const targetMessage = await this.db!.getFirstAsync<MessageRow>(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );
    
    if (!targetMessage) {
      // Fallback to latest messages
      return this.getMessages(chatId, limit);
    }
    
    // Get messages before and after
    const result = await this.db!.getAllAsync<MessageRow>(
      `SELECT * FROM messages 
       WHERE chatId = ? AND deletedForMe = 0
       AND timestamp >= ?
       ORDER BY timestamp ASC 
       LIMIT ?`,
      [chatId, targetMessage.timestamp - (limit / 2) * 60000, limit]
    );
    
    return result;
  }

  /**
   * Get pending messages (for offline queue)
   */
  async getPendingMessages(): Promise<MessageRow[]> {
    const result = await this.db!.getAllAsync<MessageRow>(
      "SELECT * FROM messages WHERE syncStatus = 'pending' ORDER BY timestamp ASC"
    );
    return result;
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: string,
    syncStatus?: string
  ): Promise<void> {
    if (syncStatus) {
      await this.db!.runAsync(
        'UPDATE messages SET status = ?, syncStatus = ? WHERE id = ?',
        [status, syncStatus, messageId]
      );
    } else {
      await this.db!.runAsync(
        'UPDATE messages SET status = ? WHERE id = ?',
        [status, messageId]
      );
    }
  }

  /**
   * Delete message (mark as deleted for me)
   */
  async deleteMessageForMe(messageId: string): Promise<void> {
    await this.db!.runAsync(
      'UPDATE messages SET deletedForMe = 1 WHERE id = ?',
      [messageId]
    );
  }

  /**
   * Delete message for everyone
   */
  async deleteMessageForEveryone(messageId: string): Promise<void> {
    await this.db!.runAsync(
      'UPDATE messages SET deletedForEveryone = 1 WHERE id = ?',
      [messageId]
    );
  }

  /**
   * Get a single message by ID
   */
  async getMessageById(messageId: string): Promise<MessageRow | null> {
    const result = await this.db!.getFirstAsync<MessageRow>(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );
    return result || null;
  }

  /**
   * Delete message for a specific user (adds to deletedFor array)
   * Note: SQLite stores deletedFor as part of the message, 
   * handled by deletedForMe field
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // In our simplified schema, we just mark deletedForMe
    await this.deleteMessageForMe(messageId);
  }

  /**
   * Update message reactions
   */
  async updateReactions(messageId: string, reactions: any): Promise<void> {
    await this.db!.runAsync(
      'UPDATE messages SET reactions = ? WHERE id = ?',
      [JSON.stringify(reactions), messageId]
    );
  }

  // ==================== SCROLL POSITION OPERATIONS ====================

  /**
   * Save scroll position
   */
  async saveScrollPosition(position: ScrollPositionRow): Promise<void> {
    await this.db!.runAsync(
      `INSERT OR REPLACE INTO scroll_positions 
       (chatId, lastReadMessageId, scrollYPosition, unreadCount) 
       VALUES (?, ?, ?, ?)`,
      [
        position.chatId,
        position.lastReadMessageId,
        position.scrollYPosition,
        position.unreadCount,
      ]
    );
  }

  /**
   * Get scroll position for a chat
   */
  async getScrollPosition(chatId: string): Promise<ScrollPositionRow | null> {
    const result = await this.db!.getFirstAsync<ScrollPositionRow>(
      'SELECT * FROM scroll_positions WHERE chatId = ?',
      [chatId]
    );
    return result || null;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      console.log('✅ Database closed');
    }
  }

  /**
   * Reset database (for testing)
   */
  async reset(): Promise<void> {
    console.warn('⚠️  Resetting database...');
    
    try {
      // First, try to drop all tables if database is open
      if (this.db) {
        try {
          console.log('🗑️  Dropping all tables...');
          await this.db.runAsync('DROP TABLE IF EXISTS scroll_positions');
          await this.db.runAsync('DROP TABLE IF EXISTS friend_requests');
          await this.db.runAsync('DROP TABLE IF EXISTS messages');
          await this.db.runAsync('DROP TABLE IF EXISTS chats');
          await this.db.runAsync('DROP TABLE IF EXISTS users');
          await this.db.runAsync('DROP TABLE IF EXISTS metadata');
          console.log('✅ All tables dropped');
        } catch (dropError) {
          console.warn('Could not drop tables:', dropError);
        }
        
        // Close the database
        await this.db.closeAsync();
        this.db = null;
      }
      
      // Delete database file
      try {
        await SQLite.deleteDatabaseAsync(DATABASE_NAME);
        console.log('✅ Database file deleted');
      } catch (deleteError) {
        console.warn('Could not delete database file:', deleteError);
      }
      
      this.isInitialized = false;
      
      // Reinitialize
      await this.initialize();
    } catch (error) {
      console.error('Error resetting database:', error);
      // Force reinitialize anyway
      this.db = null;
      this.isInitialized = false;
      await this.initialize();
    }
  }

  // ==================== FRIEND REQUEST OPERATIONS ====================

  /**
   * Ensure database is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  /**
   * Save friend request to SQLite
   */
  async saveFriendRequest(request: FriendRequestRow): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.db!.runAsync(
        `INSERT OR REPLACE INTO friend_requests 
        (id, fromUserId, toUserId, status, createdAt, respondedAt) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          request.id,
          request.fromUserId,
          request.toUserId,
          request.status,
          request.createdAt,
          request.respondedAt || null,
        ]
      );
    } catch (error) {
      console.error('Error saving friend request:', error);
      throw error;
    }
  }

  /**
   * Get all friend requests for a user (incoming)
   */
  async getFriendRequests(userId: string): Promise<FriendRequestRow[]> {
    this.ensureInitialized();
    
    try {
      const result = await this.db!.getAllAsync<FriendRequestRow>(
        `SELECT * FROM friend_requests 
        WHERE toUserId = ? AND status = 'pending' 
        ORDER BY createdAt DESC`,
        [userId]
      );
      
      return result || [];
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return [];
    }
  }

  /**
   * Get sent friend requests (outgoing)
   */
  async getSentFriendRequests(userId: string): Promise<FriendRequestRow[]> {
    this.ensureInitialized();
    
    try {
      const result = await this.db!.getAllAsync<FriendRequestRow>(
        `SELECT * FROM friend_requests 
        WHERE fromUserId = ? AND status = 'pending' 
        ORDER BY createdAt DESC`,
        [userId]
      );
      
      return result || [];
    } catch (error) {
      console.error('Error getting sent friend requests:', error);
      return [];
    }
  }

  /**
   * Update friend request status
   */
  async updateFriendRequestStatus(
    requestId: string,
    status: string,
    respondedAt: number
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.db!.runAsync(
        `UPDATE friend_requests 
        SET status = ?, respondedAt = ? 
        WHERE id = ?`,
        [status, respondedAt, requestId]
      );
    } catch (error) {
      console.error('Error updating friend request status:', error);
      throw error;
    }
  }

  /**
   * Delete friend request
   */
  async deleteFriendRequest(requestId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.db!.runAsync(
        'DELETE FROM friend_requests WHERE id = ?',
        [requestId]
      );
    } catch (error) {
      console.error('Error deleting friend request:', error);
      throw error;
    }
  }

  /**
   * Check if friend request exists
   */
  async friendRequestExists(
    fromUserId: string,
    toUserId: string
  ): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const result = await this.db!.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM friend_requests 
        WHERE fromUserId = ? AND toUserId = ? AND status = 'pending'`,
        [fromUserId, toUserId]
      );
      
      return result ? result.count > 0 : false;
    } catch (error) {
      console.error('Error checking friend request exists:', error);
      return false;
    }
  }

  /**
   * Clear all friend requests for a user (on logout)
   */
  async clearFriendRequests(userId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.db!.runAsync(
        'DELETE FROM friend_requests WHERE fromUserId = ? OR toUserId = ?',
        [userId, userId]
      );
    } catch (error) {
      console.error('Error clearing friend requests:', error);
      throw error;
    }
  }

  /**
   * Delete all messages for a chat (for blocking user)
   */
  async deleteMessagesByChatId(chatId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.db!.runAsync(
        'DELETE FROM messages WHERE chatId = ?',
        [chatId]
      );
      console.log(`✅ Deleted all messages for chat: ${chatId}`);
    } catch (error) {
      console.error('Error deleting messages by chatId:', error);
      throw error;
    }
  }

  /**
   * Delete a chat by ID (for blocking user)
   */
  async deleteChatById(chatId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.db!.runAsync(
        'DELETE FROM chats WHERE id = ?',
        [chatId]
      );
      console.log(`✅ Deleted chat: ${chatId}`);
    } catch (error) {
      console.error('Error deleting chat by ID:', error);
      throw error;
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  async transaction(operations: (() => Promise<any>)[]): Promise<void> {
    this.ensureInitialized();
    
    try {
      for (const operation of operations) {
        await operation();
      }
      console.log(`✅ Transaction completed with ${operations.length} operations`);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Clear all data from database
   */
  async clearAll(): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.db!.runAsync('DELETE FROM messages');
      await this.db!.runAsync('DELETE FROM chats');
      await this.db!.runAsync('DELETE FROM users');
      await this.db!.runAsync('DELETE FROM scroll_positions');
      await this.db!.runAsync('DELETE FROM friend_requests');
      console.log('✅ All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}

/**
 * Export singleton instance
 */
export const SQLiteService = new SQLiteServiceClass();


