/**
 * ChatListItem - Individual chat row in chat list
 * 
 * Displays:
 * - Profile picture (user avatar or group icon)
 * - Chat name (display name for 1-on-1, group name for groups)
 * - Last message preview
 * - Timestamp
 * - Unread count badge
 * - Online status indicator (for 1-on-1)
 * - Read status indicator for sent messages
 */

import { Avatar } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { Chat } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ChatListItemProps {
  chat: Chat;
  currentUserId: string;
  otherUserName?: string;
  otherUserAvatar?: string | null;
  isOnline?: boolean;
  onPress: (chatId: string) => void;
}

export const ChatListItem = React.memo(({
  chat,
  currentUserId,
  otherUserName,
  otherUserAvatar,
  isOnline,
  onPress,
}: ChatListItemProps) => {
  const theme = useTheme();

  // Determine chat display name
  const chatName = chat.type === 'one-on-one' 
    ? (otherUserName || 'Unknown User')
    : (chat.groupName || 'Group Chat');

  // Format timestamp - memoize to prevent recalculation on every render
  const formattedTimestamp = React.useMemo(() => {
    // If lastMessageTime is 0 or falsy, don't show timestamp
    if (!chat.lastMessageTime || chat.lastMessageTime === 0) {
      return '';
    }
    
    const dateObj = chat.lastMessageTime instanceof Date 
      ? chat.lastMessageTime 
      : new Date(chat.lastMessageTime);
    
    if (isToday(dateObj)) {
      return format(dateObj, 'h:mm a');
    } else if (isYesterday(dateObj)) {
      return 'Yesterday';
    } else {
      return format(dateObj, 'MMM d');
    }
  }, [chat.lastMessageTime]);

  // Truncate last message
  const truncateMessage = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Check if last message was sent by current user
  const isLastMessageMine = chat.lastMessageSenderId === currentUserId;

  // Get display text for last message
  const getLastMessageDisplay = (): string => {
    // If we have lastMessageText and it's not empty, use it
    if (chat.lastMessageText && chat.lastMessageText.trim() !== '') {
      return chat.lastMessageText;
    }
    
    // If chat exists and has a timestamp, assume there's at least one message
    // This handles cases where lastMessageText might be empty (like image-only messages)
    if (chat.lastMessageTime && chat.lastMessageTime > 0) {
      return '📷 Photo'; // Default to photo icon for messages without text
    }
    
    // No messages yet
    return 'No messages yet';
  };

  // Get status icon for sent messages
  const getStatusIcon = () => {
    if (!isLastMessageMine) return null;

    switch (chat.lastMessageStatus) {
      case 'sending':
        return <Ionicons name="time-outline" size={16} color="#999" style={styles.statusIcon} />;
      case 'sent':
        return <Ionicons name="checkmark" size={16} color="#999" style={styles.statusIcon} />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={16} color="#999" style={styles.statusIcon} />;
      case 'read':
        return <Ionicons name="checkmark-done" size={16} color="#4ECDC4" style={styles.statusIcon} />;
      case 'failed':
        return <Ionicons name="alert-circle" size={16} color="#FF6B6B" style={styles.statusIcon} />;
      default:
        return null;
    }
  };

  return (
    <Pressable
      onPress={() => onPress(chat.id)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed
            ? theme.colors.surface
            : 'transparent',
        },
      ]}
    >
      {/* Avatar with online indicator */}
      <View style={styles.avatarContainer}>
        {chat.type === 'one-on-one' ? (
          <>
            <Avatar
              name={otherUserName || 'U'}
              imageUrl={otherUserAvatar}
              size="medium"
            />
            {isOnline && (
              <View
                style={[
                  styles.onlineIndicator,
                  { backgroundColor: theme.colors.success },
                ]}
              />
            )}
          </>
        ) : (
          <Avatar
            name={chatName}
            imageUrl={chat.groupIcon}
            size="medium"
          />
        )}
      </View>

      {/* Chat Info */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              theme.typography.bodyBold,
              { color: theme.colors.text, flex: 1 },
            ]}
            numberOfLines={1}
          >
            {chatName}
          </Text>
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textSecondary },
            ]}
          >
            {formattedTimestamp}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          {/* Status icon for sent messages */}
          {getStatusIcon()}
          
          <Text
            style={[
              theme.typography.body,
              { 
                color: (chat.unreadCount ?? 0) > 0 ? theme.colors.text : theme.colors.textSecondary,
                fontWeight: (chat.unreadCount ?? 0) > 0 ? '600' : '400',
                flex: 1 
              },
            ]}
            numberOfLines={1}
          >
            {getLastMessageDisplay()}
          </Text>
          
          {/* Unread count badge */}
          {(chat.unreadCount ?? 0) > 0 && (
            <View
              style={styles.unreadBadge}
            >
              <Text style={styles.unreadText}>
                {(chat.unreadCount ?? 0) > 99 ? '99+' : chat.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.lastMessageTime === nextProps.chat.lastMessageTime &&
    prevProps.chat.lastMessageText === nextProps.chat.lastMessageText &&
    prevProps.chat.unreadCount === nextProps.chat.unreadCount &&
    prevProps.chat.lastMessageStatus === nextProps.chat.lastMessageStatus &&
    prevProps.otherUserName === nextProps.otherUserName &&
    prevProps.isOnline === nextProps.isOnline
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 4,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFC107', // Bright yellow/gold like in reference
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

