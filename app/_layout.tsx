/**
 * Root Layout
 * 
 * Initializes Firebase, SQLite, and manages authentication state
 */

import { SQLiteService } from '@/database/SQLiteService';
import { initializeFirebase } from '@/services/firebase/FirebaseConfig';
import { useAuthStore } from '@/store';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const { isAuthenticated, user, isInitialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize app (Firebase + SQLite + Auth)
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing MessageAI...');

        // Initialize Firebase
        initializeFirebase();
        console.log('✅ Firebase initialized');

        // Initialize SQLite (with auto-reset on error in dev mode)
        try {
          await SQLiteService.initialize();
          console.log('✅ SQLite initialized');
        } catch (error) {
          console.error('⚠️  SQLite initialization failed, resetting database...');
          await SQLiteService.reset();
          console.log('✅ SQLite reset and reinitialized');
        }

        // Initialize auth state
        await initialize();
        console.log('✅ Auth initialized');

        setIsAppReady(true);
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setIsAppReady(true); // Still show app even if there's an error
      }
    };

    initializeApp();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isAppReady || !isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated) {
      // User not authenticated, redirect to sign-in
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    } else {
      // User authenticated, navigate to home
      // Profile will be loaded by AuthStore, no need to check here
      if (inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    }
  }, [isAuthenticated, isAppReady, isInitialized, segments]);

  if (!isAppReady || !isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0084FF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Loading MessageAI...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
