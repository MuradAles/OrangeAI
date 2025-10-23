/**
 * Profile Screen
 * User profile with settings and sign out
 */

import { Avatar, Button, Card } from '@/components/common';
import { SQLiteService } from '@/database/SQLiteService';
import { EditBioModal } from '@/features/auth/components';
import { StorageService, UserService } from '@/services/firebase';
import { useTheme, useThemeMode } from '@/shared/hooks/useTheme';
import { useAuthStore, useChatStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const { user, signOut, updateUserProfile } = useAuthStore();
  const { refreshUserProfile } = useChatStore();
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isBioModalVisible, setIsBioModalVisible] = useState(false);

  const handleChangeProfilePicture = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to change your profile picture.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const imageUri = result.assets[0].uri;

      // Show confirmation
      Alert.alert(
        'Change Profile Picture',
        'Upload this image as your profile picture?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upload',
            onPress: async () => {
              try {
                setIsUploadingPhoto(true);
                setUploadProgress(0);

                if (!user?.id) {
                  throw new Error('User ID not found');
                }

                // Upload to Firebase Storage
                const profilePictureUrl = await StorageService.uploadProfilePicture(
                  user.id,
                  imageUri,
                  (progress) => {
                    setUploadProgress(progress.progress);
                  }
                );

                // Update Firestore
                await UserService.updateProfile(user.id, { profilePictureUrl });

                // Update AuthStore
                await updateUserProfile({ profilePictureUrl });
                
                // Refresh profile cache in ChatStore so it shows in chats
                await refreshUserProfile(user.id);

                Alert.alert('Success', 'Profile picture updated successfully!');
              } catch (error) {
                console.error('Error uploading profile picture:', error);
                Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
              } finally {
                setIsUploadingPhoto(false);
                setUploadProgress(0);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleSaveBio = async (newBio: string) => {
    try {
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      // Update Firestore
      await UserService.updateProfile(user.id, { bio: newBio });

      // Update AuthStore
      await updateUserProfile({ bio: newBio });

      Alert.alert('Success', 'Bio updated successfully!');
    } catch (error) {
      console.error('Error updating bio:', error);
      Alert.alert('Error', 'Failed to update bio. Please try again.');
    }
  };

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
    <>
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
        
        {/* Change Photo Button */}
        <Pressable
          style={[styles.changePhotoButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleChangeProfilePicture}
          disabled={isUploadingPhoto}
        >
          {isUploadingPhoto ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, marginLeft: 8 }]}>
                Uploading... {uploadProgress.toFixed(0)}%
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="camera" size={16} color={theme.colors.primary} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, marginLeft: 6 }]}>
                Change Photo
              </Text>
            </>
          )}
        </Pressable>
        
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
        
        {/* Bio Section */}
        <View style={styles.bioSection}>
          {user.bio ? (
            <Text
              style={[
                theme.typography.body,
                {
                  color: theme.colors.text,
                  textAlign: 'center',
                  paddingHorizontal: 20,
                },
              ]}
            >
              {user.bio}
            </Text>
          ) : (
            <Text
              style={[
                theme.typography.body,
                {
                  color: theme.colors.textSecondary,
                  textAlign: 'center',
                  fontStyle: 'italic',
                },
              ]}
            >
              No bio yet
            </Text>
          )}
          
          {/* Edit Bio Button */}
          <Pressable
            style={[styles.editBioButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => setIsBioModalVisible(true)}
          >
            <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, marginLeft: 4 }]}>
              Edit Bio
            </Text>
          </Pressable>
        </View>
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

      {/* Theme Settings */}
      <Card style={styles.card}>
        <Text
          style={[
            theme.typography.h4,
            { color: theme.colors.text, marginBottom: 16 },
          ]}
        >
          Appearance
        </Text>

        <View style={styles.themeRow}>
          <View style={styles.themeInfo}>
            <View style={styles.themeIconContainer}>
              <Ionicons 
                name={themeMode === 'dark' ? 'moon' : themeMode === 'light' ? 'sunny' : 'phone-portrait-outline'} 
                size={20} 
                color={theme.colors.primary} 
              />
            </View>
            <View>
              <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
                Theme
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                {themeMode === 'system' ? 'Follow System' : themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
          </View>

          <View style={styles.themeButtons}>
            <Pressable
              style={[
                styles.themeButton,
                themeMode === 'light' && { backgroundColor: theme.colors.primary },
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setThemeMode('light')}
            >
              <Ionicons 
                name="sunny" 
                size={18} 
                color={themeMode === 'light' ? '#fff' : theme.colors.textSecondary} 
              />
            </Pressable>

            <Pressable
              style={[
                styles.themeButton,
                themeMode === 'system' && { backgroundColor: theme.colors.primary },
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setThemeMode('system')}
            >
              <Ionicons 
                name="phone-portrait-outline" 
                size={18} 
                color={themeMode === 'system' ? '#fff' : theme.colors.textSecondary} 
              />
            </Pressable>

            <Pressable
              style={[
                styles.themeButton,
                themeMode === 'dark' && { backgroundColor: theme.colors.primary },
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setThemeMode('dark')}
            >
              <Ionicons 
                name="moon" 
                size={18} 
                color={themeMode === 'dark' ? '#fff' : theme.colors.textSecondary} 
              />
            </Pressable>
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
    
    {/* Edit Bio Modal */}
    <EditBioModal
      visible={isBioModalVisible}
      currentBio={user.bio || ''}
      onSave={handleSaveBio}
      onClose={() => setIsBioModalVisible(false)}
    />
    </>
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
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  bioSection: {
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  editBioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
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
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    marginTop: 32,
  },
});

