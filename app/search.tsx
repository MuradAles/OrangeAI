/**
 * Contact Search Screen
 * Search for users by username and send friend requests
 */

import { Avatar } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { User } from '@/shared/types';
import { useAuthStore, useContactStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    searchResults,
    searchLoading,
    searchUsers,
    clearSearch,
    sendFriendRequest,
    isContact,
    isBlocked,
    hasPendingRequest,
    hasSentRequest,
  } = useContactStore();

  const [searchText, setSearchText] = useState('');
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.trim().length >= 2) {
        searchUsers(searchText);
      } else {
        clearSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const handleSendRequest = async (toUserId: string) => {
    if (!user) return;

    setSendingRequests(prev => new Set(prev).add(toUserId));

    const result = await sendFriendRequest(user.id, toUserId);

    setSendingRequests(prev => {
      const next = new Set(prev);
      next.delete(toUserId);
      return next;
    });

    if (result.success) {
      // Friend request sent successfully - no confirmation needed
      router.back();
    } else {
      Alert.alert('Error', result.error || 'Failed to send request');
    }
  };

  const getUserStatus = useCallback(
    (searchUser: User) => {
      if (!user || searchUser.id === user.id) return null;

      if (isBlocked(searchUser.id)) {
        return { type: 'blocked', text: 'Blocked', color: theme.colors.error };
      }

      if (isContact(searchUser.id)) {
        return { type: 'friend', text: 'Friends', color: theme.colors.success };
      }

      if (hasPendingRequest(searchUser.id)) {
        return { type: 'pending_incoming', text: 'Sent you a request', color: theme.colors.primary };
      }

      if (hasSentRequest(searchUser.id)) {
        return { type: 'pending_outgoing', text: 'Request sent', color: theme.colors.textSecondary };
      }

      return { type: 'none', text: 'Add Friend', color: theme.colors.primary };
    },
    [user, isBlocked, isContact, hasPendingRequest, hasSentRequest, theme]
  );

  const renderUserItem = ({ item }: { item: User }) => {
    if (!user || item.id === user.id) {
      // Don't show current user in search results
      return null;
    }

    const status = getUserStatus(item);
    const isSending = sendingRequests.has(item.id);

    return (
      <View style={[styles.userItem, { borderBottomColor: theme.colors.border }]}>
        <Avatar name={item.displayName} imageUrl={item.profilePictureUrl} size={50} />
        
        <View style={styles.userInfo}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
            {item.displayName}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            @{item.username}
          </Text>
          {item.bio && (
            <Text
              style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}
              numberOfLines={1}
            >
              {item.bio}
            </Text>
          )}
        </View>

        {status && (
          <Pressable
            style={[
              styles.actionButton,
              status.type === 'friend' && { backgroundColor: theme.colors.successLight },
              status.type === 'blocked' && { backgroundColor: theme.colors.errorLight },
              status.type === 'pending_incoming' && { backgroundColor: theme.colors.primaryLight },
              status.type === 'pending_outgoing' && { backgroundColor: theme.colors.surfaceVariant },
              status.type === 'none' && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              if (status.type === 'none' && !isSending) {
                handleSendRequest(item.id);
              }
            }}
            disabled={status.type !== 'none' || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                {status.type === 'none' && <Ionicons name="person-add" size={16} color="#fff" />}
                {status.type === 'friend' && <Ionicons name="checkmark-circle" size={16} color={status.color} />}
                {status.type === 'pending_outgoing' && <Ionicons name="time" size={16} color={status.color} />}
                {status.type === 'pending_incoming' && <Ionicons name="mail" size={16} color={status.color} />}
                {status.type === 'blocked' && <Ionicons name="ban" size={16} color={status.color} />}
                <Text
                  style={[
                    theme.typography.bodySmall,
                    {
                      color: status.type === 'none' ? '#fff' : status.color,
                      marginLeft: 6,
                    },
                  ]}
                >
                  {status.text}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    if (searchLoading) {
      return null;
    }

    if (searchText.trim().length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={80} color={theme.colors.textSecondary} style={{ opacity: 0.3 }} />
          <Text style={[theme.typography.h3, { color: theme.colors.text, marginTop: 24, textAlign: 'center' }]}>
            Search for friends
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
            ]}
          >
            Enter a username to find friends
          </Text>
        </View>
      );
    }

    if (searchText.trim().length < 2) {
      return (
        <View style={styles.emptyState}>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
            Enter at least 2 characters to search
          </Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={80} color={theme.colors.textSecondary} style={{ opacity: 0.3 }} />
          <Text style={[theme.typography.h3, { color: theme.colors.text, marginTop: 24, textAlign: 'center' }]}>
            No users found
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
            ]}
          >
            Try a different username
          </Text>
        </View>
      );
    }

    return null;
  };

  const filteredResults = searchResults.filter(item => item.id !== user?.id);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[theme.typography.h3, { color: theme.colors.text }]}>Search Users</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, theme.typography.body, { color: theme.colors.text }]}
          placeholder="Search by username..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Results */}
      {searchLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            Searching...
          </Text>
        </View>
      ) : filteredResults.length > 0 ? (
        <FlatList
          data={filteredResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>{renderEmptyState()}</View>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
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
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
});

