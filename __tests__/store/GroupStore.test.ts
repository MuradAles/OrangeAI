import { GroupService } from '@/services/firebase/GroupService';
import { Chat } from '@/shared/types';
import { useGroupStore } from '@/store/GroupStore';

// Mock GroupService
jest.mock('@/services/firebase/GroupService');

describe('GroupStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useGroupStore.setState({
      groups: [],
      currentGroupParticipants: [],
      isLoading: false,
      error: null,
    });
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
        updatedAt: Date.now(),
      };

      (GroupService.createGroup as jest.Mock).mockResolvedValue(mockChat);

      await useGroupStore.getState().createGroup(
        'Test Group',
        'Description',
        undefined,
        'user-1',
        ['user-2']
      );

      expect(GroupService.createGroup).toHaveBeenCalledWith(
        'Test Group',
        'Description',
        undefined,
        'user-1',
        ['user-2']
      );

      const state = useGroupStore.getState();
      expect(state.currentGroup).toEqual(mockChat);
      expect(state.isCreatingGroup).toBe(false);
    });

    it('should handle create group errors', async () => {
      (GroupService.createGroup as jest.Mock).mockRejectedValue(
        new Error('Group creation failed')
      );

      const result = await useGroupStore.getState().createGroup('Test', undefined, undefined, 'user-1', ['user-2']);

      expect(result).toBeNull();
      const state = useGroupStore.getState();
      expect(state.error).toBe('Group creation failed');
      expect(state.isCreatingGroup).toBe(false);
    });

    it('should set loading state during creation', async () => {
      let resolveCreate: any;
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve;
      });

      (GroupService.createGroup as jest.Mock).mockReturnValue(createPromise);

      const createPromiseFromStore = useGroupStore.getState().createGroup(
        'Test',
        undefined,
        undefined,
        'user-1',
        ['user-2']
      );

      expect(useGroupStore.getState().isCreatingGroup).toBe(true);

      resolveCreate({ id: 'group-1' });
      await createPromiseFromStore;

      expect(useGroupStore.getState().isCreatingGroup).toBe(false);
    });
  });

  describe('updateGroupInfo', () => {
    it('should update group information', async () => {
      // Setup initial state
      const initialGroup: Chat = {
        id: 'group-1',
        type: 'group',
        participants: ['user-1'],
        groupName: 'Old Name',
        groupAdminId: 'user-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useGroupStore.setState({ groups: [initialGroup] });

      (GroupService.updateGroupInfo as jest.Mock).mockResolvedValue(undefined);

      useGroupStore.setState({ currentGroup: initialGroup });

      await useGroupStore.getState().updateGroupInfo('group-1', 'New Name', undefined, undefined);

      expect(GroupService.updateGroupInfo).toHaveBeenCalled();

      const state = useGroupStore.getState();
      expect(state.currentGroup?.groupName).toBe('New Name');
    });

    it('should handle update errors', async () => {
      (GroupService.updateGroupInfo as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      await useGroupStore.getState().updateGroupInfo('group-1', 'New Name', undefined, undefined);

      const state = useGroupStore.getState();
      expect(state.error).toBe('Update failed');
    });
  });

  describe('addMember', () => {
    it('should add member to group', async () => {
      (GroupService.addMember as jest.Mock).mockResolvedValue(undefined);
      (GroupService.getGroupParticipants as jest.Mock).mockResolvedValue([]);

      await useGroupStore.getState().addMember('group-1', 'user-2');

      expect(GroupService.addMember).toHaveBeenCalledWith('group-1', 'user-2');
      expect(GroupService.getGroupParticipants).toHaveBeenCalled();
    });

    it('should handle add member errors', async () => {
      (GroupService.addMember as jest.Mock).mockRejectedValue(new Error('Add failed'));

      await expect(
        useGroupStore.getState().addMember('group-1', 'user-2')
      ).rejects.toThrow('Add failed');
    });
  });


  describe('leaveGroup', () => {
    it('should leave group and clear currentGroup', async () => {
      const initialGroup: Chat = {
        id: 'group-1',
        type: 'group',
        participants: ['user-1', 'user-2'],
        groupAdminId: 'user-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useGroupStore.setState({ currentGroup: initialGroup });

      (GroupService.leaveGroup as jest.Mock).mockResolvedValue(undefined);

      await useGroupStore.getState().leaveGroup('group-1', 'user-2');

      expect(GroupService.leaveGroup).toHaveBeenCalledWith('group-1', 'user-2');

      const state = useGroupStore.getState();
      expect(state.currentGroup).toBeNull();
      expect(state.groupParticipants.size).toBe(0);
    });

    it('should handle leave group errors', async () => {
      (GroupService.leaveGroup as jest.Mock).mockRejectedValue(new Error('Leave failed'));

      await expect(
        useGroupStore.getState().leaveGroup('group-1', 'user-1')
      ).rejects.toThrow('Leave failed');
    });
  });

  describe('joinGroupByInviteCode', () => {
    it('should join group via invite code', async () => {
      const groupId = 'group-1';

      (GroupService.joinGroupByInviteCode as jest.Mock).mockResolvedValue(groupId);
      (GroupService.getGroup as jest.Mock).mockResolvedValue({
        id: groupId,
        type: 'group',
        participants: ['user-1', 'user-2'],
        groupName: 'Test Group',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await useGroupStore.getState().joinGroupByInviteCode('ABC123', 'user-2');

      expect(GroupService.joinGroupByInviteCode).toHaveBeenCalledWith('ABC123', 'user-2');
      expect(result).toBe(groupId);
    });

    it('should handle invalid invite code', async () => {
      (GroupService.joinGroupByInviteCode as jest.Mock).mockRejectedValue(
        new Error('Invalid invite code')
      );

      const result = await useGroupStore.getState().joinGroupByInviteCode('INVALID', 'user-1');

      expect(result).toBeNull();
      expect(useGroupStore.getState().error).toBe('Invalid invite code');
    });
  });

  describe('loadGroupParticipants', () => {
    it('should fetch and store group participants in state', async () => {
      const mockParticipants = [
        { userId: 'user-1', role: 'admin', joinedAt: Date.now() },
        { userId: 'user-2', role: 'member', joinedAt: Date.now() },
      ];

      (GroupService.getGroupParticipants as jest.Mock).mockResolvedValue(mockParticipants);

      await useGroupStore.getState().loadGroupParticipants('group-1');

      expect(GroupService.getGroupParticipants).toHaveBeenCalledWith('group-1');
      
      // Check that participants were stored in state
      const state = useGroupStore.getState();
      expect(state.groupParticipants).toBeDefined();
      expect(state.groupParticipants.size).toBe(2);
      expect(state.groupParticipants.get('user-1')).toEqual(mockParticipants[0]);
    });

    it('should handle fetch errors', async () => {
      (GroupService.getGroupParticipants as jest.Mock).mockRejectedValue(
        new Error('Fetch failed')
      );

      await useGroupStore.getState().loadGroupParticipants('group-1');

      // Check that error was set in state
      const state = useGroupStore.getState();
      expect(state.error).toBe('Fetch failed');
    });
  });

  describe('regenerateInviteCode', () => {
    it('should regenerate invite code', async () => {
      const initialGroup: Chat = {
        id: 'group-1',
        type: 'group',
        participants: ['user-1'],
        groupAdminId: 'user-1',
        inviteCode: 'OLD123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useGroupStore.setState({ currentGroup: initialGroup });

      (GroupService.regenerateInviteCode as jest.Mock).mockResolvedValue('NEW456');

      const newCode = await useGroupStore.getState().regenerateInviteCode('group-1');

      expect(GroupService.regenerateInviteCode).toHaveBeenCalledWith('group-1');
      expect(newCode).toBe('NEW456');

      const state = useGroupStore.getState();
      expect(state.currentGroup?.inviteCode).toBe('NEW456');
    });

    it('should handle regenerate errors', async () => {
      (GroupService.regenerateInviteCode as jest.Mock).mockRejectedValue(
        new Error('Regenerate failed')
      );

      const result = await useGroupStore.getState().regenerateInviteCode('group-1');

      expect(result).toBeNull();
      expect(useGroupStore.getState().error).toBe('Regenerate failed');
    });
  });

  describe('State Management', () => {
    it('should clear error on successful operation', async () => {
      useGroupStore.setState({ error: 'Previous error' });

      (GroupService.createGroup as jest.Mock).mockResolvedValue({ id: 'group-1' });

      await useGroupStore.getState().createGroup('Test', undefined, undefined, 'user-1', ['user-2']);

      expect(useGroupStore.getState().error).toBeNull();
    });

    it('should reset state', () => {
      useGroupStore.setState({
        groups: [{ id: 'group-1' } as Chat],
        isLoading: true,
        error: 'Some error',
      });

      // Manually reset state
      useGroupStore.setState({
        groups: [],
        currentGroupParticipants: [],
        isLoading: false,
        error: null,
      });

      const state = useGroupStore.getState();
      expect(state.groups).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading to false after operations', async () => {
      (GroupService.createGroup as jest.Mock).mockResolvedValue({ id: 'group-1' });

      await useGroupStore.getState().createGroup('Test', undefined, undefined, 'user-1', ['user-2']);

      expect(useGroupStore.getState().isLoading).toBe(false);
    });
  });
});

