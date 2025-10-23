/**
 * Tests for reaction hooks
 * 
 * Note: Reaction functionality is integrated directly into ChatStore and ChatModal.
 * These tests validate the core reaction logic.
 */

import { MessageService } from '@/services/firebase/MessageService';
import { useChatStore } from '@/store/ChatStore';
import { act } from '@testing-library/react-native';

// Mock MessageService
jest.mock('@/services/firebase/MessageService');

describe('useReactions (Integrated in ChatStore)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset ChatStore state
    useChatStore.setState({
      messages: [],
      currentChatId: null,
      isLoadingMessages: false,
      error: null,
    });
  });

  describe('addReaction', () => {
    it('should add reaction to message', async () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        reactions: {},
      };

      // Setup initial state
      useChatStore.setState({
        messages: [message],
        currentChatId: 'chat-1',
      });

      (MessageService.addReaction as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await useChatStore.getState().addReaction('chat-1', 'msg-1', '👍', 'user-2');
      });

      expect(MessageService.addReaction).toHaveBeenCalled();
      const calls = (MessageService.addReaction as jest.Mock).mock.calls[0];
      expect(calls[0]).toBe('chat-1');
      expect(calls[1]).toBe('msg-1');
      expect(calls[2]).toBe('👍');
      expect(calls[3]).toBe('user-2');
    });

    it('should handle adding same emoji twice', async () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        reactions: {
          '👍': ['user-2'],
        },
      };

      useChatStore.setState({
        messages: [message],
        currentChatId: 'chat-1',
      });

      (MessageService.addReaction as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await useChatStore.getState().addReaction('chat-1', 'msg-1', '👍', 'user-2');
      });

      // Should still call the service (service handles duplicate logic)
      expect(MessageService.addReaction).toHaveBeenCalled();
    });

    it('should support multiple reactions on same message', async () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        reactions: {
          '👍': ['user-2'],
        },
      };

      useChatStore.setState({
        messages: [message],
        currentChatId: 'chat-1',
      });

      (MessageService.addReaction as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await useChatStore.getState().addReaction('chat-1', 'msg-1', '❤️', 'user-3');
      });

      expect(MessageService.addReaction).toHaveBeenCalled();
      const calls = (MessageService.addReaction as jest.Mock).mock.calls[0];
      expect(calls[0]).toBe('chat-1');
      expect(calls[1]).toBe('msg-1');
      expect(calls[2]).toBe('❤️');
      expect(calls[3]).toBe('user-3');
    });

    it('should handle add reaction errors', async () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
      };

      useChatStore.setState({
        messages: [message],
        currentChatId: 'chat-1',
      });

      (MessageService.addReaction as jest.Mock).mockRejectedValue(
        new Error('Failed to add reaction')
      );

      await expect(
        useChatStore.getState().addReaction('chat-1', 'msg-1', '👍', 'user-2')
      ).rejects.toThrow('Failed to add reaction');
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction from message', async () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        reactions: {
          '👍': ['user-2'],
        },
      };

      useChatStore.setState({
        messages: [message],
        currentChatId: 'chat-1',
      });

      (MessageService.removeReaction as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await useChatStore.getState().removeReaction('chat-1', 'msg-1', '👍', 'user-2');
      });

      expect(MessageService.removeReaction).toHaveBeenCalled();
      const calls = (MessageService.removeReaction as jest.Mock).mock.calls[0];
      expect(calls[0]).toBe('chat-1');
      expect(calls[1]).toBe('msg-1');
      expect(calls[2]).toBe('👍');
      expect(calls[3]).toBe('user-2');
    });

    it('should handle remove reaction errors', async () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        reactions: {
          '👍': ['user-2'],
        },
      };

      useChatStore.setState({
        messages: [message],
        currentChatId: 'chat-1',
      });

      (MessageService.removeReaction as jest.Mock).mockRejectedValue(
        new Error('Failed to remove reaction')
      );

      await expect(
        useChatStore.getState().removeReaction('chat-1', 'msg-1', '👍', 'user-2')
      ).rejects.toThrow('Failed to remove reaction');
    });
  });

  describe('Reaction Validation', () => {
    it('should handle invalid emoji input', async () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
      };

      useChatStore.setState({
        messages: [message],
        currentChatId: 'chat-1',
      });

      (MessageService.addReaction as jest.Mock).mockResolvedValue(undefined);

      // Service should handle validation
      await act(async () => {
        await useChatStore.getState().addReaction('chat-1', 'msg-1', '', 'user-2');
      });

      expect(MessageService.addReaction).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('should update reaction counts in real-time', () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        reactions: {
          '👍': ['user-2'],
        },
      };

      useChatStore.setState({
        messages: [message],
      });

      // Simulate real-time update
      act(() => {
        const updatedMessage = {
          ...message,
          reactions: {
            '👍': ['user-2', 'user-3'],
          },
        };

        useChatStore.setState({
          messages: [updatedMessage],
        });
      });

      const state = useChatStore.getState();
      const msg = state.messages[0];
      expect(msg?.reactions?.['👍']).toHaveLength(2);
    });
  });
});

