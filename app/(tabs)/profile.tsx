/**
 * Profile Screen
 * User profile with settings and sign out
 */

import { Avatar, Button, Card } from '@/components/common';
import { SQLiteService } from '@/database/SQLiteService';
import { useTheme } from '@/shared/hooks/useTheme';
import { useAuthStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation handled automatically by _layout.tsx
            } catch (error) {
              console.error('Sign out failed:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleClearLocalData = async () => {
    Alert.alert(
      'Clear Local Data',
      'This will delete all local data (chats, messages, contacts) from your device. Your account data on the server will NOT be affected. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await SQLiteService.reset();
              Alert.alert(
                'Success',
                'Local data has been cleared. The app will refresh.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Sign out to refresh everything - navigation handled by _layout.tsx
                      signOut();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Clear data failed:', error);
              Alert.alert('Error', 'Failed to clear local data. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
          Profile
        </Text>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <Avatar
          name={user.displayName}
          imageUrl={user.profilePictureUrl}
          size="xlarge"
          showOnline
          isOnline={user.isOnline}
        />
        <Text
          style={[
            theme.typography.h3,
            { color: theme.colors.text, marginTop: 16 },
          ]}
        >
          {user.displayName}
        </Text>
        <Text
          style={[
            theme.typography.body,
            { color: theme.colors.textSecondary, marginTop: 4 },
          ]}
        >
          @{user.username}
        </Text>
        {user.bio && (
          <Text
            style={[
              theme.typography.body,
              {
                color: theme.colors.text,
                marginTop: 12,
                textAlign: 'center',
                paddingHorizontal: 20,
              },
            ]}
          >
            {user.bio}
          </Text>
        )}
      </View>

      {/* Profile Details Card */}
      <Card style={styles.card}>
        <Text
          style={[
            theme.typography.h4,
            { color: theme.colors.text, marginBottom: 16 },
          ]}
        >
          Account Information
        </Text>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
          <View style={styles.infoContent}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Email
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              {user.email}
            </Text>
          </View>
        </View>

        {user.phoneNumber && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                Phone
              </Text>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>
                {user.phoneNumber}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons
            name={user.isOnline ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={user.isOnline ? theme.colors.online : theme.colors.offline}
          />
          <View style={styles.infoContent}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Status
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              {user.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Clear Local Data"
          variant="outline"
          onPress={handleClearLocalData}
          icon={<Ionicons name="trash-outline" size={20} color={theme.colors.warning} />}
          style={{ marginBottom: 12, borderColor: theme.colors.warning }}
          textStyle={{ color: theme.colors.warning }}
        />
        
        <Button
          title="Sign Out"
          variant="outline"
          onPress={handleSignOut}
          icon={<Ionicons name="log-out-outline" size={20} color={theme.colors.error} />}
          style={{ marginBottom: 16, borderColor: theme.colors.error }}
          textStyle={{ color: theme.colors.error }}
        />
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  card: {
    marginTop: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  actions: {
    marginTop: 32,
  },
});

