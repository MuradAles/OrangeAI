/**
 * Home Screen - Chat List
 * Modern messaging interface with real-time updates
 */

import { ChatListItem, ChatModal, NewChatModal } from '@/features/chat/components';
import { ChatService, StorageService } from '@/services/firebase';
import { useTheme } from '@/shared/hooks/useTheme';
import { Chat, ChatType, Contact } from '@/shared/types';
import { useAuthStore, useChatStore, useContactStore, useGroupStore, usePresenceStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    chats, 
    isLoadingChats, 
    loadChatsFromSQLite, 
    subscribeToChats, 
    unsubscribeAll,
    getUserProfile,
    loadUserProfile,
  } = useChatStore();
  
  const chatsVersion = useChatStore(state => state.chatsVersion); // Subscribe to version for reactivity

  const { subscribeToUser } = usePresenceStore();
  const presenceMap = usePresenceStore(state => state.presenceMap);
  const presenceVersion = usePresenceStore(state => state.version); // Subscribe to version for reactivity

  const { contacts, loadContacts } = useContactStore();
  const { createGroup } = useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Load chats and contacts on mount
  useEffect(() => {
    if (user?.id) {
      // Load from SQLite first (instant)
      loadChatsFromSQLite(user.id);
      
      // Subscribe to real-time updates from Firestore
      subscribeToChats(user.id);

      // Load contacts for NewChatModal
      loadContacts(user.id);
    }

    // Cleanup on unmount
    return () => {
      unsubscribeAll();
    };
  }, [user?.id, loadChatsFromSQLite, subscribeToChats, unsubscribeAll, loadContacts]);

  // Subscribe to presence updates for all chat participants
  // Using centralized PresenceStore - only subscribes once per user globally
  useEffect(() => {
    if (!user?.id || chats.length === 0) return;

    // Get all unique participant IDs (excluding current user)
    const participantIds = new Set<string>();
    chats.forEach(chat => {
      chat.participants.forEach(participantId => {
        if (participantId !== user.id) {
          participantIds.add(participantId);
        }
      });
    });

    // Subscribe to each participant's presence (PresenceStore handles deduplication)
    participantIds.forEach(participantId => {
      subscribeToUser(participantId);
    });

    // No cleanup needed - PresenceStore manages subscriptions globally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats.map(c => c.participants.join(',')).join('|'), user?.id]);

  // Pull to refresh
  const handleRefresh = async () => {
    if (user?.id) {
      setRefreshing(true);
      await loadChatsFromSQLite(user.id);
      setRefreshing(false);
    }
  };

  // Open chat modal
  const handleChatPress = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  // Open new chat modal
  const handleNewChat = () => {
    setIsNewChatModalVisible(true);
  };

  // Create one-on-one chat
  const handleCreateOneOnOneChat = async (contact: Contact) => {
    if (!user) return;

    setIsCreatingChat(true);
    try {
      // Load contact's profile first so it displays correctly in chat modal
      await loadUserProfile(contact.userId);
      
      // Check if chat already exists
      const existingChat = chats.find(chat => 
        chat.type === 'one-on-one' && 
        chat.participants.includes(contact.userId)
      );

      if (existingChat) {
        // Open existing chat
        setIsNewChatModalVisible(false);
        setSelectedChatId(existingChat.id);
      } else {
        // Create new chat
        const newChatId = await ChatService.createChat(user.id, contact.userId);
        setIsNewChatModalVisible(false);
        setSelectedChatId(newChatId);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      Alert.alert('Error', 'Failed to create chat. Please try again.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Create group chat
  const handleCreateGroupChat = async (
    name: string,
    description: string,
    iconUri: string | null,
    memberIds: string[]
  ) => {
    if (!user) return;

    setIsCreatingChat(true);
    try {
      // Upload group icon if provided
      let groupIconUrl: string | undefined;
      if (iconUri) {
        groupIconUrl = await StorageService.uploadGroupIcon(iconUri, name);
      }

      // Create group
      const group = await createGroup(
        user.id,
        name,
        memberIds,
        description || undefined,
        groupIconUrl
      );

      if (group.success && group.chatId) {
        setIsNewChatModalVisible(false);
        setSelectedChatId(group.chatId);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  if (!user) {
    return null;
  }

  // Render chat item
  const renderChatItem = ({ item }: { item: Chat }) => {
    // For one-on-one chats, get the other user's info
    const otherUserId = item.participants.find(id => id !== user!.id);
    
    // Get user profile from cache
    const otherUserProfile = otherUserId ? getUserProfile(otherUserId) : null;
    
    // Get presence from centralized store (subscribed to presenceMap for reactivity)
    const presence = otherUserId ? presenceMap.get(otherUserId) : null;
    const isOnline = presence?.isOnline || false;
    
    return (
      <ChatListItem
        chat={item}
        currentUserId={user!.id}
        otherUserName={otherUserProfile?.displayName}
        otherUserAvatar={otherUserProfile?.profilePictureUrl}
        isOnline={isOnline}
        onPress={handleChatPress}
      />
    );
  };

  // Filter out chats with no messages (only show chats that have at least one message)
  // Check lastMessageTime instead of lastMessageText to include image-only messages
  const chatsWithMessages = chats.filter(chat => {
    // For group chats, always show them (even if empty) so users can find newly created groups
    if (chat.type === 'group') {
      return true;
    }
    
    // For one-on-one chats, must have a valid timestamp (not 0, not null)
    const hasValidTime = chat.lastMessageTime && chat.lastMessageTime !== 0;
    
    // Must have either text or be a group chat (groups can have image-only messages)
    const hasContent = chat.lastMessageText || (chat.type as ChatType) === 'group';
    
    return hasValidTime && hasContent;
  });

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyState}>
        <Ionicons
          name="chatbubbles-outline"
          size={80}
          color={theme.colors.textSecondary}
          style={{ opacity: 0.3 }}
        />
        <Text
          style={[
            theme.typography.h3,
            { color: theme.colors.text, marginTop: 24, textAlign: 'center' },
          ]}
        >
          No conversations yet
        </Text>
        <Text
          style={[
            theme.typography.body,
            {
              color: theme.colors.textSecondary,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 40,
            },
          ]}
        >
          Add friends and start chatting
        </Text>

        {/* Navigate to Friends Button */}
        <Pressable
          style={[
            styles.newChatButton,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={handleNewChat}
        >
          <Ionicons name="people" size={24} color="#fff" />
          <Text
            style={[
              theme.typography.bodyBold,
              { color: '#fff', marginLeft: 8 },
            ]}
          >
            Go to Friends
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
            Chats
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {chats.length} conversations
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/search' as any)} style={styles.headerButton}>
            <Ionicons name="search-outline" size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable onPress={handleNewChat} style={styles.headerButton}>
            <Ionicons name="create-outline" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Chat List */}
      {isLoadingChats && chats.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlashList
          data={chatsWithMessages}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          extraData={[presenceVersion, chatsVersion]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={
            chats.length === 0 ? { flexGrow: 1 } as any : undefined
          }
        />
      )}

      {/* FAB (Floating Action Button) - Navigate to Friends */}
      <Pressable
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleNewChat}
      >
        <Ionicons name="people" size={28} color="#fff" />
      </Pressable>

      {/* New Chat Modal */}
      <NewChatModal
        visible={isNewChatModalVisible}
        onClose={() => setIsNewChatModalVisible(false)}
        contacts={contacts}
        onCreateOneOnOneChat={handleCreateOneOnOneChat}
        onCreateGroupChat={handleCreateGroupChat}
        isCreating={isCreatingChat}
      />

      {/* Chat Modal */}
      <ChatModal
        visible={selectedChatId !== null}
        chatId={selectedChatId}
        onClose={() => setSelectedChatId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashListEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
