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
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
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
      console.log('✅ Sign in successful');
    } catch {
      // Error is already displayed in UI via authError from store
      // No need for additional Alert popup
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[theme.typography.h1, { color: theme.colors.text }]}>
            Welcome Back
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
            ]}
          >
            Sign in to continue messaging
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

          <Button
            title="Forgot Password?"
            variant="ghost"
            size="small"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotButton}
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
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  formCard: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
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


