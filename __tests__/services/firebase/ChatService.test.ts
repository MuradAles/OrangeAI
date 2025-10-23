/**
 * ChatService Tests
 * 
 * Tests chat operations including create, get, and update
 */

import { ChatService } from '@/services/firebase/ChatService';
import {
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default implementations
    (writeBatch as jest.Mock).mockReturnValue({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve())
    });
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ unreadCount: 0 }),
      id: 'mock-id'
    });
  });

  describe('findExistingChat', () => {
    it('should find existing one-on-one chat between two users', async () => {
      const mockChat = {
        id: 'chat-123',
        participants: ['user-1', 'user-2'],
        type: 'one-on-one'
      };

      (getDocs as jest.Mock).mockResolvedValue({
        docs: [{
          id: 'chat-123',
          data: () => mockChat
        }]
      });

      const result = await ChatService.findExistingChat('user-1', 'user-2');

      expect(result).toBe('chat-123');
    });

    it('should return null if no chat exists', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: []
      });

      const result = await ChatService.findExistingChat('user-1', 'user-3');

      expect(result).toBeNull();
    });
  });

  describe('createChat', () => {
    it('should create a new one-on-one chat', async () => {
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      };

      (writeBatch as jest.Mock).mockReturnValue(mockBatch);
      (doc as jest.Mock).mockReturnValue({ id: 'new-chat-123' });
      (serverTimestamp as jest.Mock).mockReturnValue(Date.now());

      const result = await ChatService.createChat('user-1', 'user-2');

      expect(result).toBe('new-chat-123');
      expect(mockBatch.set).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should create chat with participant documents', async () => {
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      };

      (writeBatch as jest.Mock).mockReturnValue(mockBatch);
      (doc as jest.Mock).mockReturnValue({ id: 'new-chat-456' });

      await ChatService.createChat('user-1', 'user-2');

      // Should create: chat doc + 2 participant docs
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateChatLastMessage', () => {
    it('should update chat with last message info', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({});
      
      // Mock updateDoc from the module
      const { updateDoc } = require('firebase/firestore');
      updateDoc.mockImplementation(mockUpdate);

      await ChatService.updateChatLastMessage(
        'chat-123',
        'Hello!',
        'user-1',
        'sent'
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastMessageText: 'Hello!',
          lastMessageSenderId: 'user-1',
          lastMessageStatus: 'sent'
        })
      );
    });

    it('should update timestamp with server timestamp', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      (serverTimestamp as jest.Mock).mockReturnValue('SERVER_TIMESTAMP');
      
      const { updateDoc } = require('firebase/firestore');
      updateDoc.mockImplementation(mockUpdate);

      await ChatService.updateChatLastMessage(
        'chat-123',
        'Test message',
        'user-1'
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastMessageTime: 'SERVER_TIMESTAMP'
        })
      );
    });
  });

  describe('incrementUnreadCount', () => {
    it('should increment unread count for participant', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const { updateDoc } = require('firebase/firestore');
      updateDoc.mockImplementation(mockUpdate);

      await ChatService.incrementUnreadCount('chat-123', 'user-2');

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('markChatAsRead', () => {
    it('should mark chat as read and reset unread count', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const { updateDoc } = require('firebase/firestore');
      updateDoc.mockImplementation(mockUpdate);

      await ChatService.markChatAsRead('chat-123', 'user-1', 'msg-123');

      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});

