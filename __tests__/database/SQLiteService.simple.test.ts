// Simplified SQLiteService tests focusing on behavior
import { SQLiteService } from '@/database/SQLiteService';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
    withTransactionAsync: jest.fn(async (callback) => {
      await callback();
    }),
    closeAsync: jest.fn(() => Promise.resolve()),
  })),
  deleteDatabaseAsync: jest.fn(() => Promise.resolve()),
}));

// Use actual SQLiteService
jest.mock('@/database/SQLiteService', () => {
  const actual = jest.requireActual('@/database/SQLiteService');
  return actual;
});

describe('SQLiteService - Core Functionality', () => {
  beforeAll(async () => {
    // Initialize once for all tests
    await SQLiteService.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await SQLiteService.initialize();
      expect(result).toBeDefined();
    });
  });

  describe('Transaction Support', () => {
    it('should execute operations in transaction', async () => {
      const operations = [
        () => Promise.resolve(),
        () => Promise.resolve(),
      ];

      await expect(SQLiteService.transaction(operations)).resolves.not.toThrow();
    });

    it('should handle transaction errors', async () => {
      const operations = [
        () => Promise.reject(new Error('Test error')),
      ];

      await expect(SQLiteService.transaction(operations)).rejects.toThrow('Test error');
    });
  });

  describe('Clear All Data', () => {
    it('should clear all data successfully', async () => {
      await expect(SQLiteService.clearAll()).resolves.not.toThrow();
    });
  });

  describe('Close Database', () => {
    it('should close database successfully', async () => {
      await expect(SQLiteService.close()).resolves.not.toThrow();
    });
  });
});

