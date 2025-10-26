/**
 * Root Layout
 * 
 * Initializes Firebase, SQLite, and manages authentication state
 */

import { InAppNotification } from '@/components/common';
import { SQLiteService } from '@/database/SQLiteService';
import { initializeFirebase, PresenceService } from '@/services/firebase';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { ThemeProvider } from '@/shared/context/ThemeContext';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { useAuthStore } from '@/store';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Text, View } from 'react-native';

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const { isAuthenticated, user, isInitialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  
  // Notifications
  const {
    inAppNotification,
    initialize: initializeNotifications,
    dismissInAppNotification,
    updateFCMToken,
    cleanup: cleanupNotifications,
  } = useNotifications();
  
  // Removed debug logs for cleaner console

  // Initialize app (Firebase + SQLite + Auth)
  useEffect(() => {
    // Suppress Firestore offline errors (harmless SDK warnings)
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      // Suppress known offline-related errors that don't affect functionality
      if (
        message.includes('LoadBundleFromServerRequestError') ||
        message.includes('Could not load bundle') ||
        (message.includes('Failed to load auto-translate setting') && message.includes('LoadBundleFromServerRequestError'))
      ) {
        // Silent - these are expected when offline
        return;
      }
      originalError(...args);
    };

    const initializeApp = async () => {
      try {

        // Initialize Firebase
        initializeFirebase();

        // Initialize SQLite (with auto-reset on error in dev mode)
        try {
          await SQLiteService.initialize();
        } catch {
          await SQLiteService.reset();
        }

        // Initialize auth state
        await initialize();

        // Initialize notifications
        await initializeNotifications();

        // Process any pending offline messages (from previous sessions)
        try {
          const { MessageQueue } = await import('@/database/MessageQueue');
          const result = await MessageQueue.processQueue();
          if (result.total > 0) {
            console.log(`📨 Synced ${result.success}/${result.total} pending messages from previous session`);
          }
        } catch (error) {
          console.error('Failed to process message queue on startup:', error);
        }

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
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated) {
      // User not authenticated, redirect to sign-in
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    } else {
      // User authenticated
      const hasCompletedProfile = user?.username && user?.displayName;
      
      if (!hasCompletedProfile) {
        // No profile yet, redirect to create-profile
        // @ts-expect-error - expo-router segments type doesn't properly support array access
        const isOnCreateProfile = segments[1] === 'create-profile';
        if (!isOnCreateProfile) {
          router.replace('/(auth)/create-profile');
        }
      } else {
        // Profile complete - navigate to home
        // Only redirect from index or auth routes, not from tabs or modals
        // @ts-ignore - segments type is complex from expo-router
        const isOnIndexRoute = segments.length === 0 || segments[0] === '' || segments[0] === 'index';
        
        if (inAuthGroup) {
          // User just completed profile, navigate to home
          router.replace('/(tabs)/home');
        } else if (isOnIndexRoute && !inTabsGroup) {
          // User on index route with complete profile, navigate to home
          router.replace('/(tabs)/home');
        }
        // Don't redirect if already in tabs or on modal routes (search, etc)
      }
    }
  }, [isAuthenticated, isAppReady, isInitialized, segments, user?.username, user?.displayName]);

  // Handle online/offline presence (optimized - no heartbeat!)
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user?.displayName) return;


    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      
      // Only handle app state changes if user is still authenticated
      if (!isAuthenticated || !user?.id || !user?.displayName) {
        return;
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - set online
        try {
          await PresenceService.setOnline(user.id, user.displayName);
        } catch (error) {
          console.error('❌ Failed to set online status:', error);
        }
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to background - set offline
        
        try {
          await PresenceService.setOffline(user.id, user.displayName);
        } catch (error: any) {
          // Silently handle permission errors (happens during logout)
          if (error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('permission_denied')) {
          } else {
            console.error('❌ Failed to set offline status:', error);
          }
        }
      }

      appState.current = nextAppState;
    };

    // Set initial online status (with onDisconnect backup)
    PresenceService.setOnline(user.id, user.displayName)
      .catch(error => console.error('❌ Failed to set initial online status:', error));

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup on unmount - ONLY if user is still authenticated
      subscription.remove();
      
      // DON'T try to set offline here - it's handled in AuthStore.signOut()
      // If we try here, the user might already be logged out (permission error)
    };
  }, [isAuthenticated, user?.id, user?.displayName]);

  // Update FCM token when user logs in
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      updateFCMToken(user.id).catch(error => 
        console.error('❌ Failed to update FCM token:', error)
      );
    } else if (!isAuthenticated) {
      // Cleanup notifications on logout
      cleanupNotifications();
    }
  }, [isAuthenticated, user?.id]);

  if (!isAppReady || !isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0084FF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Loading MessageAI...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="search" 
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      
      {/* In-app notification banner */}
      {inAppNotification && (
        <InAppNotification
          senderName={inAppNotification.senderName}
          messageText={inAppNotification.messageText}
          senderAvatar={inAppNotification.senderAvatar}
          chatId={inAppNotification.chatId}
          isImage={inAppNotification.isImage}
          onDismiss={dismissInAppNotification}
        />
      )}
      
      {/* Offline banner */}
      <OfflineBanner />
    </ThemeProvider>
  );
}
