/**
 * Forgot Password Screen
 */

import { Button, Card, Input } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { validateEmail } from '@/shared/utils';
import { useAuthStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export const ForgotPasswordScreen: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { resetPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleResetPassword = async () => {
    setEmailError('');
    const validation = validateEmail(email);
    if (!validation.isValid) {
      setEmailError(validation.error || '');
      return;
    }

    try {
      await resetPassword(email.trim());
      Alert.alert('Email Sent', 'Check your email for password reset instructions.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[theme.typography.h2, { color: theme.colors.text }]}>Reset Password</Text>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
          Enter your email to receive reset instructions
        </Text>

        <Card style={styles.formCard}>
          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
          />
          <Button title="Send Reset Link" onPress={handleResetPassword} loading={isLoading} fullWidth style={styles.button} />
        </Card>

        <Button title="Back to Sign In" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  content: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  formCard: { marginVertical: 24 },
  button: { marginTop: 8 },
});


