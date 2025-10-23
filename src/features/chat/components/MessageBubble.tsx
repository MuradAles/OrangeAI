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
import { memo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  senderName?: string;
  senderAvatar?: string | null;
  showAvatar: boolean; // Show avatar (first message in group)
  showTimestamp: boolean; // Show timestamp (last message in group or after 5 mins)
  isGroupChat?: boolean; // Is this a group chat? (show sender name on all received messages)
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
  isGroupChat = false,
  onLongPress,
  onPress,
}: MessageBubbleProps) => {
  const theme = useTheme();
  const isSent = message.senderId === currentUserId;
  const isDeleted = message.deletedForEveryone || (message.deletedFor || []).includes(currentUserId);
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

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

    // Use dark colors for sent messages (on yellow background)
    switch (message.status) {
      case 'sending':
        return <Ionicons name={'time-outline' as any} size={14} color="rgba(0, 0, 0, 0.4)" />;
      case 'sent':
        return <Ionicons name={'checkmark' as any} size={14} color="rgba(0, 0, 0, 0.5)" />;
      case 'delivered':
        return <Ionicons name={'checkmark-done' as any} size={14} color="rgba(0, 0, 0, 0.5)" />;
      case 'read':
        return <Ionicons name={'checkmark-done' as any} size={14} color="#0084FF" />;
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
            ? { backgroundColor: theme.colors.messageSent } 
            : { backgroundColor: theme.colors.messageReceived },
          isDeleted && styles.deletedBubble,
        ]}
      >
        {/* Sender name for received messages in groups */}
        {!isSent && senderName && (isGroupChat || showAvatar) && (
          <Text style={[styles.senderName, { color: theme.colors.primary }]}>
            {senderName}
          </Text>
        )}

        {/* Message Content */}
        {isDeleted ? (
          <Text style={[
            styles.deletedText, 
            { color: isSent ? 'rgba(0,0,0,0.5)' : theme.colors.textSecondary }
          ]}>
            {message.deletedForEveryone ? '🚫 This message was deleted' : '🚫 You deleted this message'}
          </Text>
        ) : (
          <>
            {/* Quote/Reply Visual (for demonstration) - Shows on some sent messages */}
            {isSent && message.text && message.text.includes('usually buy') && (
              <View style={[styles.quotedMessage, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                <View style={[styles.quotedBorder, { backgroundColor: theme.colors.primary }]} />
                <View style={styles.quotedContent}>
                  <Text style={[styles.quotedSender, { color: theme.colors.primary }]}>
                    Zaire Dorwart
                  </Text>
                  <Text style={[styles.quotedText, { color: theme.colors.messageText }]} numberOfLines={1}>
                    Please help me find a good monitor for the...
                  </Text>
                </View>
              </View>
            )}
            
            {/* Image Message */}
            {message.type === 'image' && message.thumbnailUrl && (
              <Pressable onPress={() => setShowFullImage(true)}>
                <View style={[
                  styles.imageContainer,
                  imageDimensions.width > 0 && {
                    width: imageDimensions.width,
                    height: imageDimensions.height,
                  }
                ]}>
                  {imageLoading && (
                    <View style={styles.imageLoader}>
                      <ActivityIndicator color={isSent ? theme.colors.messageText : theme.colors.primary} />
                    </View>
                  )}
                  <Image
                    source={{ uri: message.thumbnailUrl }}
                    style={styles.thumbnail}
                    onLoadStart={() => setImageLoading(true)}
                    onLoad={(e) => {
                      setImageLoading(false);
                      // Calculate dimensions to fit image while maintaining aspect ratio
                      const { width, height } = e.nativeEvent.source;
                      const maxWidth = 280;
                      const maxHeight = 400;
                      const minWidth = 150;
                      const minHeight = 150;
                      
                      let displayWidth = width;
                      let displayHeight = height;
                      
                      // If image is too wide
                      if (width > maxWidth) {
                        displayWidth = maxWidth;
                        displayHeight = (height / width) * maxWidth;
                      }
                      
                      // If image is too tall
                      if (displayHeight > maxHeight) {
                        displayHeight = maxHeight;
                        displayWidth = (width / height) * maxHeight;
                      }
                      
                      // Ensure minimum dimensions
                      if (displayWidth < minWidth) {
                        displayWidth = minWidth;
                        displayHeight = (height / width) * minWidth;
                      }
                      
                      if (displayHeight < minHeight) {
                        displayHeight = minHeight;
                        displayWidth = (width / height) * minHeight;
                      }
                      
                      setImageDimensions({
                        width: Math.round(displayWidth),
                        height: Math.round(displayHeight),
                      });
                    }}
                    resizeMode="cover"
                  />
                </View>
                {/* Caption */}
                {message.caption && (
                  <Text style={[
                    theme.typography.body,
                    styles.caption,
                    { color: isSent ? theme.colors.messageText : theme.colors.text }
                  ]}>
                    {message.caption}
                  </Text>
                )}
              </Pressable>
            )}
            
            {/* Text Message */}
            {message.type === 'text' && message.text && (
              <Text style={[
                theme.typography.body, 
                { color: isSent ? theme.colors.messageText : theme.colors.messageTextReceived }
              ]}>
                {message.text}
              </Text>
            )}
          </>
        )}

        {/* Timestamp and Status */}
        <View style={styles.footer}>
          <Text style={[
            styles.timestamp, 
            { color: isSent ? 'rgba(0,0,0,0.5)' : theme.colors.textSecondary }
          ]}>
            {formatTimestamp(message.timestamp)}
          </Text>
          {getStatusIcon()}
        </View>
        
        {/* "Delivered" status text below message (only for sent messages) */}
        {isSent && showTimestamp && message.status === 'delivered' && (
          <Text style={[styles.deliveredStatus, { color: theme.colors.textSecondary }]}>
            Delivered
          </Text>
        )}

        {/* Failed Message Actions */}
        {isSent && message.status === 'failed' && (
          <View style={styles.failedActions}>
            <Text style={[styles.failedText, { color: theme.colors.error }]}>
              ❌ Failed to send
            </Text>
            <View style={styles.failedButtons}>
              <Pressable
                style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => onPress?.(message)}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" />
                <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>
                  Retry
                </Text>
              </Pressable>
              <Pressable
                style={[styles.deleteButton, { borderColor: theme.colors.error }]}
                onPress={() => onLongPress?.(message)}
              >
                <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
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

      {/* Full-Screen Image Modal */}
      {message.type === 'image' && message.imageUrl && (
        <Modal
          visible={showFullImage}
          transparent
          onRequestClose={() => setShowFullImage(false)}
          animationType="fade"
        >
          <Pressable 
            style={styles.fullImageModal}
            onPress={() => setShowFullImage(false)}
          >
            <View style={styles.fullImageHeader}>
              <Pressable onPress={() => setShowFullImage(false)}>
                <Ionicons name="close" size={32} color="#fff" />
              </Pressable>
            </View>
            <Image
              source={{ uri: message.imageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            {message.caption && (
              <View style={styles.fullImageCaptionContainer}>
                <Text style={styles.fullImageCaption}>{message.caption}</Text>
              </View>
            )}
          </Pressable>
        </Modal>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.imageUrl === nextProps.message.imageUrl &&
    prevProps.message.thumbnailUrl === nextProps.message.thumbnailUrl &&
    prevProps.message.caption === nextProps.message.caption &&
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
  quotedMessage: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  quotedBorder: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  quotedContent: {
    flex: 1,
  },
  quotedSender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  quotedText: {
    fontSize: 13,
  },
  deliveredStatus: {
    fontSize: 11,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    width: 200,
    height: 200,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 1,
  },
  caption: {
    marginTop: 4,
  },
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageHeader: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  fullImageCaptionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 12,
  },
  fullImageCaption: {
    color: '#fff',
    fontSize: 16,
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
  failedActions: {
    marginTop: 8,
    gap: 8,
  },
  failedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  failedButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

