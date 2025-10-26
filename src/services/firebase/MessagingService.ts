import { Logger } from '@/shared/utils/Logger';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { Platform } from 'react-native';
import { firestore } from './FirebaseConfig';

/**
 * MessagingService
 * 
 * Handles push notifications via Expo's notification system
 * Features:
 * - FCM token registration and storage
 * - Notification permissions
 * - Foreground/background notification handling
 * - Deep linking from notifications
 */

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface NotificationData {
  type: 'message' | 'friend_request' | 'friend_accepted' | 'group_invite' | 'group_message';
  chatId?: string;
  userId?: string;
  requestId?: string;
  groupId?: string;
  [key: string]: unknown; // Allow additional properties for Expo notifications
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data: NotificationData;
}

class MessagingServiceClass {
  private notificationReceivedSubscription: Notifications.Subscription | null = null;
  private notificationResponseSubscription: Notifications.Subscription | null = null;

  /**
   * Configure notification channels (Android)
   * Must be called before requesting permissions
   */
  async configureNotificationChannels(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0084FF',
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('Error configuring notification channel:', error);
    }
  }

  /**
   * Request notification permissions from user
   * Should be called on first app launch or when user wants to enable notifications
   * 
   * Renamed from requestPermission to requestPermissions for consistency
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // If not already granted, ask user
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get Expo Push Token (FCM token) for this device
   * Token is used to send notifications to specific devices
   * 
   * Note: For development builds, FCM credentials must be configured in EAS:
   * 1. Run: eas credentials
   * 2. Select Android > FCM Server Key
   * 3. Upload your google-services.json
   */
  async getFCMToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'abdece3f-a5c7-4a4b-92bb-471bc2ba5d9b', // From app.json
      });

      return tokenData.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save FCM token to Firestore
   * Tokens are stored in user document for sending targeted notifications
   */
  async saveFCMToken(userId: string, token: string | null): Promise<void> {
    if (!token) {
      return;
    }

    try {
      const userRef = doc(firestore, 'users', userId);
      
      // Get user info for better logging
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : null;
      
      await setDoc(userRef, {
        fcmToken: token,
        lastTokenUpdate: new Date().toISOString(),
        platform: Platform.OS,
        deviceName: Device.deviceName || 'Unknown',
      }, { merge: true });

      Logger.fcmTokenRegistered(
        userId,
        userData?.username || 'unknown',
        userData?.displayName || 'Unknown',
        token,
        `${Device.deviceName || 'Unknown'} (${Platform.OS})`
      );
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  /**
   * Register device for push notifications
   * Call this after user signs in
   */
  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      // Request permission
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get token
      const token = await this.getFCMToken();
      if (!token) {
        return null;
      }

      // Save to Firestore
      await this.saveFCMToken(userId, token);

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Remove FCM token from user (on logout)
   */
  async removeFCMToken(userId: string): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', userId);
      
      // Get user info for better logging
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : null;
      
      await setDoc(userRef, {
        fcmToken: null,
        lastTokenUpdate: new Date().toISOString(),
      }, { merge: true });

      Logger.fcmTokenRemoved(
        userId,
        userData?.username || 'unknown',
        userData?.displayName || 'Unknown'
      );
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  /**
   * Get FCM tokens for specific users
   * Used to send notifications to users
   */
  async getUserTokens(userIds: string[]): Promise<{ userId: string; token: string }[]> {
    try {
      const tokens: { userId: string; token: string }[] = [];

      // Query users with FCM tokens
      for (const userId of userIds) {
        const userSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', userId)));
        
        userSnap.forEach((doc) => {
          const data = doc.data();
          if (data.fcmToken) {
            tokens.push({ userId: doc.id, token: data.fcmToken });
          }
        });
      }

      return tokens;
    } catch (error) {
      console.error('Error getting user tokens:', error);
      return [];
    }
  }

  /**
   * Schedule a local notification (for testing)
   * Used to test notification UI without backend
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: NotificationData,
    seconds: number = 1
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as Record<string, unknown>,
          sound: true,
        },
        trigger: seconds > 0 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds } : null,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Show immediate local notification
   * Used for testing or in-app events
   */
  async showLocalNotification(
    title: string,
    body: string,
    data: NotificationData
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as Record<string, unknown>,
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
      throw error;
    }
  }

  /**
   * Add notification received listener (foreground)
   * Called when notification is received while app is open
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add notification response listener (user tapped notification)
   * Called when user taps on a notification
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  /**
   * Get badge count (unread count on app icon)
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count (unread count on app icon)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear badge count
   */
  async clearBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  }

  /**
   * Send push notification to a user
   * Uses Expo's push notification service
   * 
   * @param userIds - Array of user IDs to send notification to
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Additional data for deep linking
   * @param senderId - Sender's user ID (for logging)
   * @param senderName - Sender's username (for logging)
   */
  async sendNotificationToUsers(
    userIds: string[],
    title: string,
    body: string,
    data: NotificationData,
    senderId?: string,
    senderName?: string
  ): Promise<void> {
    try {
      // Get Expo Push Tokens for all users with usernames
      const tokens = await this.getUserTokens(userIds);
      
      // Get recipient info for logging
      const recipientTokenInfo = await Promise.all(
        userIds.map(async (userId) => {
          const userDoc = await getDoc(doc(firestore, 'users', userId));
          const userData = userDoc.exists() ? userDoc.data() : null;
          const hasToken = tokens.some(t => t.userId === userId);
          return {
            userId,
            username: userData?.username || 'Unknown',
            hasToken
          };
        })
      );
      
      if (tokens.length === 0) {
        // Log with structured format
        if (senderId && senderName) {
          Logger.pushNotification(senderId, senderName, recipientTokenInfo, false);
        }
        return;
      }

      // Send notifications via Expo Push Service
      const messages = tokens.map(({ token }) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data as Record<string, unknown>,
        priority: 'high',
        channelId: 'default',
      }));

      // Send to Expo's push notification service
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      
      // Log result
      if (senderId && senderName) {
        Logger.pushNotification(
          senderId,
          senderName,
          recipientTokenInfo,
          response.ok,
          response.ok ? undefined : JSON.stringify(result)
        );
      }
    } catch (error) {
      if (senderId && senderName) {
        Logger.error(senderId, senderName, 'Failed to send push notification', error);
      }
    }
  }

  /**
   * Setup notification listeners for foreground and tap events
   * Call this after requesting permissions
   */
  setupNotificationListeners(
    onReceived: (notification: Notifications.Notification) => void,
    onTap: (response: Notifications.NotificationResponse) => void
  ): void {
    // Clean up existing listeners first
    this.cleanup();

    // Listen for notifications received while app is in foreground
    this.notificationReceivedSubscription = this.addNotificationReceivedListener(onReceived);

    // Listen for notification taps (when user taps notification)
    this.notificationResponseSubscription = this.addNotificationResponseListener(onTap);

  }

  /**
   * Cleanup notification listeners
   * Call this on logout or app unmount
   */
  cleanup(): void {
    if (this.notificationReceivedSubscription) {
      this.notificationReceivedSubscription.remove();
      this.notificationReceivedSubscription = null;
    }

    if (this.notificationResponseSubscription) {
      this.notificationResponseSubscription.remove();
      this.notificationResponseSubscription = null;
    }

  }
}

export const MessagingService = new MessagingServiceClass();
