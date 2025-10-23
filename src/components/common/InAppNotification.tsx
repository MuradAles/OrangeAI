/**
 * In-App Notification Banner
 * 
 * Shows a notification banner when user receives a message
 * while already in the app (but not in that specific chat).
 * 
 * Features:
 * - Slides in from RIGHT to LEFT
 * - Slides out from LEFT (disappears to left side)
 * - Shows sender name and message preview
 * - Tap to navigate to chat
 * - Auto-dismiss after 5 seconds
 */

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Animated, Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';

export interface InAppNotificationProps {
  senderName: string;
  messageText: string;
  senderAvatar?: string;
  chatId: string;
  isImage?: boolean;
  onDismiss: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const InAppNotification: React.FC<InAppNotificationProps> = ({
  senderName,
  messageText,
  senderAvatar,
  chatId,
  isImage = false,
  onDismiss,
}) => {
  
  const router = useRouter();
  // Start from right side of screen (positive value = off-screen right)
  const slideAnim = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation: RIGHT → LEFT (from screen width to 0)
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0, // Slide to visible position
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      dismissNotification();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismissNotification = () => {
    // Slide out animation: disappear to LEFT (negative value = off-screen left)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH, // Slide out to the left
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    dismissNotification();
    // Small delay to let animation finish
    setTimeout(() => {
      router.push({
        pathname: '/(tabs)/home',
        params: { openChatId: chatId },
      });
    }, 100);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  const displayText = isImage ? '📷 Sent an image' : truncateText(messageText);

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 90 : 50, // Moved down by 40px
      right: 0, // Position on right side for horizontal slide
      left: 0,
      marginHorizontal: 12,
      zIndex: 9999,
    },
    pressable: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      overflow: 'hidden',
      // Shadow for iOS
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      // Elevation for Android
      elevation: 8,
      // Border for definition
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.08)',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    textContent: {
      flex: 1,
      gap: 4,
    },
    senderName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
    },
    messageText: {
      fontSize: 14,
      color: '#666666',
      lineHeight: 18,
    },
    closeButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeIcon: {
      fontSize: 16,
      color: '#666666',
      fontWeight: '600',
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }], // Changed from translateY to translateX
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable
        style={styles.pressable}
        onPress={handlePress}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
      >
        <View style={styles.content}>
          {/* Sender Avatar */}
          <Avatar
            imageUrl={senderAvatar}
            name={senderName}
            size={40}
          />

          {/* Message Content */}
          <View style={styles.textContent}>
            <Text style={styles.senderName} numberOfLines={1}>
              {senderName}
            </Text>
            <Text style={styles.messageText} numberOfLines={2}>
              {displayText}
            </Text>
          </View>

          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={dismissNotification}
            hitSlop={10}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
};


