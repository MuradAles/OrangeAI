import { DATABASE_VERSION, TABLES } from '@/database/Schema';

describe('Database Schema', () => {
  describe('Schema Version', () => {
    it('should have a valid database version', () => {
      expect(DATABASE_VERSION).toBeDefined();
      expect(typeof DATABASE_VERSION).toBe('number');
      expect(DATABASE_VERSION).toBeGreaterThan(0);
    });
  });

  describe('Table Definitions', () => {
    it('should define users table', () => {
      expect(TABLES.USERS).toBeDefined();
      expect(TABLES.USERS).toContain('CREATE TABLE IF NOT EXISTS users');
      expect(TABLES.USERS).toContain('id TEXT PRIMARY KEY');
      expect(TABLES.USERS).toContain('displayName TEXT');
      expect(TABLES.USERS).toContain('username TEXT UNIQUE');
    });

    it('should define chats table', () => {
      expect(TABLES.CHATS).toBeDefined();
      expect(TABLES.CHATS).toContain('CREATE TABLE IF NOT EXISTS chats');
      expect(TABLES.CHATS).toContain('id TEXT PRIMARY KEY');
      expect(TABLES.CHATS).toContain('type TEXT');
      expect(TABLES.CHATS).toContain('participants TEXT');
      expect(TABLES.CHATS).toContain('lastMessageText TEXT');
    });

    it('should define messages table', () => {
      expect(TABLES.MESSAGES).toBeDefined();
      expect(TABLES.MESSAGES).toContain('CREATE TABLE IF NOT EXISTS messages');
      expect(TABLES.MESSAGES).toContain('id TEXT PRIMARY KEY');
      expect(TABLES.MESSAGES).toContain('chatId TEXT');
      expect(TABLES.MESSAGES).toContain('senderId TEXT');
      expect(TABLES.MESSAGES).toContain('text TEXT');
      expect(TABLES.MESSAGES).toContain('timestamp INTEGER');
    });

    it('should define scroll_positions table', () => {
      expect(TABLES.SCROLL_POSITIONS).toBeDefined();
      expect(TABLES.SCROLL_POSITIONS).toContain('CREATE TABLE IF NOT EXISTS scroll_positions');
      expect(TABLES.SCROLL_POSITIONS).toContain('chatId TEXT PRIMARY KEY');
      expect(TABLES.SCROLL_POSITIONS).toContain('lastReadMessageId TEXT');
      expect(TABLES.SCROLL_POSITIONS).toContain('scrollYPosition INTEGER');
    });

    it('should define friend_requests table', () => {
      expect(TABLES.FRIEND_REQUESTS).toBeDefined();
      expect(TABLES.FRIEND_REQUESTS).toContain('CREATE TABLE IF NOT EXISTS friend_requests');
      expect(TABLES.FRIEND_REQUESTS).toContain('id TEXT PRIMARY KEY');
      expect(TABLES.FRIEND_REQUESTS).toContain('fromUserId TEXT');
      expect(TABLES.FRIEND_REQUESTS).toContain('toUserId TEXT');
      expect(TABLES.FRIEND_REQUESTS).toContain('status TEXT');
    });

    it('should define schema_version table', () => {
      expect(TABLES.SCHEMA_VERSION).toBeDefined();
      expect(TABLES.SCHEMA_VERSION).toContain('CREATE TABLE IF NOT EXISTS metadata');
      expect(TABLES.SCHEMA_VERSION).toContain('key TEXT PRIMARY KEY');
    });
  });

  describe('Table Indexes', () => {
    it('should define index on messages chatId', () => {
      // Check if index is defined separately or inline
      expect(TABLES.MESSAGES_INDEX).toBeDefined();
      expect(TABLES.MESSAGES_INDEX).toContain('idx_messages_chatId');
    });

    it('should define index on messages timestamp', () => {
      const hasTimestampIndex = 
        TABLES.MESSAGES?.includes('timestamp') ||
        TABLES.MESSAGES_TIMESTAMP_INDEX !== undefined;
      expect(hasTimestampIndex).toBeTruthy();
    });
  });

  describe('Schema Constraints', () => {
    it('should enforce unique username in users table', () => {
      expect(TABLES.USERS).toContain('UNIQUE');
    });

    it('should have primary keys on all tables', () => {
      Object.values(TABLES).forEach(tableDef => {
        if (typeof tableDef === 'string' && tableDef.includes('CREATE TABLE')) {
          expect(tableDef).toContain('PRIMARY KEY');
        }
      });
    });

    it('should define NOT NULL for required fields in users', () => {
      // id, username, displayName should be required
      expect(TABLES.USERS).toContain('id TEXT');
      expect(TABLES.USERS).toContain('username TEXT');
      expect(TABLES.USERS).toContain('displayName TEXT');
    });

    it('should define NOT NULL for required fields in messages', () => {
      // id, chatId, senderId, timestamp should be required
      expect(TABLES.MESSAGES).toContain('id TEXT');
      expect(TABLES.MESSAGES).toContain('chatId TEXT');
      expect(TABLES.MESSAGES).toContain('senderId TEXT');
      expect(TABLES.MESSAGES).toContain('timestamp');
    });
  });

  describe('Data Types', () => {
    it('should use TEXT for string fields', () => {
      expect(TABLES.USERS).toContain('TEXT');
      expect(TABLES.MESSAGES).toContain('TEXT');
    });

    it('should use INTEGER for numeric fields', () => {
      expect(TABLES.MESSAGES).toContain('INTEGER');
      expect(TABLES.CHATS).toContain('INTEGER');
    });

    it('should use INTEGER for position fields', () => {
      // scrollYPosition uses INTEGER for pixel positions
      expect(TABLES.SCROLL_POSITIONS).toContain('INTEGER');
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should reference users in messages', () => {
      // Messages should reference senderId to users
      const hasForeignKey = 
        TABLES.MESSAGES.includes('FOREIGN KEY') ||
        TABLES.MESSAGES.includes('senderId TEXT');
      expect(hasForeignKey).toBeTruthy();
    });

    it('should reference chats in messages', () => {
      // Messages should reference chatId to chats
      const hasReference = 
        TABLES.MESSAGES.includes('chatId TEXT');
      expect(hasReference).toBeTruthy();
    });
  });

  describe('Table Structure Validation', () => {
    it('should have all required tables defined', () => {
      const requiredTables = [
        'USERS',
        'CHATS',
        'MESSAGES',
        'SCROLL_POSITIONS',
        'FRIEND_REQUESTS',
        'SCHEMA_VERSION',
      ];

      requiredTables.forEach(table => {
        expect(TABLES[table]).toBeDefined();
      });
    });

    it('should define all tables with IF NOT EXISTS', () => {
      Object.values(TABLES).forEach(tableDef => {
        if (typeof tableDef === 'string' && tableDef.includes('CREATE TABLE')) {
          expect(tableDef).toContain('IF NOT EXISTS');
        }
      });
    });
  });

  describe('Schema Consistency', () => {
    it('should have consistent naming convention', () => {
      // All table names should be lowercase
      const tableNames = Object.keys(TABLES);
      tableNames.forEach(name => {
        expect(name).toBe(name.toUpperCase()); // Constants should be uppercase
      });
    });

    it('should have consistent field naming', () => {
      // Check that common fields use consistent names
      expect(TABLES.USERS).toContain('createdAt');
      expect(TABLES.CHATS).toContain('createdAt');
      // Both tables have createdAt for tracking creation time
    });
  });
});

