/**
 * GroupSettingsModal - Bottom sheet for group settings
 * 
 * Shows:
 * - Group icon (anyone can change)
 * - Group name (anyone can edit)
 * - Member list with online status
 * - Add Users button
 */

import { Avatar } from '@/components/common';
import { GroupService, StorageService } from '@/services/firebase';
import { useTheme } from '@/shared/hooks/useTheme';
import { User } from '@/shared/types';
import { useAuthStore, useChatStore, usePresenceStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { AddMemberSheet } from './AddMemberSheet';

interface GroupSettingsModalProps {
  visible: boolean;
  chatId: string | null;
  onClose: () => void;
}

export const GroupSettingsModal = ({ visible, chatId, onClose }: GroupSettingsModalProps) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { chats, loadUserProfile } = useChatStore();
  const { subscribeToUser, presenceMap } = usePresenceStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [showAddMemberSheet, setShowAddMemberSheet] = useState(false);
  const [members, setMembers] = useState<Array<User & { role: string; isOnline: boolean }>>([]);

  // Get current chat
  const currentChat = chats.find(chat => chat.id === chatId);

  // Load members when modal opens
  useEffect(() => {
    if (visible && chatId && currentChat) {
      loadMembers();
      setGroupName(currentChat.groupName || '');
    }
  }, [visible, chatId]);

  // Sync group name when currentChat updates (real-time listener)
  useEffect(() => {
    if (currentChat && !isEditingName) {
      setGroupName(currentChat.groupName || '');
    }
  }, [currentChat?.groupName, isEditingName]);

  // Subscribe to presence for all members
  useEffect(() => {
    if (visible && members.length > 0) {
      members.forEach(member => {
        // Only subscribe if member has a valid ID
        if (member?.id) {
          subscribeToUser(member.id);
        } else {
          console.warn('Skipping presence subscription for member with undefined ID:', member);
        }
      });
    }
  }, [visible, members, subscribeToUser]);

  const loadMembers = async () => {
    if (!chatId || !currentChat) return;

    try {
      setIsLoading(true);

      // Get participants with roles from Firestore
      const participants = await GroupService.getGroupParticipants(chatId);

      // Load user profiles for each participant (use loadUserProfile to fetch if not cached)
      const memberPromises = participants.map(async (participant) => {
        try {
          // Load profile from Firestore (will fetch if not cached)
          const profile = await loadUserProfile(participant.userId);
          
          if (!profile || !profile.id) {
            console.warn('Failed to load profile for participant:', participant.userId);
            return null;
          }
          
          const presence = presenceMap.get(participant.userId);
          
          return {
            ...profile,
            role: participant.role,
            isOnline: presence?.isOnline || false,
          } as User & { role: string; isOnline: boolean };
        } catch (error) {
          console.error('Error loading profile for participant:', participant.userId, error);
          return null;
        }
      });

      const memberProfiles = (await Promise.all(memberPromises))
        .filter((member): member is User & { role: string; isOnline: boolean } => member !== null);

      // Sort: Admin first, then by name
      memberProfiles.sort((a, b) => {
        if (a.role === 'admin') return -1;
        if (b.role === 'admin') return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      setMembers(memberProfiles);
    } catch (error) {
      console.error('Failed to load members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeIcon = async () => {
    if (!chatId) return;

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to change the group icon.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;

      setIsLoading(true);

      // Upload image to Firebase Storage
      const imageUrl = await StorageService.uploadGroupIcon(
        result.assets[0].uri,
        currentChat.groupName || 'Group'
      );

      // Update group in Firestore
      await GroupService.updateGroupInfo(chatId, { groupIcon: imageUrl });

      // Force an immediate update in the store (optimistic update)
      const { useChatStore } = await import('@/store');
      useChatStore.setState(state => {
        const updatedChats = state.chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, groupIcon: imageUrl }
            : chat
        );
        return {
          chats: updatedChats,
          chatsVersion: state.chatsVersion + 1
        };
      });

      Alert.alert('Success', 'Group icon updated!');
    } catch (error) {
      console.error('Failed to change group icon:', error);
      Alert.alert('Error', 'Failed to update group icon');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGroupName = async () => {
    if (!chatId || !groupName.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }

    try {
      setIsLoading(true);

      await GroupService.updateGroupInfo(chatId, { groupName: groupName.trim() });

      // Force an immediate update in the store (optimistic update)
      const { useChatStore } = await import('@/store');
      useChatStore.setState(state => {
        const updatedChats = state.chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, groupName: groupName.trim() }
            : chat
        );
        return {
          chats: updatedChats,
          chatsVersion: state.chatsVersion + 1
        };
      });

      setIsEditingName(false);
      Alert.alert('Success', 'Group name updated!');
    } catch (error) {
      console.error('Failed to update group name:', error);
      Alert.alert('Error', 'Failed to update group name');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (member: User & { role: string; isOnline: boolean }) => {
    if (!chatId || !user) return;

    // Check if current user is admin
    const isAdmin = currentChat?.groupAdminId === user.id;
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only admin can remove members');
      return;
    }

    // Can't remove admin
    if (member.role === 'admin') {
      Alert.alert('Cannot Remove', 'Admin cannot be removed. Admin must leave or transfer role first.');
      return;
    }

    // Can't remove yourself (use Leave Group instead)
    if (member.id === user.id) {
      Alert.alert('Cannot Remove', 'Use "Leave Group" to leave the group');
      return;
    }

    // Confirmation dialog
    Alert.alert(
      'Remove Member',
      `Remove ${member.displayName} from the group?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await GroupService.removeMember(chatId, member.id, user.id);
              
              // Reload members list
              await loadMembers();
              
              Alert.alert('Success', `${member.displayName} has been removed from the group`);
            } catch (error) {
              console.error('Failed to remove member:', error);
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    if (!chatId || !user) return;

    const isAdmin = currentChat?.groupAdminId === user.id;
    const memberCount = members.length;

    let message = 'Are you sure you want to leave this group?';
    
    if (isAdmin && memberCount > 1) {
      message = 'You are the admin. The oldest member will become the new admin. Are you sure you want to leave?';
    } else if (memberCount === 1) {
      message = 'You are the last member. Leaving will delete this group. Are you sure?';
    }

    Alert.alert(
      'Leave Group',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await GroupService.leaveGroup(chatId, user.id);
              
              // Delete from SQLite (local storage cleanup)
              const { SQLiteService } = await import('@/database/SQLiteService');
              await SQLiteService.deleteMessagesByChatId(chatId); // Delete all messages
              await SQLiteService.deleteChatById(chatId); // Delete chat
              
              // Remove from local state
              const { useChatStore } = await import('@/store');
              useChatStore.setState(state => ({
                chats: state.chats.filter(chat => chat.id !== chatId),
                chatsVersion: state.chatsVersion + 1,
              }));

              // Close modal and navigate back
              onClose();
              
              Alert.alert('Left Group', 'You have left the group');
            } catch (error) {
              console.error('Failed to leave group:', error);
              Alert.alert('Error', 'Failed to leave group');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: User & { role: string; isOnline: boolean } }) => {
    // Get real-time online status from PresenceStore
    const presence = presenceMap.get(item.id);
    const isOnline = presence?.isOnline || false;

    // Check if current user is admin
    const isAdmin = currentChat?.groupAdminId === user?.id;
    
    // Show remove button if: admin, not removing self, not removing admin
    const canRemove = isAdmin && item.id !== user?.id && item.role !== 'admin';

    return (
      <Pressable
        onLongPress={() => canRemove && handleRemoveMember(item)}
        style={({ pressed }) => [
          styles.memberItem,
          { 
            borderBottomColor: theme.colors.border,
            backgroundColor: pressed ? theme.colors.surface : 'transparent',
          }
        ]}
      >
        <View style={styles.avatarWithIndicator}>
          <Avatar
            name={item.displayName}
            imageUrl={item.profilePictureUrl}
            size={48}
          />
          {isOnline && (
            <View style={[styles.onlineDot, { backgroundColor: theme.colors.success }]} />
          )}
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
              {item.displayName}
            </Text>
            {item.role === 'admin' && (
              <View style={[styles.adminBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={[theme.typography.bodySmall, { color: '#fff', fontSize: 10 }]}>
                  Admin
                </Text>
              </View>
            )}
          </View>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            @{item.username}
          </Text>
        </View>

        {/* Show remove icon for admin (subtle hint) */}
        {canRemove && (
          <Ionicons name="remove-circle-outline" size={20} color={theme.colors.textSecondary} />
        )}
      </Pressable>
    );
  };

  if (!currentChat) return null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
        presentationStyle="fullScreen"
      >
        <View 
          style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
            {/* Header */}
            <View style={[styles.header, { 
              backgroundColor: theme.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border 
            }]}>
              <Pressable onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </Pressable>
              <Text style={[theme.typography.h3, { color: theme.colors.text, flex: 1 }]}>
                Group Settings
              </Text>
            </View>

            {/* Group Icon */}
            <View style={styles.section}>
              <Pressable 
                onPress={handleChangeIcon}
                disabled={isLoading}
                style={styles.iconContainer}
              >
                <Avatar
                  name={currentChat.groupName || 'Group'}
                  imageUrl={currentChat.groupIcon}
                  size={100}
                />
                <View style={[styles.editIconBadge, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              </Pressable>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                Tap to change group icon
              </Text>
            </View>

            {/* Group Name */}
            <View style={styles.section}>
              {isEditingName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      theme.typography.body,
                      { 
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                      }
                    ]}
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholder="Group name"
                    placeholderTextColor={theme.colors.textSecondary}
                    maxLength={50}
                    autoFocus
                  />
                  <View style={styles.nameActions}>
                    <Pressable 
                      onPress={() => {
                        setGroupName(currentChat.groupName || '');
                        setIsEditingName(false);
                      }}
                      style={styles.nameActionButton}
                    >
                      <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable 
                      onPress={handleSaveGroupName}
                      style={styles.nameActionButton}
                      disabled={isLoading || !groupName.trim()}
                    >
                      <Text style={[theme.typography.bodyBold, { color: theme.colors.primary }]}>
                        Save
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable 
                  onPress={() => setIsEditingName(true)}
                  style={styles.nameDisplay}
                >
                  <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
                    {currentChat.groupName}
                  </Text>
                  <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Members Section */}
            <View style={[styles.section, { flex: 1 }]}>
              <View style={styles.sectionHeader}>
                <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
                  Members ({members.length})
                </Text>
                {currentChat?.groupAdminId === user?.id && (
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                    Long press to remove members
                  </Text>
                )}
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : (
                <FlatList
                  data={members}
                  renderItem={renderMember}
                  keyExtractor={(item, index) => item.id || `member-${index}`}
                  style={styles.membersList}
                  contentContainerStyle={{ paddingBottom: 16 }}
                />
              )}
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              {/* Add Users Button */}
              <Pressable
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowAddMemberSheet(true)}
                disabled={isLoading}
              >
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={[theme.typography.bodyBold, { color: '#fff', marginLeft: 8 }]}>
                  Add Users
                </Text>
              </Pressable>

              {/* Leave Group Button */}
              <Pressable
                style={[styles.leaveButton, { borderColor: theme.colors.error }]}
                onPress={handleLeaveGroup}
                disabled={isLoading}
              >
                <Ionicons name="exit-outline" size={20} color={theme.colors.error} />
                <Text style={[theme.typography.bodyBold, { color: theme.colors.error, marginLeft: 8 }]}>
                  Leave Group
                </Text>
              </Pressable>
            </View>
        </View>
      </Modal>

      {/* Add Member Sheet */}
      <AddMemberSheet
        visible={showAddMemberSheet}
        chatId={chatId}
        existingMemberIds={members.map(m => m.id)}
        onClose={() => {
          setShowAddMemberSheet(false);
          // Reload members after adding
          loadMembers();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  nameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nameEditContainer: {
    gap: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  nameActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarWithIndicator: {
    position: 'relative',
    marginRight: 12,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});

