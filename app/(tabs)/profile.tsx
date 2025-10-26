/**
 * Profile Screen
 * User profile with settings and sign out
 */

import { EditBioModal } from '@/features/auth/components';
import { StorageService, UserService } from '@/services/firebase';
import { useTheme, useThemeMode } from '@/shared/hooks/useTheme';
import { useAuthStore, useChatStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const { user, signOut, updateUserProfile } = useAuthStore();
  const { refreshUserProfile } = useChatStore();
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isBioModalVisible, setIsBioModalVisible] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);

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

  const getSelectedLanguage = () => {
    // Get from editableLanguages first, fallback to preferredLanguage, then 'en'
    const langCode = user?.editableLanguages?.[0] || user?.preferredLanguage || 'en';
    return langCode;
  };

  const getSelectedLanguageLabel = () => {
    const langCode = getSelectedLanguage();
    const lang = availableLanguages.find(l => l.code === langCode);
    return lang?.label || 'English';
  };

  const selectLanguage = async (languageCode: string) => {
    try {
      if (!user?.id) return;
      // Update both editableLanguages and preferredLanguage
      await UserService.updateProfile(user.id, { 
        editableLanguages: [languageCode],
        preferredLanguage: languageCode 
      });
      await updateUserProfile({ 
        editableLanguages: [languageCode],
        preferredLanguage: languageCode 
      });
      setIsLanguageModalVisible(false);
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert('Error', 'Failed to update language preference');
    }
  };

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

  const handleSignOut = () => {
    setIsSignOutModalVisible(true);
  };

  const confirmSignOut = async () => {
    try {
      await signOut();
      // Navigation handled automatically by _layout.tsx
    } catch (error) {
      console.error('Sign out failed:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
    setIsSignOutModalVisible(false);
  };


  if (!user) {
    return null;
  }

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.backgroundGap }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Banner */}
      <View style={styles.profileBanner}>
        {/* Profile Picture Background */}
        <Pressable
          style={styles.bannerImage}
          onPress={handleChangeProfilePicture}
          disabled={isUploadingPhoto}
        >
          {isUploadingPhoto ? (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.uploadingText}>
                Uploading... {uploadProgress.toFixed(0)}%
              </Text>
            </View>
          ) : (
            <>
              {user.profilePictureUrl && (
                <Image 
                  source={{ uri: user.profilePictureUrl }}
                  style={styles.bannerImageContent}
                />
              )}
            </>
          )}
          
          {/* Dark overlay gradient */}
          <View style={styles.bannerOverlay} />
          
          {/* Name and username overlay */}
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerName}>
              {user.displayName}
            </Text>
            <Text style={styles.bannerStatus}>
              {user.isOnline ? 'online' : 'offline'}
            </Text>
          </View>
          
          {/* Edit Photo Button - Bottom Right */}
          <Pressable
            style={[styles.editPhotoButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleChangeProfilePicture}
            disabled={isUploadingPhoto}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Ionicons name="add" size={12} color="#fff" style={styles.addIcon} />
          </Pressable>
        </Pressable>
      </View>

      {/* Account Section */}
      <View style={[styles.section, styles.firstSection, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Account</Text>
        
        {/* Username */}
        <View style={styles.row}>
          <View>
            <Text style={[styles.valueText, { color: theme.colors.text }]}>@{user.username}</Text>
            <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>Username</Text>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.row}>
          <View style={styles.flexRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.valueText, { color: user.bio ? theme.colors.text : theme.colors.textSecondary }]}>
                {user.bio || 'Add a few words about yourself'}
              </Text>
              <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>Bio</Text>
            </View>
            <Pressable onPress={() => setIsBioModalVisible(true)}>
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Translation Language Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Translation Language</Text>
        
        {/* Language Dropdown */}
        <Pressable
          style={styles.languageDropdown}
          onPress={() => setIsLanguageModalVisible(true)}
        >
          <Text style={[styles.mainText, { color: theme.colors.text, flex: 1 }]}>
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
                    getSelectedLanguage() === lang.code && {
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
                  {getSelectedLanguage() === lang.code && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Theme Settings Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Appearance</Text>
        
        <View style={styles.themeGrid}>
          {/* Light Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'light' && { borderColor: '#0084FF', borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('light')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: '#0084FF' }]} />
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>Light</Text>
          </Pressable>

          {/* Dark Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'dark' && { borderColor: '#4990CF', borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('dark')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: '#4990CF' }]} />
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>Dark</Text>
          </Pressable>

          {/* Ocean Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'ocean' && { borderColor: '#00B8D4', borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('ocean')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: '#00B8D4' }]} />
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>Ocean</Text>
          </Pressable>

          {/* Sunset Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'sunset' && { borderColor: '#FF6B35', borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('sunset')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: '#FF6B35' }]} />
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>Sunset</Text>
          </Pressable>

          {/* Forest Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'forest' && { borderColor: '#2E7D32', borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('forest')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: '#2E7D32' }]} />
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>Forest</Text>
          </Pressable>

          {/* Midnight Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'midnight' && { borderColor: '#7B1FA2', borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('midnight')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: '#7B1FA2' }]} />
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>Midnight</Text>
          </Pressable>

          {/* Rose Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'rose' && { borderColor: '#E91E63', borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('rose')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: '#E91E63' }]} />
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>Rose</Text>
          </Pressable>

          {/* Arctic Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'arctic' && { borderColor: '#29B6F6', borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('arctic')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: '#29B6F6' }]} />
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>Arctic</Text>
          </Pressable>

          {/* System Theme */}
          <Pressable
            style={[
              styles.themeCard,
              { borderColor: theme.colors.border },
              themeMode === 'system' && { borderColor: theme.colors.primary, borderWidth: 2 },
            ]}
            onPress={() => setThemeMode('system')}
          >
            <View style={[styles.themeColorPreview, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.themeCardTitle, { color: theme.colors.text }]}>System</Text>
          </Pressable>
        </View>
      </View>

      {/* About Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>About</Text>
        
        <Pressable style={styles.row} onPress={() => setIsPrivacyModalVisible(true)}>
          <View style={styles.flexRow}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.valueText, { color: theme.colors.text }]}>Privacy Policy</Text>
              <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>Read our privacy policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
        </Pressable>

        <Pressable style={[styles.row, { paddingTop: 0 }]} onPress={() => setIsTermsModalVisible(true)}>
          <View style={styles.flexRow}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.textSecondary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.valueText, { color: theme.colors.text }]}>Terms of Service</Text>
              <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>Read our terms</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
        </Pressable>

        <View style={[styles.row, { paddingTop: 0 }]}>
          <View style={styles.flexRow}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.valueText, { color: theme.colors.text }]}>App Version</Text>
              <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>1.0.0</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sign Out Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Pressable 
          style={styles.row}
          onPress={handleSignOut}
        >
          <View style={styles.flexRow}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.mainText, { color: theme.colors.error, marginLeft: 12 }]}>Sign Out</Text>
          </View>
        </Pressable>
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

    {/* Sign Out Confirmation Modal */}
    <Modal
      visible={isSignOutModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsSignOutModalVisible(false)}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setIsSignOutModalVisible(false)}
      >
        <View
          style={[
            styles.signOutModalContent,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <Ionicons name="log-out-outline" size={48} color={theme.colors.error} style={styles.signOutModalIcon} />
          
          <Text style={[styles.signOutModalTitle, { color: theme.colors.text }]}>
            Sign Out?
          </Text>
          
          <Text style={[styles.signOutModalSubtitle, { color: theme.colors.textSecondary }]}>
            Are you sure you want to sign out of your account?
          </Text>

          <View style={styles.signOutModalButtons}>
            <Pressable
              style={[styles.signOutModalButton, styles.signOutModalButtonCancel, { borderColor: theme.colors.border }]}
              onPress={() => setIsSignOutModalVisible(false)}
            >
              <Text style={[styles.signOutModalButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.signOutModalButton, styles.signOutModalButtonConfirm, { backgroundColor: theme.colors.error }]}
              onPress={confirmSignOut}
            >
              <Text style={[styles.signOutModalButtonText, { color: '#fff' }]}>
                Sign Out
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>

    {/* Privacy Policy Modal */}
    <Modal
      visible={isPrivacyModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsPrivacyModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIsPrivacyModalVisible(false)}
        />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
              Privacy Policy
            </Text>
            <Pressable onPress={() => setIsPrivacyModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          
          <ScrollView 
            style={styles.modalScrollView} 
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Text style={[theme.typography.body, { color: theme.colors.text, lineHeight: 24 }]}>
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>1. Information We Collect{'\n\n'}</Text>
              We collect information you provide directly to us, such as when you create an account, send messages, or use our AI features. Do not worry, we are not collecting your snack preferences (yet!).{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>2. How We Use Your Information{'\n\n'}</Text>
              We use your information to provide, maintain, and improve our services, process translations, and personalize your experience. Basically, we are trying to make your chat experience so smooth you will think we are reading your mind.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>3. Data Security{'\n\n'}</Text>
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. We have got digital guard dogs. Well, firewalls, but you get the idea.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>4. Your Rights{'\n\n'}</Text>
              You have the right to access, update, or delete your personal information at any time through your account settings. You are the boss of your data, we are just the friendly neighborhood helpers.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>5. AI Translation Magic{'\n\n'}</Text>
              Our AI might occasionally translate hello as good morning in certain contexts. It is learning, be patient. We are working on teaching it sarcasm.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>6. Changes to This Policy{'\n\n'}</Text>
              We may update this policy from time to time. When we do, we will notify you in the app. If you do not like the new policy, you can always express your feelings through emoji reactions.{'\n\n'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Terms of Service Modal */}
    <Modal
      visible={isTermsModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsTermsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIsTermsModalVisible(false)}
        />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
              Terms of Service
            </Text>
            <Pressable onPress={() => setIsTermsModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          
          <ScrollView 
            style={styles.modalScrollView} 
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Text style={[theme.typography.body, { color: theme.colors.text, lineHeight: 24 }]}>
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>1. Acceptable Use{'\n\n'}</Text>
              You agree to use our service only for lawful purposes and in a way that does not infringe the rights of others.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>2. AI Translation Feature{'\n\n'}</Text>
              Our AI translation feature is provided as-is and may not always be 100% accurate. Use translations as a helpful tool, not for critical communications.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>3. Account Responsibility{'\n\n'}</Text>
              You are responsible for maintaining the confidentiality of your account and password, and for all activities that occur under your account.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>4. Service Modifications{'\n\n'}</Text>
              We reserve the right to modify, suspend, or discontinue the service at any time without prior notice. We will try to give you a heads up when possible.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>5. Prohibited Activities{'\n\n'}</Text>
              Do not use our app to cheat on tests, send spam, or prank people using translation.{'\n\n'}
              
              <Text style={[theme.typography.h4, { color: theme.colors.text }]}>6. Termination{'\n\n'}</Text>
              We can terminate your account if you violate these terms. But before we do, we will probably send you a message first. We believe in second chances and good conversations.{'\n\n'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  profileBanner: {
    height: 350,
    marginHorizontal: -24,
    position: 'relative',
    marginTop: 0,
    overflow: 'visible',
    zIndex: 10,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerImageContent: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bannerInfo: {
    position: 'absolute',
    bottom: 20,
    left: 24,
  },
  bannerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerStatus: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: -25,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#4990CF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 999,
    zIndex: 9999,
  },
  addIcon: {
    position: 'absolute',
    bottom: 8,
    right: 10,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 132, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginTop: 20,
  },
  section: {
    marginHorizontal: -24,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  firstSection: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginBottom: -8,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainText: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  valueText: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 2,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E010',
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
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  themeCard: {
    width: '30%',
    minWidth: 90,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themeColorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  languageRow: {
    marginBottom: 16,
  },
  languageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
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
    maxHeight: 500,
    flexGrow: 0,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actions: {
    marginTop: 32,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 32,
    alignItems: 'center',
  },
  signOutModalIcon: {
    marginBottom: 16,
  },
  signOutModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  signOutModalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  signOutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  signOutModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutModalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  signOutModalButtonConfirm: {
    // backgroundColor handled inline
  },
  signOutModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});


