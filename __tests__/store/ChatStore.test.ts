/**
 * ChatStore Tests
 * 
 * Tests chat and message state management with optimistic updates
 */

import { ChatService } from '@/services/firebase/ChatService';
import { MessageService } from '@/services/firebase/MessageService';

import { SQLiteService } from '@/database/SQLiteService';
import { useChatStore } from '@/store/ChatStore';

jest.mock('@/services/firebase/MessageService');
jest.mock('@/services/firebase/ChatService');
jest.mock('@/database/SQLiteService');
jest.mock('@/services/firebase/UserService', () => ({
  UserService: {
    getUserById: jest.fn(),
  }
}));

describe('ChatStore', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      chats: [],
      currentChatId: null,
      messages: [],
      isLoadingChats: false,
      isLoadingMessages: false,
      error: null,
      userProfiles: new Map(),
      chatsUnsubscribe: null,
      messagesUnsubscribe: null,
    });
    jest.clearAllMocks();
  });

  describe('selectChat', () => {
    it('should select a chat and clear messages', () => {
      useChatStore.setState({
        messages: [{ 
          id: 'msg-1', 
          chatId: 'chat-1', 
          text: 'Old message',
          senderId: 'user-1',
          timestamp: Date.now(),
          status: 'sent' as const,
          type: 'text' as const
        }]
      });

      const { selectChat } = useChatStore.getState();
      selectChat('chat-2');

      const state = useChatStore.getState();
      expect(state.currentChatId).toBe('chat-2');
      expect(state.messages).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    it('should add optimistic message immediately', async () => {
      (MessageService.sendMessage as jest.Mock).mockResolvedValue('msg-123');
      (SQLiteService.saveMessage as jest.Mock).mockResolvedValue(undefined);
      (ChatService.updateChatLastMessage as jest.Mock).mockResolvedValue(undefined);
      (ChatService.incrementUnreadCount as jest.Mock).mockResolvedValue(undefined);

      const { sendMessage } = useChatStore.getState();
      
      // Start sending
      const sendPromise = sendMessage('chat-123', 'user-1', 'Hello!');

      // Check state immediately (optimistic update)
      const stateBeforeComplete = useChatStore.getState();
      expect(stateBeforeComplete.messages).toHaveLength(1);
      expect(stateBeforeComplete.messages[0].text).toBe('Hello!');
      expect(stateBeforeComplete.messages[0].status).toBe('sending');

      await sendPromise;

      // SQLite should be called
      expect(SQLiteService.saveMessage).toHaveBeenCalled();
    });

    it('should save message to SQLite with pending status', async () => {
      (MessageService.sendMessage as jest.Mock).mockResolvedValue('msg-123');
      (SQLiteService.saveMessage as jest.Mock).mockResolvedValue(undefined);
      (ChatService.updateChatLastMessage as jest.Mock).mockResolvedValue(undefined);
      (ChatService.incrementUnreadCount as jest.Mock).mockResolvedValue(undefined);

      const { sendMessage } = useChatStore.getState();
      await sendMessage('chat-123', 'user-1', 'Hello!');

      expect(SQLiteService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello!',
          chatId: 'chat-123',
          senderId: 'user-1',
          syncStatus: 'pending'
        })
      );
    });
  });

  describe('deleteMessageForMe', () => {
    it('should remove message from current user view only', async () => {
      const mockMessage = {
        id: 'msg-123',
        chatId: 'chat-123',
        senderId: 'user-2',
        text: 'Test message',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        deletedFor: [],
        deletedForEveryone: false
      };

      useChatStore.setState({
        messages: [mockMessage]
      });

      (MessageService.deleteMessageForMe as jest.Mock).mockResolvedValue(undefined);

      const { deleteMessageForMe } = useChatStore.getState();
      await deleteMessageForMe('chat-123', 'msg-123', 'user-1');

      const state = useChatStore.getState();
      expect(state.messages[0].deletedFor).toContain('user-1');
    });
  });

  describe('deleteMessageForEveryone', () => {
    it('should mark message as deleted for all participants', async () => {
      const mockMessage = {
        id: 'msg-123',
        chatId: 'chat-123',
        senderId: 'user-1',
        text: 'Test message',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        deletedFor: [],
        deletedForEveryone: false
      };

      useChatStore.setState({
        messages: [mockMessage]
      });

      (MessageService.deleteMessageForEveryone as jest.Mock).mockResolvedValue(undefined);

      const { deleteMessageForEveryone } = useChatStore.getState();
      await deleteMessageForEveryone('chat-123', 'msg-123');

      const state = useChatStore.getState();
      expect(state.messages[0].deletedForEveryone).toBe(true);
    });
  });

  describe('addReaction', () => {
    it('should add emoji reaction to message', async () => {
      const mockMessage = {
        id: 'msg-123',
        chatId: 'chat-123',
        senderId: 'user-2',
        text: 'Test message',
        timestamp: Date.now(),
        status: 'sent' as const,
        type: 'text' as const,
        reactions: {}
      };

      useChatStore.setState({
        messages: [mockMessage]
      });

      (MessageService.addReaction as jest.Mock).mockResolvedValue(undefined);

      const { addReaction } = useChatStore.getState();
      await addReaction('chat-123', 'msg-123', '😂', 'user-1');

      expect(MessageService.addReaction).toHaveBeenCalledWith(
        'chat-123',
        'msg-123',
        '😂',
        'user-1'
      );
    });
  });

  describe('loadUserProfile', () => {
    it.skip('should cache user profile - TODO: Fix in next PR', async () => {
      const mockUserRow = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        profilePictureUrl: null,
        isOnline: 0,
        lastSeen: 1234567890000,
        createdAt: 1234567890000
      };

      // Mock SQLiteService to return the user
      (SQLiteService.getUserById as jest.Mock).mockResolvedValueOnce(mockUserRow);

      const { loadUserProfile } = useChatStore.getState();
      const result = await loadUserProfile('user-123');

      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
      }));

      // Check cache
      const state = useChatStore.getState();
      expect(state.userProfiles.has('user-123')).toBe(true);
    });

    it('should return cached profile if available', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        profilePictureUrl: null,
        phoneNumber: null,
        phoneNumberVisible: false,
        isOnline: true,
        lastSeen: null,
        createdAt: Date.now()
      };

      useChatStore.setState({
        userProfiles: new Map([['user-123', mockProfile]])
      });

      const { UserService } = require('@/services/firebase');
      const getUserSpy = jest.spyOn(UserService, 'getUserById');

      const { getUserProfile } = useChatStore.getState();
      const result = getUserProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(getUserSpy).not.toHaveBeenCalled();
    });
  });

  describe('createChat', () => {
    it('should create a new chat between two users', async () => {
      (ChatService.createChat as jest.Mock).mockResolvedValue('new-chat-123');

      const { createChat } = useChatStore.getState();
      const chatId = await createChat('user-1', 'user-2');

      expect(chatId).toBe('new-chat-123');
      expect(ChatService.createChat).toHaveBeenCalledWith('user-1', 'user-2');
    });

    it('should set error if chat creation fails', async () => {
      (ChatService.createChat as jest.Mock).mockRejectedValue(
        new Error('Failed to create chat')
      );

      const { createChat } = useChatStore.getState();

      await expect(createChat('user-1', 'user-2')).rejects.toThrow('Failed to create chat');

      const state = useChatStore.getState();
      expect(state.error).toBe('Failed to create chat');
    });
  });
});

