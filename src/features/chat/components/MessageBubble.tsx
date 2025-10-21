/**
 * MessageBubble - Individual message bubble component
 * 
 * Features:
 * - Sent (right-aligned, blue) vs Received (left-aligned, gray)
 * - Message grouping (same sender within 1 minute)
 * - Status icons (sending, sent, delivered, read)
 * - Long-press menu (Delete, React, Copy)
 * - Reactions display
 * - Deleted message handling
 */

import { Avatar } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  senderName?: string;
  senderAvatar?: string | null;
  showAvatar: boolean; // Show avatar (first message in group)
  showTimestamp: boolean; // Show timestamp (last message in group or after 5 mins)
  onLongPress?: (message: Message) => void;
  onPress?: (message: Message) => void;
}

export const MessageBubble = memo(({
  message,
  currentUserId,
  senderName,
  senderAvatar,
  showAvatar,
  showTimestamp,
  onLongPress,
  onPress,
}: MessageBubbleProps) => {
  const theme = useTheme();
  const isSent = message.senderId === currentUserId;
  const isDeleted = message.deletedForEveryone || (message.deletedFor || []).includes(currentUserId);

  // Format timestamp
  const formatTimestamp = (timestamp: Date | number): string => {
    try {
      // Convert to Date object if it's a number (milliseconds)
      const dateObj = typeof timestamp === 'number' 
        ? new Date(timestamp)
        : timestamp instanceof Date 
          ? timestamp 
          : new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Invalid date';
      }
      
      if (isToday(dateObj)) {
        return format(dateObj, 'h:mm a');
      } else if (isYesterday(dateObj)) {
        return `Yesterday ${format(dateObj, 'h:mm a')}`;
      } else {
        return format(dateObj, 'MMM d, h:mm a');
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return 'Invalid date';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!isSent) return null;

    // Use white colors for sent messages (on blue background)
    switch (message.status) {
      case 'sending':
        return <Ionicons name={'time-outline' as any} size={14} color="rgba(255, 255, 255, 0.6)" />;
      case 'sent':
        return <Ionicons name={'checkmark' as any} size={14} color="rgba(255, 255, 255, 0.8)" />;
      case 'delivered':
        return <Ionicons name={'checkmark-done' as any} size={14} color="rgba(255, 255, 255, 0.8)" />;
      case 'read':
        return <Ionicons name={'checkmark-done' as any} size={14} color="#4ECDC4" />;
      case 'failed':
        return <Ionicons name={'alert-circle' as any} size={14} color="#FF6B6B" />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, isSent ? styles.sentContainer : styles.receivedContainer]}>
      {/* Avatar (for received messages, first in group) */}
      {!isSent && (
        <View style={styles.avatarContainer}>
          {showAvatar ? (
            <Avatar
              name={senderName || 'U'}
              imageUrl={senderAvatar}
              size={32}
            />
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>
      )}

      {/* Message Content */}
      <Pressable
        onPress={() => onPress?.(message)}
        onLongPress={() => onLongPress?.(message)}
        style={[
          styles.bubble,
          isSent 
            ? { backgroundColor: theme.colors.primary } 
            : { backgroundColor: theme.colors.surface },
          isDeleted && styles.deletedBubble,
        ]}
      >
        {/* Sender name for received messages in groups */}
        {!isSent && senderName && showAvatar && (
          <Text style={[styles.senderName, { color: theme.colors.primary }]}>
            {senderName}
          </Text>
        )}

        {/* Message Text */}
        {isDeleted ? (
          <Text style={[
            styles.deletedText, 
            { color: isSent ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary }
          ]}>
            {message.deletedForEveryone ? '🚫 This message was deleted' : '🚫 You deleted this message'}
          </Text>
        ) : (
          <Text style={[
            theme.typography.body, 
            { color: isSent ? '#fff' : theme.colors.text }
          ]}>
            {message.text}
          </Text>
        )}

        {/* Timestamp and Status */}
        <View style={styles.footer}>
          <Text style={[
            styles.timestamp, 
            { color: isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary }
          ]}>
            {formatTimestamp(message.timestamp)}
          </Text>
          {getStatusIcon()}
        </View>

        {/* Reactions */}
        {Object.keys(message.reactions).length > 0 && (
          <View style={styles.reactions}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              users.length > 0 && (
                <View 
                  key={emoji} 
                  style={[styles.reaction, { backgroundColor: theme.colors.background }]}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {users.length > 1 && (
                    <Text style={[styles.reactionCount, { color: theme.colors.text }]}>
                      {users.length}
                    </Text>
                  )}
                </View>
              )
            ))}
          </View>
        )}
      </Pressable>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.showTimestamp === nextProps.showTimestamp &&
    JSON.stringify(prevProps.message.reactions || {}) === JSON.stringify(nextProps.message.reactions || {}) &&
    JSON.stringify(prevProps.message.deletedFor || []) === JSON.stringify(nextProps.message.deletedFor || [])
  );
});

MessageBubble.displayName = 'MessageBubble';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  deletedBubble: {
    opacity: 0.6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
});

