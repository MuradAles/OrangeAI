/**
 * Create Profile Screen
 * 
 * Username and profile creation after sign-up
 */

import { Avatar, Button, Card, Input } from '@/components/common';
import { StorageService, UserService } from '@/services/firebase';
import { useTheme } from '@/shared/hooks/useTheme';
import { validateDisplayName, validateUsername } from '@/shared/utils';
import { useAuthStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const CreateProfileScreen: React.FC = () => {
  const theme = useTheme();
  const { firebaseUser, setUser, isLoading } = useAuthStore();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en'); // Default to English
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [languageError, setLanguageError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Available languages for selection
  const availableLanguages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'pt', label: 'Português' },
    { code: 'ru', label: 'Русский' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'zh', label: '中文' },
    { code: 'ar', label: 'العربية' },
    { code: 'hi', label: 'हिन्दी' },
  ];

  const selectLanguage = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setLanguageError('');
    setIsLanguageModalVisible(false);
  };

  const getSelectedLanguageLabel = () => {
    const lang = availableLanguages.find(l => l.code === selectedLanguage);
    return lang?.label || 'English';
  };

  const handleChangeProfilePicture = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to upload your profile picture.'
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

      if (!firebaseUser?.uid) {
        Alert.alert('Error', 'User ID not found');
        return;
      }

      setIsUploadingPhoto(true);

      // Upload to Firebase Storage
      const uploadedUrl = await StorageService.uploadProfilePicture(
        firebaseUser.uid,
        imageUri,
        () => {} // No progress tracking for simplicity
      );

      setProfilePictureUrl(uploadedUrl);
      setIsUploadingPhoto(false);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
      setIsUploadingPhoto(false);
    }
  };

  // Debounce username availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) {
        checkUsernameAvailability();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const checkUsernameAvailability = async () => {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setUsernameError(validation.error || '');
      setUsernameAvailable(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError('');

    try {
      const result = await UserService.checkUsernameAvailability(username);
      setUsernameAvailable(result.available);
      if (!result.available) {
        setUsernameError(result.error || 'Username not available');
      }
    } catch (error) {
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleCreateProfile = async () => {
    setUsernameError('');
    setDisplayNameError('');
    setLanguageError('');

    if (!firebaseUser) {
      Alert.alert('Error', 'No user found. Please sign in again.');
      return;
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      setUsernameError(usernameValidation.error || '');
      return;
    }

    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.isValid) {
      setDisplayNameError(displayNameValidation.error || '');
      return;
    }

    if (!usernameAvailable) {
      setUsernameError('Username is not available');
      return;
    }

    // Language validation - should already be set to 'en' by default

    try {
      const profile = await UserService.createProfile(firebaseUser.uid, {
        username: username.toLowerCase(),
        displayName: displayName.trim(),
        email: firebaseUser.email || '',
        bio: '',
        editableLanguages: [selectedLanguage], // Store as array with single language
        profilePictureUrl: profilePictureUrl,
        phoneNumber: null,
        phoneNumberVisible: false,
        isOnline: true,
        lastSeen: null,
        createdAt: Date.now(),
      });

      setUser(profile);
      // Navigation is handled automatically by app/index.tsx
      // User will be redirected to home once profile is complete
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <Text style={[theme.typography.h2, { color: theme.colors.text }]}>Create Your Profile</Text>

        <Pressable style={styles.avatarSection} onPress={handleChangeProfilePicture}>
          {isUploadingPhoto ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <Avatar 
              name={displayName || username || 'User'} 
              size="xlarge"
              imageUrl={profilePictureUrl}
            />
          )}
          <View style={[styles.changePhotoButton, { backgroundColor: theme.colors.primaryLight + '30' }]}>
            <Ionicons name="camera" size={16} color={theme.colors.primary} />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, marginLeft: 8 }]}>
              {profilePictureUrl ? 'Change Photo' : 'Add Photo'}
            </Text>
          </View>
        </Pressable>

        <Card style={styles.formCard}>
          <Input
            label="Username (required)"
            placeholder="unique_username"
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase())}
            autoCapitalize="none"
            error={usernameError}
            helperText={
              isCheckingUsername
                ? 'Checking availability...'
                : usernameAvailable === true
                ? '✓ Available'
                : usernameAvailable === false
                ? '✗ Not available'
                : 'Must be 3-20 characters, lowercase, letters/numbers/_'
            }
            containerStyle={styles.input}
          />

          <Input
            label="Display Name (required)"
            placeholder="Your Name"
            value={displayName}
            onChangeText={setDisplayName}
            error={displayNameError}
            helperText="This is how others will see you"
            containerStyle={styles.input}
          />

          {/* Language Selection */}
          <View style={styles.languageSection}>
            <Text style={[theme.typography.body, { color: theme.colors.text, marginBottom: 8 }]}>
              Select your language (required)
            </Text>
            {languageError && (
              <Text style={[theme.typography.caption, { color: theme.colors.error, marginBottom: 12 }]}>
                {languageError}
              </Text>
            )}
            <Pressable
              style={[
                styles.dropdownButton,
                { backgroundColor: theme.colors.backgroundInput, borderColor: theme.colors.border }
              ]}
              onPress={() => setIsLanguageModalVisible(true)}
            >
              <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]}>
                {getSelectedLanguageLabel()}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Language Selection Modal */}
          <Modal
            visible={isLanguageModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsLanguageModalVisible(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setIsLanguageModalVisible(false)}
            >
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                ]}
              >
                <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
                    Select Language
                  </Text>
                  <Pressable onPress={() => setIsLanguageModalVisible(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </Pressable>
                </View>
                <ScrollView style={styles.modalScrollView}>
                  {availableLanguages.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.modalOption,
                        selectedLanguage === lang.code && {
                          backgroundColor: theme.colors.primaryLight + '20',
                        }
                      ]}
                      onPress={() => selectLanguage(lang.code)}
                    >
                      <Text
                        style={[
                          theme.typography.body,
                          { color: theme.colors.text }
                        ]}
                      >
                        {lang.label}
                      </Text>
                      {selectedLanguage === lang.code && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

          <Button
            title="Create Profile"
            onPress={handleCreateProfile}
            loading={isLoading || isCheckingUsername}
            disabled={isLoading || isCheckingUsername || !usernameAvailable}
            fullWidth
            style={styles.createButton}
          />
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  content: { padding: 24 },
  avatarSection: { alignItems: 'center', marginVertical: 32 },
  uploadingContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  formCard: { marginTop: 16 },
  input: { marginBottom: 16 },
  languageSection: { marginBottom: 16 },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  createButton: { marginTop: 8 },
});


