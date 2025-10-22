/**
 * AddMemberSheet - Modal for adding members to group
 * 
 * Shows list of friends not already in the group
 * Multi-select with checkboxes
 * Add button at bottom to confirm
 */

import { Avatar } from '@/components/common';
import { GroupService } from '@/services/firebase';
import { useTheme } from '@/shared/hooks/useTheme';
import { Contact } from '@/shared/types';
import { useAuthStore, useContactStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface AddMemberSheetProps {
  visible: boolean;
  chatId: string | null;
  existingMemberIds: string[];
  onClose: () => void;
}

export const AddMemberSheet = ({ 
  visible, 
  chatId, 
  existingMemberIds,
  onClose 
}: AddMemberSheetProps) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { contacts, loadContacts } = useContactStore();
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Load contacts when sheet opens
  useEffect(() => {
    if (visible && user?.id) {
      loadContacts(user.id);
      setSelectedUserIds([]);
    }
  }, [visible, user?.id]);

  // Filter out friends already in the group
  const availableFriends = contacts.filter(
    contact => !existingMemberIds.includes(contact.userId)
  );

  const toggleSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (!chatId || selectedUserIds.length === 0) return;

    try {
      setIsAdding(true);

      // Add each selected user to the group
      // Firebase will handle duplicate prevention automatically
      const addPromises = selectedUserIds.map(userId =>
        GroupService.addMember(chatId, userId)
      );

      await Promise.all(addPromises);

      Alert.alert(
        'Success', 
        `Added ${selectedUserIds.length} ${selectedUserIds.length === 1 ? 'member' : 'members'}!`
      );
      
      onClose();
    } catch (error: any) {
      console.error('Failed to add members:', error);
      
      // Check if error is about duplicate members
      if (error.message?.includes('already a member')) {
        Alert.alert('Info', 'Some users are already members of this group');
      } else {
        Alert.alert('Error', 'Failed to add members. Please try again.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const renderFriend = ({ item }: { item: Contact }) => {
    const isSelected = selectedUserIds.includes(item.userId);

    return (
      <Pressable
        style={[
          styles.friendItem,
          { borderBottomColor: theme.colors.border }
        ]}
        onPress={() => toggleSelection(item.userId)}
      >
        <View style={styles.friendLeft}>
          <Avatar
            name={item.displayName}
            imageUrl={item.profilePictureUrl}
            size={48}
          />
          <View style={styles.friendInfo}>
            <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
              {item.displayName}
            </Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              @{item.username}
            </Text>
          </View>
        </View>

        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? theme.colors.primary : theme.colors.border,
              backgroundColor: isSelected ? theme.colors.primary : 'transparent',
            }
          ]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={18} color="#fff" />
          )}
        </View>
      </Pressable>
    );
  };

  return (
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
              Add Members
            </Text>
          </View>

          {/* Friends List */}
          {availableFriends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="people-outline" 
                size={64} 
                color={theme.colors.textSecondary} 
              />
              <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: 16 }]}>
                All your friends are already in this group!
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableFriends}
              renderItem={renderFriend}
              keyExtractor={(item) => item.userId}
              style={styles.friendsList}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          )}

          {/* Add Button */}
          {availableFriends.length > 0 && (
            <View style={styles.footer}>
              <Pressable
                style={[
                  styles.addButton,
                  { 
                    backgroundColor: selectedUserIds.length > 0 
                      ? theme.colors.primary 
                      : theme.colors.border 
                  }
                ]}
                onPress={handleAddMembers}
                disabled={selectedUserIds.length === 0 || isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color="#fff" />
                    <Text style={[theme.typography.bodyBold, { color: '#fff', marginLeft: 8 }]}>
                      Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
      </View>
    </Modal>
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
  friendsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendInfo: {
    marginLeft: 12,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
});

