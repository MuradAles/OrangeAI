import { User } from '@/shared/types';
import { MessagingService, NotificationData } from './firebase/MessagingService';

/**
 * NotificationHelper
 * 
 * Formats and sends different types of push notifications
 * Handles message preview truncation and notification routing
 */

export interface NotificationConfig {
  title: string;
  body: string;
  data: NotificationData;
}

export interface InAppNotificationData {
  id: string;
  senderName: string;
  messageText: string;
  senderAvatar?: string;
  chatId: string;
  isImage: boolean;
}

// Callback for in-app notifications (for existing system)
let notificationCallback: ((notification: InAppNotificationData) => void) | null = null;

/**
 * Register callback for in-app notifications
 * Used by useNotifications hook
 */
export function registerNotificationCallback(callback: (notification: InAppNotificationData) => void): void {
  notificationCallback = callback;
}

/**
 * Unregister callback for in-app notifications
 */
export function unregisterNotificationCallback(): void {
  notificationCallback = null;
}

/**
 * Trigger in-app notification
 * Called from ChatStore when new message arrives
 */
export function triggerInAppNotification(notification: InAppNotificationData): void {
  if (notificationCallback) {
    notificationCallback(notification);
  }
}

class NotificationHelperClass {
  /**
   * Format notification for new message
   * Shows message preview if < 50 chars, otherwise "New message"
   */
  formatMessageNotification(
    sender: User,
    messageText: string,
    chatId: string,
    isGroup: boolean = false,
    groupName?: string
  ): NotificationConfig {
    const senderName = sender.displayName;
    const preview = messageText.length <= 50 
      ? messageText 
      : 'New message';

    const title = isGroup && groupName
      ? `${groupName}`
      : senderName;

    const body = isGroup && groupName
      ? `${senderName}: ${preview}`
      : preview;

    return {
      title,
      body,
      data: {
        type: isGroup ? 'group_message' : 'message',
        chatId,
        userId: sender.id,
        ...(isGroup && { groupId: chatId }),
      },
    };
  }

  /**
   * Format notification for image message
   * Shows "[Name] sent an image"
   */
  formatImageNotification(
    sender: User,
    chatId: string,
    caption?: string,
    isGroup: boolean = false,
    groupName?: string
  ): NotificationConfig {
    const senderName = sender.displayName;
    
    const title = isGroup && groupName
      ? `${groupName}`
      : senderName;

    let body: string;
    if (caption && caption.length <= 50) {
      body = isGroup 
        ? `${senderName}: 📷 ${caption}`
        : `📷 ${caption}`;
    } else {
      body = isGroup
        ? `${senderName} sent an image`
        : '📷 Sent an image';
    }

    return {
      title,
      body,
      data: {
        type: isGroup ? 'group_message' : 'message',
        chatId,
        userId: sender.id,
        ...(isGroup && { groupId: chatId }),
      },
    };
  }

  /**
   * Format notification for friend request
   * "New friend request from [Name]"
   */
  formatFriendRequestNotification(
    sender: User,
    requestId: string
  ): NotificationConfig {
    return {
      title: 'New Friend Request',
      body: `${sender.displayName} sent you a friend request`,
      data: {
        type: 'friend_request',
        userId: sender.id,
        requestId,
      },
    };
  }

  /**
   * Format notification for friend request accepted
   * "[Name] accepted your friend request"
   */
  formatFriendAcceptedNotification(
    accepter: User
  ): NotificationConfig {
    return {
      title: 'Friend Request Accepted',
      body: `${accepter.displayName} accepted your friend request`,
      data: {
        type: 'friend_accepted',
        userId: accepter.id,
      },
    };
  }

  /**
   * Format notification for group invite
   * "[Name] added you to [Group]"
   */
  formatGroupInviteNotification(
    inviter: User,
    groupName: string,
    groupId: string
  ): NotificationConfig {
    return {
      title: 'Added to Group',
      body: `${inviter.displayName} added you to ${groupName}`,
      data: {
        type: 'group_invite',
        userId: inviter.id,
        chatId: groupId,
        groupId,
      },
    };
  }

  /**
   * Format notification for new admin role
   * "You're now admin of [Group]"
   */
  formatAdminPromotedNotification(
    groupName: string,
    groupId: string
  ): NotificationConfig {
    return {
      title: 'Group Admin',
      body: `You're now admin of ${groupName}`,
      data: {
        type: 'group_invite',
        chatId: groupId,
        groupId,
      },
    };
  }

  /**
   * Send notification immediately (local)
   * Used for testing or immediate notifications
   */
  async sendLocalNotification(config: NotificationConfig): Promise<void> {
    try {
      await MessagingService.showLocalNotification(
        config.title,
        config.body,
        config.data
      );
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Schedule notification for later (local)
   * Used for testing or scheduled notifications
   */
  async scheduleNotification(
    config: NotificationConfig,
    seconds: number = 1
  ): Promise<string> {
    try {
      return await MessagingService.scheduleLocalNotification(
        config.title,
        config.body,
        config.data,
        seconds
      );
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Get notification route from notification data
   * Used to navigate when user taps notification
   */
  getNotificationRoute(data: NotificationData): string | null {
    switch (data.type) {
      case 'message':
      case 'group_message':
        return data.chatId ? `/(tabs)/home?openChat=${data.chatId}` : null;
      
      case 'friend_request':
        return '/(tabs)/friends';
      
      case 'friend_accepted':
        return '/(tabs)/friends';
      
      case 'group_invite':
        return data.chatId ? `/(tabs)/home?openChat=${data.chatId}` : null;
      
      default:
        return '/(tabs)/home';
    }
  }

  /**
   * Parse notification data from push notification
   */
  parseNotificationData(notification: any): NotificationData | null {
    try {
      const data = notification.request?.content?.data || notification.data;
      
      if (!data || !data.type) {
        return null;
      }

      return {
        type: data.type,
        chatId: data.chatId,
        userId: data.userId,
        requestId: data.requestId,
        groupId: data.groupId,
      };
    } catch (error) {
      console.error('Error parsing notification data:', error);
      return null;
    }
  }
}

export const NotificationHelper = new NotificationHelperClass();
