/**
 * Group Service
 * 
 * Handles all group chat operations in Firestore
 * - Create/update/delete groups
 * - Add/remove members
 * - Admin role management
 * - Group invite links
 */

import { Chat, ChatParticipant, UpdateGroupData } from '@/shared/types';
import { generateInviteCode } from '@/shared/utils';
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { firestore } from './FirebaseConfig';

/**
 * Group Service
 * All methods are static - this is a stateless service
 */
export class GroupService {
  
  /**
   * Create a new group chat
   * 
   * @param name - Group name (required)
   * @param description - Group description (optional)
   * @param groupIcon - Firebase Storage URL for group icon (optional)
   * @param creatorId - User ID of the creator (becomes admin)
   * @param memberIds - Array of user IDs to add as members
   * @returns Created chat document
   */
  static async createGroup(
    name: string,
    description: string | undefined,
    groupIcon: string | undefined,
    creatorId: string,
    memberIds: string[]
  ): Promise<Chat> {
    try {
      // Validate inputs
      if (!name || name.trim().length === 0) {
        throw new Error('Group name is required');
      }
      if (memberIds.length === 0) {
        throw new Error('At least one member is required');
      }

      // Generate invite code
      const inviteCode = generateInviteCode();

      // All participants = creator + members
      const allParticipants = [creatorId, ...memberIds.filter(id => id !== creatorId)];

      const batch = writeBatch(firestore);

      // Create chat document
      const chatRef = doc(collection(firestore, 'chats'));
      const chatData = {
        type: 'group',
        participants: allParticipants,
        lastMessageText: '', // No message yet
        lastMessageTime: null, // No message yet, so no time
        lastMessageSenderId: '',
        createdAt: serverTimestamp(),
        createdBy: creatorId,
        groupName: name.trim(),
        groupDescription: description?.trim() || null,
        groupIcon: groupIcon || null,
        groupAdminId: creatorId,
        inviteCode,
      };
      batch.set(chatRef, chatData);

      // Create participant documents
      // Creator is admin
      const creatorParticipantRef = doc(firestore, 'chats', chatRef.id, 'participants', creatorId);
      batch.set(creatorParticipantRef, {
        userId: creatorId,
        role: 'admin',
        joinedAt: serverTimestamp(),
        lastReadMessageId: null,
        lastReadTimestamp: null,
        unreadCount: 0,
      });

      // Other members
      for (const memberId of memberIds) {
        if (memberId === creatorId) continue; // Skip creator
        
        const memberParticipantRef = doc(firestore, 'chats', chatRef.id, 'participants', memberId);
        batch.set(memberParticipantRef, {
          userId: memberId,
          role: 'member',
          joinedAt: serverTimestamp(),
          lastReadMessageId: null,
          lastReadTimestamp: null,
          unreadCount: 0,
        });
      }

      // Commit batch
      await batch.commit();


      // Return chat object
      return {
        id: chatRef.id,
        type: 'group',
        participants: allParticipants,
        lastMessageText: '', // No message yet
        lastMessageTime: 0, // No message yet, so no time
        lastMessageSenderId: '',
        createdAt: Date.now(),
        createdBy: creatorId,
        groupName: name.trim(),
        groupDescription: description?.trim() || null,
        groupIcon: groupIcon || null,
        groupAdminId: creatorId,
        inviteCode,
      };
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      throw error;
    }
  }

  /**
   * Get group by ID
   */
  static async getGroup(groupId: string): Promise<Chat | null> {
    try {
      const chatRef = doc(firestore, 'chats', groupId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        return null;
      }

      const data = chatSnap.data();

      return {
        id: chatSnap.id,
        type: data.type,
        participants: data.participants,
        lastMessageText: data.lastMessageText,
        lastMessageTime: data.lastMessageTime?.toMillis() || Date.now(),
        lastMessageSenderId: data.lastMessageSenderId,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        createdBy: data.createdBy,
        groupName: data.groupName || null,
        groupDescription: data.groupDescription || null,
        groupIcon: data.groupIcon || null,
        groupAdminId: data.groupAdminId || null,
        inviteCode: data.inviteCode || null,
      };
    } catch (error) {
      console.error('❌ Failed to get group:', error);
      throw error;
    }
  }

