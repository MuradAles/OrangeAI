import { MessageQueue } from '@/database/MessageQueue';
import { SQLiteService } from '@/database/SQLiteService';
import { MessageService } from '@/services/firebase/MessageService';
import { Message } from '@/shared/types';

// Mock dependencies
jest.mock('@/database/SQLiteService');
jest.mock('@/services/firebase/MessageService', () => ({
  MessageService: {
    sendMessage: jest.fn(() => Promise.resolve()),
    sendImageMessage: jest.fn(() => Promise.resolve()),
    addReaction: jest.fn(() => Promise.resolve()),
    removeReaction: jest.fn(() => Promise.resolve()),
    deleteMessageForMe: jest.fn(() => Promise.resolve()),
    deleteMessageForEveryone: jest.fn(() => Promise.resolve()),
  },
}));

describe('MessageQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('getPendingMessages', () => {
    it('should return pending messages from SQLite', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          chatId: 'chat-1',
          senderId: 'user-1',
          text: 'Hello',
          timestamp: Date.now(),
          status: 'sending',
          type: 'text',
          syncStatus: 'pending',
        },
      ];

      (SQLiteService.getPendingMessages as jest.Mock).mockResolvedValue(mockMessages);

      const result = await MessageQueue.getPendingMessages();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-1');
      expect(SQLiteService.getPendingMessages).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      (SQLiteService.getPendingMessages as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await MessageQueue.getPendingMessages();

      expect(result).toEqual([]);
    });
  });

  describe('processQueue', () => {
    it('should process pending messages successfully', async () => {
      const mockMessage: Message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sending',
        type: 'text',
        syncStatus: 'pending',
      };

      (SQLiteService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);
      (MessageService.sendMessage as jest.Mock).mockResolvedValue(undefined);
      (SQLiteService.updateMessageStatus as jest.Mock).mockResolvedValue(undefined);

      const result = await MessageQueue.processQueue();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(1);
      expect(MessageService.sendMessage).toHaveBeenCalled();
      expect(SQLiteService.updateMessageStatus).toHaveBeenCalledWith('msg-1', 'sent');
    });

    it('should return zero counts when queue is empty', async () => {
      (SQLiteService.getPendingMessages as jest.Mock).mockResolvedValue([]);

      const result = await MessageQueue.processQueue();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should not process if already processing', async () => {
      const mockMessage: Message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sending',
        type: 'text',
      };

      (SQLiteService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);
      (MessageService.sendMessage as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      // Start first process
      const promise1 = MessageQueue.processQueue();
      
      // Try to start second process immediately
      const result2 = await MessageQueue.processQueue();

      // Second should return immediately
      expect(result2.success).toBe(0);
      expect(result2.total).toBe(0);

      // Wait for first to complete
      await promise1;
    });
  });

  describe('retryMessage', () => {
    it('should retry a failed message', async () => {
      const mockMessage: Message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'failed',
        type: 'text',
      };

      (SQLiteService.getMessageById as jest.Mock).mockResolvedValue(mockMessage);
      (SQLiteService.updateMessageStatus as jest.Mock).mockResolvedValue(undefined);
      (MessageService.sendMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await MessageQueue.retryMessage('msg-1');

      expect(result).toBe(true);
      expect(SQLiteService.updateMessageStatus).toHaveBeenCalledWith('msg-1', 'sending');
      expect(MessageService.sendMessage).toHaveBeenCalled();
      expect(SQLiteService.updateMessageStatus).toHaveBeenCalledWith('msg-1', 'sent');
    });

    it('should return false if message not found', async () => {
      (SQLiteService.getMessageById as jest.Mock).mockResolvedValue(null);

      const result = await MessageQueue.retryMessage('msg-1');

      expect(result).toBe(false);
      expect(MessageService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending messages', async () => {
      const mockMessages = [
        { id: 'msg-1', syncStatus: 'pending' },
        { id: 'msg-2', syncStatus: 'pending' },
      ];

      (SQLiteService.getPendingMessages as jest.Mock).mockResolvedValue(mockMessages);

      const count = await MessageQueue.getPendingCount();

      expect(count).toBe(2);
    });

    it('should return 0 on error', async () => {
      (SQLiteService.getPendingMessages as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const count = await MessageQueue.getPendingCount();

      expect(count).toBe(0);
    });
  });

  describe('getFailedCount', () => {
    it('should return count of failed messages', async () => {
      const mockMessages = [
        { id: 'msg-1', status: 'failed' },
        { id: 'msg-2', status: 'failed' },
        { id: 'msg-3', status: 'sent' },
      ];

      (SQLiteService.getPendingMessages as jest.Mock).mockResolvedValue(mockMessages);

      const count = await MessageQueue.getFailedCount();

      expect(count).toBe(2);
    });

    it('should return 0 on error', async () => {
      (SQLiteService.getPendingMessages as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const count = await MessageQueue.getFailedCount();

      expect(count).toBe(0);
    });
  });

  describe('clearFailedMessages', () => {
    it('should identify failed messages', async () => {
      const mockMessages = [
        { id: 'msg-1', status: 'failed' },
        { id: 'msg-2', status: 'failed' },
        { id: 'msg-3', status: 'sent' },
      ];

      (SQLiteService.getPendingMessages as jest.Mock).mockResolvedValue(mockMessages);

      await MessageQueue.clearFailedMessages();

      // Implementation currently just logs, doesn't delete
      expect(SQLiteService.getPendingMessages).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (SQLiteService.getPendingMessages as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw
      await expect(MessageQueue.clearFailedMessages()).resolves.not.toThrow();
    });
  });
});
