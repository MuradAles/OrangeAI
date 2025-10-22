/**
 * Root Layout
 * 
 * Initializes Firebase, SQLite, and manages authentication state
 */

import { SQLiteService } from '@/database/SQLiteService';
import { initializeFirebase, PresenceService } from '@/services/firebase';
import { useAuthStore } from '@/store';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Text, View } from 'react-native';

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const { isAuthenticated, user, isInitialized, initialize } = useAuthStore();
  const appState = useRef(AppState.currentState);

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

  // Navigation is handled by app/index.tsx
  // This layout just manages global state and presence

  // Handle online/offline presence (optimized - no heartbeat!)
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user?.displayName) return;

    console.log('🎯 PRESENCE SETUP for user:', user.id.substring(0, 8));

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('🔄 AppState changed:', appState.current, '→', nextAppState);
      
      // Only handle app state changes if user is still authenticated
      if (!isAuthenticated || !user?.id || !user?.displayName) {
        console.log('⚠️ Skipping presence update - user not authenticated');
        return;
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - set online
        console.log('📱 App foregrounded - setting user online:', user.id.substring(0, 8));
        try {
          await PresenceService.setOnline(user.id, user.displayName);
          console.log('✅ Online status set successfully');
        } catch (error) {
          console.error('❌ Failed to set online status:', error);
        }
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to background - set offline
        console.log('📱 App backgrounded - setting user offline:', user.id.substring(0, 8));
        
        try {
          await PresenceService.setOffline(user.id, user.displayName);
          console.log('✅ Offline status set successfully');
        } catch (error: any) {
          // Silently handle permission errors (happens during logout)
          if (error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('permission_denied')) {
            console.log('⚠️ Permission denied (user may have logged out)');
          } else {
            console.error('❌ Failed to set offline status:', error);
          }
        }
      }

      appState.current = nextAppState;
    };

    // Set initial online status (with onDisconnect backup)
    console.log('🚀 Setting initial online status for:', user.id.substring(0, 8));
    PresenceService.setOnline(user.id, user.displayName)
      .then(() => console.log('✅ Initial online status set'))
      .catch(error => console.error('❌ Failed to set initial online status:', error));

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup on unmount - ONLY if user is still authenticated
      subscription.remove();
      
      // DON'T try to set offline here - it's handled in AuthStore.signOut()
      // If we try here, the user might already be logged out (permission error)
      console.log('🧹 Presence effect cleanup (no offline call - handled by signOut)');
    };
  }, [isAuthenticated, user?.id, user?.displayName]);

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
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
