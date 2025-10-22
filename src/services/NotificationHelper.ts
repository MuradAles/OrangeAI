/**
 * Notification Helper
 * 
 * Direct in-app notification triggering without push API.
 * This works on emulators and is more efficient for foreground notifications.
 */

import { InAppNotificationData } from '@/shared/hooks/useNotifications';

// Global notification callback
let notificationCallback: ((notification: InAppNotificationData) => void) | null = null;

/**
 * Register a callback to receive in-app notifications
 * Called by useNotifications hook
 */
export const registerNotificationCallback = (
  callback: (notification: InAppNotificationData) => void
) => {
  notificationCallback = callback;
  console.log('✅ Notification callback REGISTERED');
};

/**
 * Trigger an in-app notification directly
 * Use this for showing notifications without going through push API
 */
export const triggerInAppNotification = (notification: InAppNotificationData) => {
  console.log('🔔 triggerInAppNotification called:', {
    senderName: notification.senderName,
    messageText: notification.messageText.substring(0, 50),
    chatId: notification.chatId,
    hasCallback: !!notificationCallback,
  });
  
  if (notificationCallback) {
    notificationCallback(notification);
    console.log('✅ In-app notification SENT to callback');
  } else {
    console.error('❌ No notification callback registered! Notification lost!');
  }
};

/**
 * Clear the callback (cleanup)
 */
export const unregisterNotificationCallback = () => {
  notificationCallback = null;
};

