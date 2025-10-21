/**
 * MessageService Tests
 * 
 * Tests message operations including send, update status, and reactions
 */

import { MessageService } from '@/services/firebase/MessageService';
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default implementations
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ reactions: {} }),
      id: 'mock-id'
    });
  });

  describe('sendMessage', () => {
    it('should send a text message successfully', async () => {
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (serverTimestamp as jest.Mock).mockReturnValue(Date.now());

      const result = await MessageService.sendMessage(
        'chat-123',
        'user-1',
        'Hello, world!',
        'message-123'
      );

      expect(result).toBe('message-123');
      expect(setDoc).toHaveBeenCalled();
    });

    it('should send an image message with URLs', async () => {
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await MessageService.sendMessage(
        'chat-123',
        'user-1',
        '',
        'message-456',
        {
          type: 'image',
          imageUrl: 'https://storage.example.com/image.jpg',
          thumbnailUrl: 'https://storage.example.com/thumb.jpg',
          caption: 'Check this out!'
        }
      );

      expect(result).toBe('message-456');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'image',
          imageUrl: 'https://storage.example.com/image.jpg',
          thumbnailUrl: 'https://storage.example.com/thumb.jpg',
          caption: 'Check this out!'
        })
      );
    });

    it('should throw error if message send fails', async () => {
      (setDoc as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        MessageService.sendMessage('chat-123', 'user-1', 'Hello')
      ).rejects.toThrow('Network error');
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status to delivered', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await MessageService.updateMessageStatus('chat-123', 'message-123', 'delivered');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'delivered'
        })
      );
    });

    it('should update message status to read', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await MessageService.updateMessageStatus('chat-123', 'message-123', 'read');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'read'
        })
      );
    });
  });

  describe('deleteMessageForEveryone', () => {
    it('should mark message as deleted for everyone', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await MessageService.deleteMessageForEveryone('chat-123', 'message-123');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deletedForEveryone: true,
          deletedAt: expect.anything()
        })
      );
    });
  });

  describe('addReaction', () => {
    it('should add a reaction to a message', async () => {
      (doc as jest.Mock).mockReturnValue({ id: 'message-123' });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await MessageService.addReaction('chat-123', 'message-123', '😂', 'user-1');

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should handle multiple users reacting with same emoji', async () => {
      (doc as jest.Mock).mockReturnValue({ id: 'message-123' });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await MessageService.addReaction('chat-123', 'message-123', '❤️', 'user-1');
      await MessageService.addReaction('chat-123', 'message-123', '❤️', 'user-2');

      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeReaction', () => {
    it('should remove a user reaction from a message', async () => {
      (doc as jest.Mock).mockReturnValue({ id: 'message-123' });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await MessageService.removeReaction('chat-123', 'message-123', '😂', 'user-1');

      expect(updateDoc).toHaveBeenCalled();
    });
  });
});

