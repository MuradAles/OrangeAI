/**
 * Firebase Cloud Messaging Service
 * 
 * Handles push notifications using Firebase Cloud Messaging (FCM) and expo-notifications.
 * Supports foreground, background, and killed app states.
 * 
 * Features:
 * - Request notification permissions
 * - Get and save FCM tokens
 * - Send notifications to specific users
 * - Handle notification taps (deep linking)
 * - In-app notifications when user is in chat
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { firestore } from './FirebaseConfig';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  chatId?: string;
  senderId?: string;
  senderName?: string;
  messageText?: string;
  type: 'message' | 'image' | 'friend_request' | 'friend_accepted' | 'group_invite';
}

export interface PushNotification {
  to: string; // FCM token
  title: string;
  body: string;
  data?: NotificationData;
  sound?: string;
  badge?: number;
}

class MessagingServiceClass {
  private fcmToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Request notification permissions from user
   * Call this on app launch or during onboarding
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return false;
      }

      // Check current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      console.log('✅ Notification permission granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get the FCM (Expo Push) token for this device
   * This token is used to send notifications to this specific device
   */
  async getFCMToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('⚠️ Cannot get FCM token on simulator/emulator');
        return null;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'abdece3f-a5c7-4a4b-92bb-471bc2ba5d9b', // From app.json
      });

      this.fcmToken = token.data;
      console.log('✅ FCM Token obtained:', this.fcmToken);
      return this.fcmToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to Firestore for this user
   * This allows sending notifications to this user from any device
   */
  async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString(),
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
        },
      });
      console.log('✅ FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  /**
   * Get FCM token for a specific user from Firestore
   */
  async getUserFCMToken(userId: string): Promise<string | null> {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.warn('User not found:', userId);
        return null;
      }

      const fcmToken = userDoc.data()?.fcmToken;
      return fcmToken || null;
    } catch (error) {
      console.error('Error getting user FCM token:', error);
      return null;
    }
  }

  /**
   * Send a push notification to a specific user
   * This uses Expo's Push Notification service
   */
  async sendNotification(notification: PushNotification): Promise<boolean> {
    try {
      const message = {
        to: notification.to,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
        priority: 'high',
        channelId: 'default',
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data?.status === 'ok') {
        console.log('✅ Notification sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send notification:', result);
        return false;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send a notification to a user by their userId
   * Automatically fetches their FCM token from Firestore
   */
  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<boolean> {
    try {
      const fcmToken = await this.getUserFCMToken(userId);
      
      if (!fcmToken) {
        console.warn('No FCM token found for user:', userId);
        return false;
      }

      return await this.sendNotification({
        to: fcmToken,
        title,
        body,
        data,
      });
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Send new message notification
   */
  async sendMessageNotification(
    recipientUserId: string,
    senderName: string,
    messageText: string,
    chatId: string,
    senderId: string,
    isImage: boolean = false
  ): Promise<boolean> {
    const title = senderName;
    const body = isImage
      ? '📷 Sent an image'
      : messageText.length > 100
      ? `${messageText.substring(0, 100)}...`
      : messageText;

    return await this.sendNotificationToUser(recipientUserId, title, body, {
      type: isImage ? 'image' : 'message',
      chatId,
      senderId,
      senderName,
      messageText: messageText.substring(0, 100),
    });
  }

  /**
   * Send friend request notification
   */
  async sendFriendRequestNotification(
    recipientUserId: string,
    senderName: string,
    senderId: string
  ): Promise<boolean> {
    return await this.sendNotificationToUser(
      recipientUserId,
      'New Friend Request',
      `${senderName} sent you a friend request`,
      {
        type: 'friend_request',
        senderId,
        senderName,
      }
    );
  }

  /**
   * Send friend request accepted notification
   */
  async sendFriendAcceptedNotification(
    recipientUserId: string,
    accepterName: string,
    accepterId: string,
    chatId: string
  ): Promise<boolean> {
    return await this.sendNotificationToUser(
      recipientUserId,
      'Friend Request Accepted',
      `${accepterName} accepted your friend request`,
      {
        type: 'friend_accepted',
        senderId: accepterId,
        senderName: accepterName,
        chatId,
      }
    );
  }

  /**
   * Send added to group notification
   */
  async sendGroupInviteNotification(
    recipientUserId: string,
    inviterName: string,
    groupName: string,
    groupId: string
  ): Promise<boolean> {
    return await this.sendNotificationToUser(
      recipientUserId,
      'Added to Group',
      `${inviterName} added you to "${groupName}"`,
      {
        type: 'group_invite',
        chatId: groupId,
        senderName: inviterName,
      }
    );
  }

  /**
   * Set up listeners for notifications
   * Call this in app/_layout.tsx
   */
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTap: (response: Notifications.NotificationResponse) => void
  ): void {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Listener for notification taps
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationTap
    );

    console.log('✅ Notification listeners set up');
  }

  /**
   * Clean up notification listeners
   * Call this on app unmount or logout
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
    this.fcmToken = null;
    console.log('✅ Notification listeners cleaned up');
  }

  /**
   * Get the current FCM token (cached)
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Configure notification channels (Android)
   * Call this on app initialization
   */
  async configureNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0084FF',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0084FF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('friend_requests', {
        name: 'Friend Requests',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#4CAF50',
      });

      console.log('✅ Android notification channels configured');
    }
  }
}

// Export singleton instance
export const MessagingService = new MessagingServiceClass();

