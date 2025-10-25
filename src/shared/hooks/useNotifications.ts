/**
 * useNotifications Hook
 * 
 * Manages notification state and behavior throughout the app.
 * Determines whether to show push notifications or in-app banners
 * based on user's current location in the app.
 */

import { MessagingService, NotificationData } from '@/services/firebase/MessagingService';
import { InAppNotificationData, registerNotificationCallback, unregisterNotificationCallback } from '@/services/NotificationHelper';
import { useAuthStore } from '@/store/AuthStore';
import { useChatStore } from '@/store/ChatStore';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';

// Re-export for convenience
export type { InAppNotificationData };

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
    const handleDirectNotification = (notification: InAppNotificationData) => {
      // Check if user is in this chat
      if (notification.chatId === activeChatId) {
        return; // Suppress notification if user is viewing this chat
      }

      // Show in-app notification
      setInAppNotification(notification);
    };

    registerNotificationCallback(handleDirectNotification);

    return () => {
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

    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  /**
   * Handle notification received while app is in foreground
   */
  const handleNotificationReceived = (notification: Notifications.Notification) => {

    const data = notification.request.content.data as NotificationData;
    const chatId = data?.chatId;

    // If user is already in this chat, show in-app notification
    // Otherwise, let the system notification show
    if (chatId && activeChatId === chatId) {
      // User is in this chat - don't show any notification
      return;
    }

    // User is NOT in this chat - show in-app banner
    if (data?.type === 'message' || data?.type === 'group_message') {
      const title = notification.request.content.title || 'Someone';
      const body = notification.request.content.body || '';
      
      setInAppNotification({
        id: notification.request.identifier,
        senderName: title,
        messageText: body,
        chatId: chatId || '',
        isImage: false, // Push notifications will show text, images are displayed inline
      });
    }
  };

  /**
   * Handle notification tap (when user taps on notification)
   */
  const handleNotificationTap = (response: Notifications.NotificationResponse) => {

    const data = response.notification.request.content.data as NotificationData;

    // Navigate based on notification type
    if (data?.chatId) {
      // Navigate to specific chat
      // This will be handled by the navigation logic in app layout
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

