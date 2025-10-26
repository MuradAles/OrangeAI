/**
 * Sign In Screen
 * 
 * Email/Password authentication screen
 */

import { Button, Card, Input, LoadingSpinner } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { validateEmail, validatePassword } from '@/shared/utils';
import { useAuthStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

export const SignInScreen: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { signIn, isLoading, error: authError, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  /**
   * Handle input change and clear errors
   */
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError('');
    clearError();
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError('');
    clearError();
  };

  /**
   * Handle sign in
   */
  const handleSignIn = async () => {
    // Clear errors
    setEmailError('');
    setPasswordError('');
    clearError();

    // Validate
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || '');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.errors[0] || '');
      return;
    }

    try {
      await signIn(email.trim(), password);
      
      // Navigation handled by auth state listener in root layout
    } catch {
      // Error is already displayed in UI via authError from store
      // No need for additional Alert popup
    }
  };

  return (
    <KeyboardAvoidingView style={{flex: 1, backgroundColor: theme.colors.background}} behavior='padding'>
      <ScrollView 
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../../assets/images/avo-ai.jpg')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[theme.typography.h1, { color: theme.colors.text }]}>
            Welcome to AVO-AI
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
            ]}
          >
            Your AI-powered translation assistant for seamless messaging
          </Text>
        </View>

        {/* Form */}
        <Card style={styles.formCard}>
          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={emailError}
            containerStyle={styles.input}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            error={passwordError}
            containerStyle={styles.input}
          />

          {authError && (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: theme.colors.errorBackground,
                  borderColor: theme.colors.error,
                },
              ]}
            >
              <Text style={[theme.typography.body, { color: theme.colors.error }]}>
                {authError}
              </Text>
            </View>
          )}

          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            style={styles.signInButton}
          />
        </Card>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            Don&apos;t have an account?{' '}
          </Text>
          <Button
            title="Sign Up"
            variant="ghost"
            size="small"
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </View>
      </ScrollView>

      {isLoading && <LoadingSpinner fullScreen />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  accentBar: {
    height: 4,
    marginHorizontal: -24,
    marginTop: 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 8,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  formCard: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  signInButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


