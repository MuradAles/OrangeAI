/**
 * Friends Screen
 * Manage friends and friend requests
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { useAuthStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function FriendsScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
            Friends
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            Manage your connections
          </Text>
        </View>
        <Pressable onPress={() => console.log('Add friend')}>
          <Ionicons name="person-add-outline" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Empty State */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.emptyContainer}
      >
        <View style={styles.emptyState}>
          <Ionicons
            name="people-outline"
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
            No friends yet
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
            Start adding friends to see them here
          </Text>

          {/* Add Friend Button */}
          <Pressable
            style={[
              styles.addFriendButton,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => console.log('Add friend')}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
            <Text
              style={[
                theme.typography.bodyBold,
                { color: '#fff', marginLeft: 8 },
              ]}
            >
              Add Friend
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 32,
  },
});

