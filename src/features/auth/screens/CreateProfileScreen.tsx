/**
 * Create Profile Screen
 * 
 * Username and profile creation after sign-up
 */

import { Avatar, Button, Card, Input } from '@/components/common';
import { UserService } from '@/services/firebase/UserService';
import { useTheme } from '@/shared/hooks/useTheme';
import { validateDisplayName, validateUsername } from '@/shared/utils';
import { useAuthStore } from '@/store';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export const CreateProfileScreen: React.FC = () => {
  const theme = useTheme();
  const { firebaseUser, setUser, isLoading } = useAuthStore();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

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
      console.error('Failed to check username:', error);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleCreateProfile = async () => {
    setUsernameError('');
    setDisplayNameError('');

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

    try {
      const profile = await UserService.createProfile(firebaseUser.uid, {
        username: username.toLowerCase(),
        displayName: displayName.trim(),
        email: firebaseUser.email || '',
        bio: bio.trim(),
        profilePictureUrl: null,
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[theme.typography.h2, { color: theme.colors.text }]}>Create Your Profile</Text>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
          Choose your username and display name
        </Text>

        <View style={styles.avatarSection}>
          <Avatar name={displayName || username || 'User'} size="xlarge" />
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
            Profile picture can be added later
          </Text>
        </View>

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

          <Input
            label="Bio (optional)"
            placeholder="Tell us about yourself"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            maxLength={150}
            showCharacterCount
            containerStyle={styles.input}
          />

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
  content: { padding: 24 },
  avatarSection: { alignItems: 'center', marginVertical: 32 },
  formCard: { marginTop: 16 },
  input: { marginBottom: 16 },
  createButton: { marginTop: 8 },
});


