/**
 * Home Screen - Chat List
 * Modern messaging interface
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { useAuthStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
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
            Messages
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {user.displayName}
          </Text>
        </View>
        <Pressable onPress={() => console.log('Search')}>
          <Ionicons name="search-outline" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Chat List - Empty State */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.emptyContainer}
      >
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
            Start a new conversation
          </Text>

          {/* New Chat Button */}
          <Pressable
            style={[
              styles.newChatButton,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => console.log('Start new chat')}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text
              style={[
                theme.typography.bodyBold,
                { color: '#fff', marginLeft: 8 },
              ]}
            >
              New Chat
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
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 32,
  },
});
