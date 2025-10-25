/**
 * OfflineBanner - Shows when device is offline
 * 
 * Displays a banner at the top of the screen when there's no internet connection
 */

import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useTheme } from '@/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const OfflineBanner = () => {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();

  // Don't render anything if online
  if (isOnline) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.warning }]}>
      <Ionicons name="cloud-offline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
