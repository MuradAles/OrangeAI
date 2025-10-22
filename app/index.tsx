/**
 * Root Index Screen
 * Entry point that redirects based on auth state
 */

import { useAuthStore } from '@/store';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isAuthenticated, user, isInitialized } = useAuthStore();

  // Wait for auth to initialize
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0084FF" />
      </View>
    );
  }

  // Redirect based on auth state
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Check if user has completed profile
  const hasCompletedProfile = user?.username && user?.displayName;
  
  if (!hasCompletedProfile) {
    return <Redirect href="/(auth)/create-profile" />;
  }

  // User is authenticated and has profile, go to home
  return <Redirect href="/(tabs)/home" />;
}

