/**
 * Group Store
 * 
 * Zustand store for managing group chat state
 * - Group creation and updates
 * - Member management
 * - Admin operations
 */

import { SQLiteService } from '@/database/SQLiteService';
import { GroupService } from '@/services/firebase';
import { Chat, ChatParticipant, User } from '@/shared/types';
import { create } from 'zustand';

interface GroupState {
  // Group data
  currentGroup: Chat | null;
  groupParticipants: Map<string, ChatParticipant>; // userId -> participant
  participantProfiles: Map<string, User>; // userId -> user profile
  
  // Loading states
  isCreatingGroup: boolean;
  isLoadingGroup: boolean;
  isLoadingParticipants: boolean;
  isUpdatingGroup: boolean;
  
  // Error state
  error: string | null;

  // Actions
  createGroup: (
    name: string,
    description: string | undefined,
    groupIcon: string | undefined,
    creatorId: string,
    memberIds: string[]
  ) => Promise<Chat | null>;
  loadGroup: (groupId: string) => Promise<void>;
  loadGroupParticipants: (groupId: string) => Promise<void>;
  updateGroupInfo: (groupId: string, name: string, description?: string, icon?: string) => Promise<void>;
  addMember: (groupId: string, userId: string) => Promise<void>;
  leaveGroup: (groupId: string, userId: string) => Promise<void>;
  transferAdmin: (groupId: string, currentAdminId: string, newAdminId: string) => Promise<void>;
  joinGroupByInviteCode: (inviteCode: string, userId: string) => Promise<string | null>;
  regenerateInviteCode: (groupId: string) => Promise<string | null>;
  clearCurrentGroup: () => void;
  setError: (error: string | null) => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  // Initial state
  currentGroup: null,
  groupParticipants: new Map(),
  participantProfiles: new Map(),
  isCreatingGroup: false,
  isLoadingGroup: false,
  isLoadingParticipants: false,
  isUpdatingGroup: false,
  error: null,

  /**
   * Create a new group
   */
  createGroup: async (name, description, groupIcon, creatorId, memberIds) => {
    set({ isCreatingGroup: true, error: null });
    try {
      
      // Create group in Firestore
      const group = await GroupService.createGroup(
        name,
        description,
        groupIcon,
        creatorId,
        memberIds
      );

      // Save to SQLite (convert Chat to ChatRow format)
      const chatRow = {
        ...group,
        participants: JSON.stringify(group.participants),
        type: group.type as string,
      };
      await SQLiteService.saveChat(chatRow as any);

      set({ 
        currentGroup: group,
        isCreatingGroup: false,
      });

      return group;
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create group';
      set({ error: errorMessage, isCreatingGroup: false });
      return null;
    }
  },

