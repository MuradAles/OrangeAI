import { GroupService } from '@/services/firebase/GroupService';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    writeBatch
} from 'firebase/firestore';

// Mock Firebase
jest.mock('@/services/firebase/FirebaseConfig', () => ({
  firestore: {},
}));

jest.mock('firebase/firestore');
jest.mock('@/shared/utils', () => ({
  generateInviteCode: jest.fn(() => 'ABC123'),
}));

describe('GroupService', () => {
  let mockBatch: any;
  let mockSet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockCommit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSet = jest.fn();
    mockUpdate = jest.fn();
    mockCommit = jest.fn().mockResolvedValue(undefined);

    mockBatch = {
      set: mockSet,
      update: mockUpdate,
      commit: mockCommit,
      delete: jest.fn(),
    };

    (writeBatch as jest.Mock).mockReturnValue(mockBatch);
    (collection as jest.Mock).mockReturnValue({ id: 'chats' });
    (doc as jest.Mock).mockReturnValue({ id: 'chat-123' });
  });

  describe('createGroup', () => {
    it('should create a group with valid inputs', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A test group',
        groupIcon: 'https://example.com/icon.jpg',
        creatorId: 'user-1',
        memberIds: ['user-2', 'user-3'],
      };

      await GroupService.createGroup(
        groupData.name,
        groupData.description,
        groupData.groupIcon,
        groupData.creatorId,
        groupData.memberIds
      );

      expect(mockSet).toHaveBeenCalled();
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should throw error if group name is empty', async () => {
      await expect(
        GroupService.createGroup('', 'Description', undefined, 'user-1', ['user-2'])
      ).rejects.toThrow('Group name is required');
    });

    it('should throw error if no members provided', async () => {
      await expect(
        GroupService.createGroup('Test Group', 'Description', undefined, 'user-1', [])
      ).rejects.toThrow('At least one member is required');
    });

    it('should set creator as admin', async () => {
      await GroupService.createGroup('Test Group', undefined, undefined, 'user-1', ['user-2']);

      const chatSetCall = mockSet.mock.calls.find(call =>
        call[1]?.groupAdminId === 'user-1'
      );
      expect(chatSetCall).toBeDefined();
    });

    it('should generate invite code', async () => {
      await GroupService.createGroup('Test Group', undefined, undefined, 'user-1', ['user-2']);

      const chatSetCall = mockSet.mock.calls.find(call => call[1]?.inviteCode);
      expect(chatSetCall).toBeDefined();
      expect(chatSetCall[1].inviteCode).toBe('ABC123');
    });

    it('should include all participants', async () => {
      await GroupService.createGroup('Test Group', undefined, undefined, 'user-1', [
        'user-2',
        'user-3',
      ]);

      const chatSetCall = mockSet.mock.calls.find(call => call[1]?.participants);
      expect(chatSetCall[1].participants).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should not duplicate creator in participants', async () => {
      await GroupService.createGroup('Test Group', undefined, undefined, 'user-1', [
        'user-1',
        'user-2',
      ]);

      const chatSetCall = mockSet.mock.calls.find(call => call[1]?.participants);
      const participants = chatSetCall[1].participants;
      const user1Count = participants.filter((id: string) => id === 'user-1').length;
      expect(user1Count).toBe(1);
    });

    it('should create participant documents', async () => {
      await GroupService.createGroup('Test Group', undefined, undefined, 'user-1', ['user-2']);

      // Should create participant docs for creator and members
      expect(mockSet).toHaveBeenCalledTimes(3); // Chat + 2 participants
    });
  });

  describe('updateGroupInfo', () => {
    it('should update group name', async () => {
      await GroupService.updateGroupInfo('chat-123', {
        groupName: 'Updated Name',
      });

      const callArgs = (updateDoc as jest.Mock).mock.calls[0][1];
      expect(callArgs).toHaveProperty('groupName', 'Updated Name');
      expect(callArgs).toHaveProperty('updatedAt');
    });

    it('should update group description', async () => {
      await GroupService.updateGroupInfo('chat-123', {
        groupDescription: 'New description',
      });

      const callArgs = (updateDoc as jest.Mock).mock.calls[0][1];
      expect(callArgs).toHaveProperty('groupDescription', 'New description');
      expect(callArgs).toHaveProperty('updatedAt');
    });

    it('should update group icon', async () => {
      await GroupService.updateGroupInfo('chat-123', {
        groupIcon: 'https://example.com/newicon.jpg',
      });

      const callArgs = (updateDoc as jest.Mock).mock.calls[0][1];
      expect(callArgs).toHaveProperty('groupIcon', 'https://example.com/newicon.jpg');
      expect(callArgs).toHaveProperty('updatedAt');
    });
  });

  describe('addMember', () => {
    it('should add member to group', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ groupAdminId: 'user-1', participants: ['user-1', 'user-2'] }),
      });

      await GroupService.addMember('chat-123', 'user-3');

      expect(mockSet).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should silently skip if user is already a member', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ groupAdminId: 'user-1', participants: ['user-1', 'user-2'] }),
      });

      // Should not throw, just return silently
      await GroupService.addMember('chat-123', 'user-2');

      // Batch operations should not be called
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe('leaveGroup', () => {
    it('should allow member to leave group', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          groupAdminId: 'user-1',
          participants: ['user-1', 'user-2', 'user-3'],
        }),
      });

      (getDocs as jest.Mock).mockResolvedValue({
        docs: [
          { id: 'user-1', data: () => ({ joinedAt: { seconds: 100 } }) },
          { id: 'user-2', data: () => ({ joinedAt: { seconds: 200 } }) },
        ],
      });

      await GroupService.leaveGroup('chat-123', 'user-2');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should transfer admin when admin leaves', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          groupAdminId: 'user-1',
          participants: ['user-1', 'user-2', 'user-3'],
        }),
      });

      const mockDocs = [
        { 
          id: 'user-2', 
          data: () => ({ 
            userId: 'user-2',
            joinedAt: { 
              toMillis: () => 200000 
            }, 
            role: 'member' 
          }),
          ref: {}
        },
        { 
          id: 'user-3', 
          data: () => ({ 
            userId: 'user-3',
            joinedAt: { 
              toMillis: () => 300000 
            }, 
            role: 'member' 
          }),
          ref: {}
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
        forEach: function(callback: (doc: any) => void) {
          mockDocs.forEach(callback);
        }
      });

      await GroupService.leaveGroup('chat-123', 'user-1');

      // Should have called batch operations
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should delete group if last member leaves', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ groupAdminId: 'user-1', participants: ['user-1'] }),
      });

      (getDocs as jest.Mock).mockResolvedValue({ 
        docs: [],
        forEach: function(callback: (doc: any) => void) {
          this.docs.forEach(callback);
        }
      });

      await GroupService.leaveGroup('chat-123', 'user-1');

      expect(mockBatch.delete).toHaveBeenCalled();
    });
  });

  describe('joinGroupByInviteCode', () => {
    it('should allow user to join via invite code', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'chat-123',
            data: () => ({ participants: ['user-1', 'user-2'] }),
          },
        ],
      });

      await GroupService.joinGroupByInviteCode('ABC123', 'user-3');

      expect(mockSet).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should throw error if invite code is invalid', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      await expect(
        GroupService.joinGroupByInviteCode('INVALID', 'user-3')
      ).rejects.toThrow('Invalid invite code');
    });

    it('should throw error if user is already a member', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'chat-123',
            data: () => ({ participants: ['user-1', 'user-2'] }),
          },
        ],
      });

      await expect(
        GroupService.joinGroupByInviteCode('ABC123', 'user-2')
      ).rejects.toThrow('You are already a member');
    });
  });

  describe('regenerateInviteCode', () => {
    it('should generate new invite code', async () => {
      const newCode = await GroupService.regenerateInviteCode('chat-123');

      expect(newCode).toBeDefined();
      expect(typeof newCode).toBe('string');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ inviteCode: newCode })
      );
    });
  });

  describe('getGroupParticipants', () => {
    it('should return list of participants with roles', async () => {
      const mockDocs = [
        { 
          id: 'user-1', 
          data: () => ({ 
            userId: 'user-1', 
            role: 'admin',
            joinedAt: { toMillis: () => Date.now() }
          }) 
        },
        { 
          id: 'user-2', 
          data: () => ({ 
            userId: 'user-2', 
            role: 'member',
            joinedAt: { toMillis: () => Date.now() }
          }) 
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
        forEach: function(callback: (doc: any) => void) {
          mockDocs.forEach(callback);
        }
      });

      const participants = await GroupService.getGroupParticipants('chat-123');

      expect(participants).toHaveLength(2);
      expect(participants[0].role).toBe('admin');
      expect(participants[1].role).toBe('member');
    });

    it('should return empty array if no participants', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ 
        docs: [],
        forEach: function(callback: (doc: any) => void) {
          this.docs.forEach(callback);
        }
      });

      const participants = await GroupService.getGroupParticipants('chat-123');

      expect(participants).toEqual([]);
    });
  });
});

