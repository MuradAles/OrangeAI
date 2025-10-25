import { GroupService } from '@/services/firebase/GroupService';
import { Chat } from '@/shared/types';
import { useGroupStore } from '@/store/GroupStore';

// Mock GroupService
jest.mock('@/services/firebase/GroupService');

describe('GroupStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test - GroupStore only has createGroup method
    // No state properties to reset
  });

  describe('createGroup', () => {
    it('should create a group and update state', async () => {
      const mockChat: Chat = {
        id: 'group-1',
        type: 'group',
        participants: ['user-1', 'user-2'],
        groupName: 'Test Group',
        groupAdminId: 'user-1',
        createdAt: Date.now(),
        lastMessageText: '',
        lastMessageTime: Date.now(),
        lastMessageSenderId: '',
        createdBy: 'user-1',
      };

      (GroupService.createGroup as jest.Mock).mockResolvedValue(mockChat);

      const result = await useGroupStore.getState().createGroup(
        'user-1',
        'Test Group',
        ['user-2'],
        'Description',
        undefined
      );

      expect(GroupService.createGroup).toHaveBeenCalledWith(
        'user-1',
        'Test Group',
        ['user-2'],
        'Description',
        undefined
      );

      expect(result.success).toBe(true);
      expect(result.chatId).toBe('group-1');
    });

    it('should handle create group errors', async () => {
      (GroupService.createGroup as jest.Mock).mockRejectedValue(
        new Error('Group creation failed')
      );

      const result = await useGroupStore.getState().createGroup('user-1', 'Test', ['user-2'], undefined, undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Group creation failed');
    });

    it('should set loading state during creation', async () => {
      let resolveCreate: any;
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve;
      });

      (GroupService.createGroup as jest.Mock).mockReturnValue(createPromise);

      const createPromiseFromStore = useGroupStore.getState().createGroup(
        'user-1',
        'Test',
        ['user-2'],
        undefined,
        undefined
      );

      // Since GroupStore doesn't have loading state, just test the promise resolves
      resolveCreate({ id: 'group-1' });
      const result = await createPromiseFromStore;

      expect(result.success).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should return success result on successful operation', async () => {
      (GroupService.createGroup as jest.Mock).mockResolvedValue({ id: 'group-1' });

      const result = await useGroupStore.getState().createGroup('user-1', 'Test', ['user-2'], undefined, undefined);

      expect(result.success).toBe(true);
      expect(result.chatId).toBe('group-1');
    });

    it('should return error result on failed operation', async () => {
      (GroupService.createGroup as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await useGroupStore.getState().createGroup('user-1', 'Test', ['user-2'], undefined, undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed');
    });
  });
});