  /**
   * Update group information (name, description, icon)
   * Only admin can update
   */
  static async updateGroupInfo(
    groupId: string,
    updates: UpdateGroupData
  ): Promise<void> {
    try {
      const chatRef = doc(firestore, 'chats', groupId);
      
      const updateData: any = {
        // Update metadata timestamp (NOT lastMessageTime - that's for messages only)
        updatedAt: serverTimestamp(),
      };
      
      if (updates.groupName !== undefined) {
        updateData.groupName = updates.groupName.trim();
      }
      if (updates.groupDescription !== undefined) {
        updateData.groupDescription = updates.groupDescription?.trim() || null;
      }
      if (updates.groupIcon !== undefined) {
        updateData.groupIcon = updates.groupIcon || null;
      }

      await updateDoc(chatRef, updateData);
      console.log('✅ Group info updated:', groupId);
    } catch (error) {
      console.error('❌ Failed to update group info:', error);
      throw error;
    }
  }

  /**
   * Add member to group
   * Only admin can add members
   */
  static async addMember(
    groupId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if group exists and if user is already a member
      const chatRef = doc(firestore, 'chats', groupId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        throw new Error('Group not found');
      }

      const currentParticipants = chatSnap.data().participants || [];
      if (currentParticipants.includes(userId)) {
        console.log('⚠️ User already a member, skipping:', userId);
        return; // Silently skip instead of throwing error
      }

      const batch = writeBatch(firestore);

      // Use arrayUnion to atomically add to participants array
      // This prevents race conditions when adding multiple users concurrently
      batch.update(chatRef, {
        participants: arrayUnion(userId),
      });

      // Create participant document
      const participantRef = doc(firestore, 'chats', groupId, 'participants', userId);
      batch.set(participantRef, {
        userId,
        role: 'member',
        joinedAt: serverTimestamp(),
        lastReadMessageId: null,
        lastReadTimestamp: null,
        unreadCount: 0,
      });

      await batch.commit();
      console.log('✅ Member added to group:', userId);
    } catch (error) {
      console.error('❌ Failed to add member:', error);
      throw error;
    }
  }

  /**
   * Leave group
   * If admin leaves, transfer to oldest member
   * If last member leaves, delete group
   */
  static async leaveGroup(
    groupId: string,
    userId: string
  ): Promise<void> {
    try {
      const chatRef = doc(firestore, 'chats', groupId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        throw new Error('Group not found');
      }

      const groupData = chatSnap.data();
      const isAdmin = groupData.groupAdminId === userId;
      const currentParticipants = groupData.participants || [];

      // If user is the last member, delete the group
      if (currentParticipants.length === 1) {
        await this.deleteGroup(groupId);
        console.log('✅ Last member left, group deleted');
        return;
      }

      const batch = writeBatch(firestore);

      // Use arrayRemove to atomically remove from participants array
      batch.update(chatRef, {
        participants: arrayRemove(userId),
      });

      // Delete participant document
      const participantRef = doc(firestore, 'chats', groupId, 'participants', userId);
      batch.delete(participantRef);

      // If admin is leaving, transfer to oldest member
      if (isAdmin && currentParticipants.length > 1) {
        const newAdminId = await this.getOldestMember(groupId, userId);
        if (newAdminId) {
          batch.update(chatRef, {
            groupAdminId: newAdminId,
          });

          // Update new admin's role
          const newAdminParticipantRef = doc(firestore, 'chats', groupId, 'participants', newAdminId);
          batch.update(newAdminParticipantRef, {
            role: 'admin',
          });

          console.log('✅ Admin role transferred to:', newAdminId);
        }
      }

      await batch.commit();
      console.log('✅ User left group:', userId);
    } catch (error) {
      console.error('❌ Failed to leave group:', error);
      throw error;
    }
  }

  /**
   * Get oldest member (by joinedAt timestamp)
   * Used for admin transitions
   */
  private static async getOldestMember(
    groupId: string,
    excludeUserId: string
  ): Promise<string | null> {
    try {
      const participantsRef = collection(firestore, 'chats', groupId, 'participants');
      const participantsSnap = await getDocs(participantsRef);

      let oldestUserId: string | null = null;
      let oldestJoinedAt: number = Number.MAX_VALUE;

      participantsSnap.docs.forEach((participantDoc) => {
        const data = participantDoc.data();
        const userId = data.userId as string;
        const timestamp = data.joinedAt as Timestamp;
        
        if (userId === excludeUserId) return; // Skip the leaving user

        const joinedAt = timestamp?.toMillis?.() || 0;
        if (joinedAt < oldestJoinedAt) {
          oldestUserId = userId;
          oldestJoinedAt = joinedAt;
        }
      });

      return oldestUserId;
    } catch (error) {
      console.error('❌ Failed to get oldest member:', error);
      return null;
    }
  }

  /**
   * Transfer admin role to another member
   */
  static async transferAdmin(
    groupId: string,
    currentAdminId: string,
    newAdminId: string
  ): Promise<void> {
    try {
      const batch = writeBatch(firestore);

      // Update chat document
      const chatRef = doc(firestore, 'chats', groupId);
      batch.update(chatRef, {
        groupAdminId: newAdminId,
      });

      // Update old admin to member
      const oldAdminParticipantRef = doc(firestore, 'chats', groupId, 'participants', currentAdminId);
      batch.update(oldAdminParticipantRef, {
        role: 'member',
      });

      // Update new admin to admin
      const newAdminParticipantRef = doc(firestore, 'chats', groupId, 'participants', newAdminId);
      batch.update(newAdminParticipantRef, {
        role: 'admin',
      });

      await batch.commit();
      console.log('✅ Admin role transferred:', currentAdminId, '->', newAdminId);
    } catch (error) {
      console.error('❌ Failed to transfer admin:', error);
      throw error;
    }
  }

  /**
   * Delete group (and all messages)
   * Only called when last member leaves
   */
  static async deleteGroup(groupId: string): Promise<void> {
    try {
      const batch = writeBatch(firestore);

      // Delete all participants
      const participantsRef = collection(firestore, 'chats', groupId, 'participants');
      const participantsSnap = await getDocs(participantsRef);
      participantsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete chat document
      const chatRef = doc(firestore, 'chats', groupId);
      batch.delete(chatRef);

      await batch.commit();
      console.log('✅ Group deleted:', groupId);
    } catch (error) {
      console.error('❌ Failed to delete group:', error);
      throw error;
    }
  }

  /**
   * Join group via invite code
   */
  static async joinGroupByInviteCode(
    inviteCode: string,
    userId: string
  ): Promise<string> {
    try {
      // Find group by invite code
      const chatsRef = collection(firestore, 'chats');
      const q = query(chatsRef, where('inviteCode', '==', inviteCode));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        throw new Error('Invalid invite code');
      }

      const chatDoc = querySnap.docs[0];
      const groupId = chatDoc.id;
      const groupData = chatDoc.data();

      // Check if user is already a member
      if (groupData.participants.includes(userId)) {
        throw new Error('You are already a member of this group');
      }

      // Add user to group
      await this.addMember(groupId, userId);

      return groupId;
    } catch (error) {
      console.error('❌ Failed to join group by invite code:', error);
      throw error;
    }
  }

  /**
   * Regenerate invite code
   * Only admin can regenerate
   */
  static async regenerateInviteCode(groupId: string): Promise<string> {
    try {
      const newInviteCode = generateInviteCode();
      const chatRef = doc(firestore, 'chats', groupId);
      
      await updateDoc(chatRef, {
        inviteCode: newInviteCode,
      });

      console.log('✅ Invite code regenerated:', newInviteCode);
      return newInviteCode;
    } catch (error) {
      console.error('❌ Failed to regenerate invite code:', error);
      throw error;
    }
  }

  /**
   * Get group participants with details
   */
  static async getGroupParticipants(groupId: string): Promise<ChatParticipant[]> {
    try {
      const participantsRef = collection(firestore, 'chats', groupId, 'participants');
      const participantsSnap = await getDocs(participantsRef);

      const participants: ChatParticipant[] = [];
      participantsSnap.forEach((doc) => {
        const data = doc.data();
        participants.push({
          userId: data.userId,
          role: data.role,
          joinedAt: data.joinedAt?.toMillis() || Date.now(),
          lastReadMessageId: data.lastReadMessageId || null,
          lastReadTimestamp: data.lastReadTimestamp?.toMillis() || null,
          unreadCount: data.unreadCount || 0,
        });
      });

      return participants;
    } catch (error) {
      console.error('❌ Failed to get group participants:', error);
      throw error;
    }
  }
}


