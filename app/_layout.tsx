/**
 * Root Layout
 * 
 * Initializes Firebase, SQLite, and manages authentication state
 */

import { InAppNotification } from '@/components/common';
import { SQLiteService } from '@/database/SQLiteService';
import { initializeFirebase, PresenceService } from '@/services/firebase';
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
  
  // Debug: Log when inAppNotification changes
  useEffect(() => {
    console.log('🔔 _layout: inAppNotification state changed:', inAppNotification ? {
      senderName: inAppNotification.senderName,
      chatId: inAppNotification.chatId,
    } : null);
  }, [inAppNotification]);

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

        // Initialize notifications
        await initializeNotifications();
        console.log('✅ Notifications initialized');

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

    console.log('🔄 LAYOUT - Navigation check:', {
      isAuthenticated,
      hasUser: !!user,
      username: user?.username,
      displayName: user?.displayName,
      segments: segments.join('/'),
      inAuthGroup,
      inTabsGroup,
    });

    if (!isAuthenticated) {
      // User not authenticated, redirect to sign-in
      if (!inAuthGroup) {
        console.log('🔄 LAYOUT - Not authenticated, navigating to sign-in');
        router.replace('/(auth)/sign-in');
      }
    } else {
      // User authenticated
      const hasCompletedProfile = user?.username && user?.displayName;
      
      if (!hasCompletedProfile) {
        // No profile yet, redirect to create-profile
        const isOnCreateProfile = segments[1] === 'create-profile';
        if (!isOnCreateProfile) {
          console.log('🔄 LAYOUT - No profile, navigating to create-profile');
          router.replace('/(auth)/create-profile');
        }
      } else {
        // Profile complete - navigate to home
        // Only redirect from index or auth routes, not from tabs or modals
        const isOnIndexRoute = segments.length === 0 || segments[0] === '' || segments[0] === 'index';
        
        if (inAuthGroup) {
          // User just completed profile, navigate to home
          console.log('🔄 LAYOUT - Profile complete, navigating from auth to home');
          router.replace('/(tabs)/home');
        } else if (isOnIndexRoute && !inTabsGroup) {
          // User on index route with complete profile, navigate to home
          console.log('🔄 LAYOUT - Profile complete, navigating from index to home');
          router.replace('/(tabs)/home');
        }
        // Don't redirect if already in tabs or on modal routes (search, etc)
      }
    }
  }, [isAuthenticated, isAppReady, isInitialized, segments, user?.username, user?.displayName]);

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

  // Update FCM token when user logs in
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('🔔 Updating FCM token for user:', user.id.substring(0, 8));
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
    <>
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
    </>
  );
}
