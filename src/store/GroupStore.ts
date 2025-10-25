/**
 * Group Store
 * Manages group chat creation and metadata
 */

import { GroupService } from '@/services/firebase';
import { create } from 'zustand';

interface GroupState {
  // Actions
  createGroup: (
    adminId: string,
    name: string,
    memberIds: string[],
    description?: string,
    avatarUrl?: string
  ) => Promise<{ success: boolean; chatId?: string; error?: string }>;
}

export const useGroupStore = create<GroupState>()((set, get) => ({
  /**
   * Create a new group chat
   */
  createGroup: async (
    adminId: string,
    name: string,
    memberIds: string[],
    description?: string,
    avatarUrl?: string
  ) => {
    try {
      const chat = await GroupService.createGroup(
        adminId,
        name,
        memberIds,
        description,
        avatarUrl
      );

      return {
        success: true,
        chatId: chat.id,
      };
    } catch (error: any) {
      console.error('Failed to create group:', error);
      return {
        success: false,
        error: error.message || 'Failed to create group',
      };
    }
  },
}));

