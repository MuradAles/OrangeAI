import { spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * OfflineBanner
 * 
 * Shows banner when device is offline
 * Features:
 * - Slides down from top when offline
 * - Slides up when back online
 * - Warning icon and message
 * - Non-intrusive positioning
 */

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const [slideAnim] = React.useState(new Animated.Value(-100));

  useEffect(() => {
    if (!isOnline) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none" // Allow touches to pass through
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={20} color="#ffffff" />
        <Text style={styles.text}>⚠️ No internet connection</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#FF6B6B',
    paddingTop: 50, // Account for status bar
    paddingBottom: 10,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

