/**
 * Sign Up Screen
 * 
 * Email/Password registration screen
 */

import { Button, Card, Input } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { validateEmail, validatePassword } from '@/shared/utils';
import { useAuthStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export const SignUpScreen: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const handleSignUp = async () => {
    setEmailError('');
    setPasswordError('');
    setConfirmError('');

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

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      return;
    }

    try {
      await signUp(email.trim(), password);
      Alert.alert(
        'Account Created',
        'Your account has been created successfully! Please create your profile.',
        [{ text: 'Continue', onPress: () => router.push('/(auth)/create-profile') }]
      );
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
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
        <View style={styles.header}>
          <Text style={[theme.typography.h1, { color: theme.colors.text }]}>
            Create Account
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
            Join MessageAI to start messaging
          </Text>
        </View>

        <Card style={styles.formCard}>
          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            containerStyle={styles.input}
          />

          <Input
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={passwordError}
            containerStyle={styles.input}
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={confirmError}
            containerStyle={styles.input}
          />

          <Button
            title="Sign Up"
            onPress={handleSignUp}
            loading={isLoading}
            fullWidth
            style={styles.signUpButton}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Button
            title="Sign In"
            variant="ghost"
            size="small"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 32 },
  formCard: { marginBottom: 24 },
  input: { marginBottom: 16 },
  signUpButton: { marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});


