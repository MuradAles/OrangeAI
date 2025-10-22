/**
 * Friends Screen
 * Manage friends and friend requests
 */

import { Avatar } from '@/components/common';
import { ChatModal } from '@/features/chat/components';
import { ChatService } from '@/services/firebase';
import { useTheme } from '@/shared/hooks/useTheme';
import { useAuthStore, useChatStore, useContactStore, usePresenceStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

type TabType = 'friends' | 'requests' | 'sent';

export default function FriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    contacts,
    contactsLoading,
    friendRequests,
    friendRequestsLoading,
    sentRequests,
    sentRequestsLoading,
    loadContacts,
    subscribeFriendRequests,
    subscribeSentRequests,
    unsubscribeAll,
    acceptFriendRequest,
    ignoreFriendRequest,
    cancelFriendRequest,
  } = useContactStore();

  const { subscribeToUser } = usePresenceStore();
  const presenceMap = usePresenceStore(state => state.presenceMap);
  const presenceVersion = usePresenceStore(state => state.version); // Subscribe to version for reactivity

  const { loadUserProfile } = useChatStore();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    
    // Load contacts once
    loadContacts(user.id);
    
    // Subscribe to real-time updates for friend requests
    subscribeFriendRequests(user.id);
    subscribeSentRequests(user.id);

    // Cleanup: unsubscribe when component unmounts
    return () => {
      unsubscribeAll();
    };
  }, [user?.id]); // Only re-run if userId changes, not entire user object

  // Subscribe to presence updates for all contacts
  // Using centralized PresenceStore - only subscribes once per user globally
  useEffect(() => {
    if (!user?.id || contacts.length === 0) return;

    // Subscribe to each contact's presence (PresenceStore handles deduplication)
    contacts.forEach(contact => {
      subscribeToUser(contact.userId);
    });

    // No cleanup needed - PresenceStore manages subscriptions globally
  }, [contacts.map(c => c.userId).join(','), user?.id, subscribeToUser]);

  if (!user) {
    return null;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Reload contacts (friend requests auto-update via real-time listeners)
    await loadContacts(user.id);
    
    setRefreshing(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    const result = await acceptFriendRequest(requestId, user.id);
    
    setProcessingRequests(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });

    if (result.success) {
      Alert.alert('Success', 'Friend request accepted!');
    } else {
      // Friend requests will auto-sync via real-time listener
      Alert.alert('Error', result.error || 'Failed to accept request');
    }
  };

  const handleIgnoreRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    const result = await ignoreFriendRequest(requestId, user.id);
    
    setProcessingRequests(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });

    if (!result.success) {
      // Friend requests will auto-sync via real-time listener
      Alert.alert('Error', result.error || 'Failed to ignore request');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    const result = await cancelFriendRequest(requestId, user.id);
    
    setProcessingRequests(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });

    if (!result.success) {
      // Sent requests will auto-sync via real-time listener
      // Show error message only if it's not the "already responded" case
      if (result.error && !result.error.includes('pending')) {
        Alert.alert('Error', result.error);
      }
    }
  };

  const handleStartChat = async (friendUserId: string) => {
    if (!user) return;

    try {
      // Load friend's profile first so it displays correctly in chat modal
      await loadUserProfile(friendUserId);
      
      // Check if chat already exists
      const existingChatId = await ChatService.findExistingChat(user.id, friendUserId);

      if (existingChatId) {
        // Chat exists, open modal
        setSelectedChatId(existingChatId);
      } else {
        // Create new chat and open modal
        const chatId = await ChatService.createChat(user.id, friendUserId);
        setSelectedChatId(chatId);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const renderFriendItem = ({ item }: any) => {
    // Get presence from centralized store (subscribed to presenceMap for reactivity)
    const presence = presenceMap.get(item.userId);
    const isOnline = presence?.isOnline || false;

    return (
      <Pressable
        style={[styles.listItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => handleStartChat(item.userId)}
      >
        <View style={styles.avatarWithIndicator}>
          <Avatar
            name={item.displayName}
            imageUrl={item.profilePictureUrl}
            size={50}
          />
          {isOnline && (
            <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.success }]} />
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
            {item.displayName}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            @{item.username}
          </Text>
        </View>
        <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} />
      </Pressable>
    );
  };

  const renderRequestItem = ({ item }: any) => {
    const isProcessing = processingRequests.has(item.id);

    return (
      <View style={[styles.listItem, { borderBottomColor: theme.colors.border }]}>
        <Avatar
          name={item.fromUserName || 'User'}
          imageUrl={item.fromUserAvatar}
          size={50}
        />
        <View style={styles.itemInfo}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
            {item.fromUserName}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            @{item.fromUserUsername}
          </Text>
        </View>
        <View style={styles.requestActions}>
          <Pressable
            style={[styles.acceptButton, { backgroundColor: theme.colors.success }]}
            onPress={() => handleAcceptRequest(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </Pressable>
          <Pressable
            style={[styles.ignoreButton, { backgroundColor: theme.colors.error }]}
            onPress={() => handleIgnoreRequest(item.id)}
            disabled={isProcessing}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSentRequestItem = ({ item }: any) => {
    const isProcessing = processingRequests.has(item.id);

    return (
      <View style={[styles.listItem, { borderBottomColor: theme.colors.border }]}>
        <Avatar
          name={item.fromUserName || 'User'}
          imageUrl={item.fromUserAvatar}
          size={50}
        />
        <View style={styles.itemInfo}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
            {item.fromUserName}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            @{item.fromUserUsername}
          </Text>
        </View>
        <Pressable
          style={[styles.cancelButton, { borderColor: theme.colors.error }]}
          onPress={() => handleCancelRequest(item.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={theme.colors.error} />
          ) : (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.error }]}>
              Cancel
            </Text>
          )}
        </Pressable>
      </View>
    );
  };

  const renderEmptyState = () => {
    let icon: any = 'people-outline';
    let title = 'No friends yet';
    let description = 'Start adding friends to see them here';

    if (activeTab === 'requests') {
      icon = 'mail-outline';
      title = 'No friend requests';
      description = 'You have no pending friend requests';
    } else if (activeTab === 'sent') {
      icon = 'send-outline';
      title = 'No sent requests';
      description = 'You have not sent any friend requests';
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={icon}
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
          {title}
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
          {description}
        </Text>
      </View>
    );
  };

  const getTabData = () => {
    if (activeTab === 'friends') return contacts;
    if (activeTab === 'requests') return friendRequests;
    return sentRequests;
  };

  const getTabLoading = () => {
    if (activeTab === 'friends') return contactsLoading;
    if (activeTab === 'requests') return friendRequestsLoading;
    return sentRequestsLoading;
  };

  const renderItem = (props: any) => {
    if (activeTab === 'friends') return renderFriendItem(props);
    if (activeTab === 'requests') return renderRequestItem(props);
    return renderSentRequestItem(props);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
            Friends
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {activeTab === 'friends' && `${contacts.length} friends`}
            {activeTab === 'requests' && `${friendRequests.length} requests`}
            {activeTab === 'sent' && `${sentRequests.length} sent`}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/search')}>
          <Ionicons name="person-add-outline" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text
            style={[
              theme.typography.body,
              { color: activeTab === 'friends' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Friends
          </Text>
          {activeTab === 'friends' && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                theme.typography.body,
                { color: activeTab === 'requests' ? theme.colors.primary : theme.colors.textSecondary },
              ]}
            >
              Requests
            </Text>
            {friendRequests.length > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                <Text style={[theme.typography.caption, { color: '#fff' }]}>
                  {friendRequests.length}
                </Text>
              </View>
            )}
          </View>
          {activeTab === 'requests' && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text
            style={[
              theme.typography.body,
              { color: activeTab === 'sent' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Sent
          </Text>
          {activeTab === 'sent' && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </Pressable>
      </View>

      {/* Content */}
      {getTabLoading() ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : getTabData().length === 0 ? (
        <View style={styles.emptyContainer}>{renderEmptyState()}</View>
      ) : (
        <FlatList
          data={getTabData() as any[]}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id || item.userId}
          extraData={presenceVersion}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 24,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    // Active tab indicator
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContent: {
    padding: 24,
    paddingBottom: 100,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarWithIndicator: {
    position: 'relative',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ignoreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