  /**
   * Load group by ID
   */
  loadGroup: async (groupId) => {
    set({ isLoadingGroup: true, error: null });
    try {
      console.log('📦 Loading group:', groupId);
      
      // Try SQLite first
      let group = await SQLiteService.getChatById(groupId);
      
      // If not in SQLite, fetch from Firestore
      if (!group) {
        const fetchedGroup = await GroupService.getGroup(groupId);
        if (fetchedGroup) {
          const chatRow = {
            ...fetchedGroup,
            participants: JSON.stringify(fetchedGroup.participants),
            type: fetchedGroup.type as string,
          };
          await SQLiteService.saveChat(chatRow as any);
          group = fetchedGroup as any;
        }
      }

      set({ 
        currentGroup: group as any,
        isLoadingGroup: false,
      });

      console.log('✅ Group loaded:', group?.groupName);
    } catch (error) {
      console.error('❌ Failed to load group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load group';
      set({ error: errorMessage, isLoadingGroup: false });
    }
  },

  /**
   * Load group participants
   */
  loadGroupParticipants: async (groupId) => {
    set({ isLoadingParticipants: true, error: null });
    try {
      console.log('📦 Loading group participants:', groupId);
      
      const participants = await GroupService.getGroupParticipants(groupId);
      const participantsMap = new Map<string, ChatParticipant>();
      participants.forEach(p => participantsMap.set(p.userId, p));

      set({ 
        groupParticipants: participantsMap,
        isLoadingParticipants: false,
      });

      console.log('✅ Loaded', participants.length, 'participants');
    } catch (error) {
      console.error('❌ Failed to load participants:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load participants';
      set({ error: errorMessage, isLoadingParticipants: false });
    }
  },

  /**
   * Update group information
   */
  updateGroupInfo: async (groupId, name, description, icon) => {
    set({ isUpdatingGroup: true, error: null });
    try {
      console.log('📦 Updating group info:', groupId);
      
      await GroupService.updateGroupInfo(groupId, {
        groupName: name,
        groupDescription: description,
        groupIcon: icon,
      });

      // Update local state
      const { currentGroup } = get();
      if (currentGroup && currentGroup.id === groupId) {
        const updatedGroup = {
          ...currentGroup,
          groupName: name,
          groupDescription: description || null,
          groupIcon: icon || null,
        };
        
        // Update SQLite (convert Chat to ChatRow format)
        const chatRow = {
          ...updatedGroup,
          participants: JSON.stringify(updatedGroup.participants),
          type: updatedGroup.type as string,
        };
        await SQLiteService.saveChat(chatRow as any);
        
        set({ 
          currentGroup: updatedGroup,
          isUpdatingGroup: false,
        });
      } else {
        set({ isUpdatingGroup: false });
      }

      console.log('✅ Group info updated');
    } catch (error) {
      console.error('❌ Failed to update group info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update group';
      set({ error: errorMessage, isUpdatingGroup: false });
    }
  },

  /**
   * Add member to group
   */
  addMember: async (groupId, userId) => {
    set({ error: null });
    try {
      console.log('📦 Adding member to group:', userId);
      
      await GroupService.addMember(groupId, userId);

      // Reload participants
      await get().loadGroupParticipants(groupId);

      console.log('✅ Member added');
    } catch (error) {
      console.error('❌ Failed to add member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add member';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Leave group
   */
  leaveGroup: async (groupId, userId) => {
    set({ error: null });
    try {
      console.log('📦 Leaving group:', groupId);
      
      await GroupService.leaveGroup(groupId, userId);

      // Clear current group
      set({ currentGroup: null, groupParticipants: new Map() });

      console.log('✅ Left group');
    } catch (error) {
      console.error('❌ Failed to leave group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave group';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Transfer admin role
   */
  transferAdmin: async (groupId, currentAdminId, newAdminId) => {
    set({ error: null });
    try {
      console.log('📦 Transferring admin role to:', newAdminId);
      
      await GroupService.transferAdmin(groupId, currentAdminId, newAdminId);

      // Update current group
      const { currentGroup } = get();
      if (currentGroup && currentGroup.id === groupId) {
        const updatedGroup = {
          ...currentGroup,
          groupAdminId: newAdminId,
        };
        
        const chatRow = {
          ...updatedGroup,
          participants: JSON.stringify(updatedGroup.participants),
          type: updatedGroup.type as string,
        };
        await SQLiteService.saveChat(chatRow as any);
        set({ currentGroup: updatedGroup });
      }

      // Reload participants
      await get().loadGroupParticipants(groupId);

      console.log('✅ Admin role transferred');
    } catch (error) {
      console.error('❌ Failed to transfer admin:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transfer admin';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Join group by invite code
   */
  joinGroupByInviteCode: async (inviteCode, userId) => {
    set({ error: null });
    try {
      console.log('📦 Joining group with invite code:', inviteCode);
      
      const groupId = await GroupService.joinGroupByInviteCode(inviteCode, userId);

      // Load the group
      await get().loadGroup(groupId);

      console.log('✅ Joined group:', groupId);
      return groupId;
    } catch (error) {
      console.error('❌ Failed to join group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid invite code';
      set({ error: errorMessage });
      return null;
    }
  },

  /**
   * Regenerate invite code
   */
  regenerateInviteCode: async (groupId) => {
    set({ error: null });
    try {
      console.log('📦 Regenerating invite code for group:', groupId);
      
      const newCode = await GroupService.regenerateInviteCode(groupId);

      // Update current group
      const { currentGroup } = get();
      if (currentGroup && currentGroup.id === groupId) {
        const updatedGroup = {
          ...currentGroup,
          inviteCode: newCode,
        };
        
        const chatRow = {
          ...updatedGroup,
          participants: JSON.stringify(updatedGroup.participants),
          type: updatedGroup.type as string,
        };
        await SQLiteService.saveChat(chatRow as any);
        set({ currentGroup: updatedGroup });
      }

      console.log('✅ Invite code regenerated:', newCode);
      return newCode;
    } catch (error) {
      console.error('❌ Failed to regenerate invite code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate code';
      set({ error: errorMessage });
      return null;
    }
  },

  /**
   * Clear current group
   */
  clearCurrentGroup: () => {
    set({ 
      currentGroup: null,
      groupParticipants: new Map(),
      participantProfiles: new Map(),
      error: null,
    });
  },

  /**
   * Set error message
   */
  setError: (error) => {
    set({ error });
  },
}));


