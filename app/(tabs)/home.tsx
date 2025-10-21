/**
 * Home Screen - Chat List
 * Modern messaging interface with real-time updates
 */

import { ChatListItem, ChatModal } from '@/features/chat/components';
import { useTheme } from '@/shared/hooks/useTheme';
import { Chat } from '@/shared/types';
import { useAuthStore, useChatStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

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
    userProfiles  // Subscribe to profiles to trigger re-render when they load
  } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Load chats on mount
  useEffect(() => {
    if (user?.id) {
      // Load from SQLite first (instant)
      loadChatsFromSQLite(user.id);
      
      // Subscribe to real-time updates from Firestore
      subscribeToChats(user.id);
    }

    // Cleanup on unmount
    return () => {
      unsubscribeAll();
    };
  }, [user?.id, loadChatsFromSQLite, subscribeToChats, unsubscribeAll]);

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

  // Navigate to friends tab
  const handleNewChat = () => {
    router.push('/(tabs)/friends');
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
    
    return (
      <ChatListItem
        chat={item}
        currentUserId={user!.id}
        otherUserName={otherUserProfile?.displayName}
        otherUserAvatar={otherUserProfile?.profilePictureUrl}
        isOnline={otherUserProfile?.isOnline}
        onPress={handleChatPress}
      />
    );
  };

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
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={
            chats.length === 0 ? styles.flashListEmpty : undefined
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
