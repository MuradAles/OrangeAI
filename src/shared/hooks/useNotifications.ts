/**
 * useNotifications Hook
 * 
 * Manages notification state and behavior throughout the app.
 * Determines whether to show push notifications or in-app banners
 * based on user's current location in the app.
 */

import { MessagingService, NotificationData } from '@/services/firebase/MessagingService';
import { registerNotificationCallback, unregisterNotificationCallback } from '@/services/NotificationHelper';
import { useAuthStore } from '@/store/AuthStore';
import { useChatStore } from '@/store/ChatStore';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';

export interface InAppNotificationData {
  id: string;
  senderName: string;
  messageText: string;
  senderAvatar?: string;
  chatId: string;
  isImage: boolean;
}

export const useNotifications = () => {
  const [inAppNotification, setInAppNotification] = useState<InAppNotificationData | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const activeChatId = useChatStore((state) => state.activeChatId);

  /**
   * Register callback for direct in-app notifications
   * This allows triggering notifications without push API (works on emulator)
   */
  useEffect(() => {
    console.log('🎯 useNotifications: Registering callback with activeChatId:', activeChatId);
    
    const handleDirectNotification = (notification: InAppNotificationData) => {
      console.log('📨 handleDirectNotification called:', {
        senderName: notification.senderName,
        chatId: notification.chatId,
        activeChatId: activeChatId,
        willSuppress: notification.chatId === activeChatId,
      });
      
      // Check if user is in this chat
      if (notification.chatId === activeChatId) {
        console.log('🚫 User in this chat, suppressing notification');
        return;
      }

      // Show in-app notification
      console.log('✅ Setting in-app notification state');
      setInAppNotification(notification);
    };

    registerNotificationCallback(handleDirectNotification);

    return () => {
      console.log('🧹 Unregistering notification callback');
      unregisterNotificationCallback();
    };
  }, [activeChatId]);

  /**
   * Initialize notifications - request permissions and get FCM token
   */
  const initialize = async () => {
    try {
      // Configure notification channels (Android)
      await MessagingService.configureNotificationChannels();

      // Request permissions
      const granted = await MessagingService.requestPermissions();
      setHasPermission(granted);

      if (!granted) {
        console.log('Notification permission not granted');
        return;
      }

      // Get FCM token
      const token = await MessagingService.getFCMToken();
      if (token) {
        setFcmToken(token);

        // Save token to Firestore if user is logged in
        if (user?.id) {
          await MessagingService.saveFCMToken(user.id, token);
        }
      }

      // Set up listeners
      MessagingService.setupNotificationListeners(
        handleNotificationReceived,
        handleNotificationTap
      );

      console.log('✅ Notifications initialized');
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  /**
   * Handle notification received while app is in foreground
   */
  const handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('📬 Notification received:', notification);

    const data = notification.request.content.data as NotificationData;
    const chatId = data?.chatId;

    // If user is already in this chat, show in-app notification
    // Otherwise, let the system notification show
    if (chatId && activeChatId === chatId) {
      // User is in this chat - don't show any notification
      console.log('User already in this chat, suppressing notification');
      return;
    }

    // User is NOT in this chat - show in-app banner
    if (data?.type === 'message' || data?.type === 'image') {
      setInAppNotification({
        id: notification.request.identifier,
        senderName: data.senderName || 'Someone',
        messageText: data.messageText || '',
        chatId: chatId || '',
        isImage: data.type === 'image',
      });
    }
  };

  /**
   * Handle notification tap (when user taps on notification)
   */
  const handleNotificationTap = (response: Notifications.NotificationResponse) => {
    console.log('👆 Notification tapped:', response);

    const data = response.notification.request.content.data as NotificationData;

    // Navigate based on notification type
    if (data?.chatId) {
      // Navigate to specific chat
      // This will be handled by the navigation logic in app layout
      console.log('Navigating to chat:', data.chatId);
    }
  };

  /**
   * Dismiss in-app notification
   */
  const dismissInAppNotification = () => {
    setInAppNotification(null);
  };

  /**
   * Update FCM token when user logs in
   */
  const updateFCMToken = async (userId: string) => {
    if (fcmToken) {
      await MessagingService.saveFCMToken(userId, fcmToken);
    } else {
      // Get new token
      const token = await MessagingService.getFCMToken();
      if (token) {
        setFcmToken(token);
        await MessagingService.saveFCMToken(userId, token);
      }
    }
  };

  /**
   * Cleanup on unmount or logout
   */
  const cleanup = () => {
    MessagingService.cleanup();
    setInAppNotification(null);
    setFcmToken(null);
  };

  return {
    inAppNotification,
    hasPermission,
    fcmToken,
    initialize,
    dismissInAppNotification,
    updateFCMToken,
    cleanup,
  };
};

