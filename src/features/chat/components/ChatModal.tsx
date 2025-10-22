/**
 * ChatModal - Full-screen modal for chat conversation
 * Opens over the chat list, similar to WhatsApp
 */

import { Avatar } from '@/components/common';
import { PresenceService, TypingUser } from '@/services/firebase';
import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { useAuthStore, useChatStore, usePresenceStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { DateSeparator } from './DateSeparator';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatModalProps {
  visible: boolean;
  chatId: string | null;
  onClose: () => void;
}

type ListItem = 
  | { type: 'message'; data: Message }
  | { type: 'date'; data: Date }
  | { type: 'unread'; data: number };

export const ChatModal = ({ visible, chatId, onClose }: ChatModalProps) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const {
    messages,
    isLoadingMessages,
    loadMessagesFromSQLite,
    subscribeToMessages,
    sendMessage,
    sendImageMessage,
    getUserProfile,
    markChatAsRead,
    deleteMessageForMe,
    deleteMessageForEveryone,
    addReaction,
    setActiveChatId,
  } = useChatStore();

  const [isSending, setIsSending] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const flashListRef = useRef<any>(null);
  const hasScrolledInitially = useRef(false);

  const { subscribeToUser } = usePresenceStore();
  const presenceMap = usePresenceStore(state => state.presenceMap);
  const presenceVersion = usePresenceStore(state => state.version); // Subscribe to version for reactivity

  // Get current chat and other user info
  const { chats } = useChatStore();
  
  const currentChat = useMemo(() => {
    return chats.find(chat => chat.id === chatId);
  }, [chats, chatId]);

  // Check if this is a group chat
  const isGroupChat = currentChat?.type === 'group';

  // For one-on-one chats, get the other user
  const otherUser = useMemo(() => {
    if (!user || !currentChat || isGroupChat) return null;
    
    // Find the other user ID from participants
    const otherUserId = currentChat.participants.find(id => id !== user.id);
    if (!otherUserId) return null;
    
    return getUserProfile(otherUserId);
  }, [currentChat, user, getUserProfile, isGroupChat]);

  // Load messages when modal opens
  useEffect(() => {
    if (visible && chatId && user?.id) {
      // Reset scroll flag when opening chat
      hasScrolledInitially.current = false;
      
      // Set active chat ID for notification routing
      setActiveChatId(chatId);
      
      // PRD Flow: Load from SQLite FIRST (instant <100ms), then sync from Firebase in background
      const loadMessages = async () => {
        // 1. Load from SQLite instantly (cached messages)
        await loadMessagesFromSQLite(chatId);
        
        // 2. Subscribe to Firebase for real-time updates (background sync)
        subscribeToMessages(chatId, user.id);
        
        // 3. Mark messages as read (PRD: If chat open → Mark as read)
        // Wait a bit to ensure messages are loaded first
        setTimeout(() => {
          markChatAsRead(chatId, user.id);
        }, 500);
      };
      
      loadMessages();
    } else if (!visible) {
      // Clear active chat ID when modal closes
      setActiveChatId(null);
    }
    
    return () => {
      // Clear active chat ID on unmount
      if (visible) {
        setActiveChatId(null);
      }
    };
    // Note: Don't clear messages on cleanup - keep them for quick reopening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, chatId, user?.id]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!visible || !chatId || !user?.id) {
      setTypingUsers([]);
      return;
    }

    const unsubscribe = PresenceService.subscribeToTyping(
      chatId,
      user.id,
      (users) => setTypingUsers(users),
      (error) => console.error('Error subscribing to typing:', error)
    );

    return () => {
      unsubscribe();
      setTypingUsers([]);
    };
  }, [visible, chatId, user?.id]);

  // Subscribe to other user's presence (online/offline status)
  // Using centralized PresenceStore - only for one-on-one chats
  useEffect(() => {
    if (!visible || !currentChat || !user?.id || isGroupChat) return;

    // Get the other user's ID (one-on-one only)
    const otherUserId = currentChat.participants.find(id => id !== user.id);
    if (!otherUserId) return;

    // Subscribe via PresenceStore (handles deduplication)
    subscribeToUser(otherUserId);

    // No cleanup needed - PresenceStore manages subscriptions globally
  }, [visible, currentChat, user?.id, isGroupChat, subscribeToUser]);

  // Process messages into list items (with date separators)
  const listItems = useMemo(() => {
    const items: ListItem[] = [];
    let lastDate: string | null = null;
    
    // Sort messages by timestamp (oldest first for display)
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    sortedMessages.forEach((message) => {
      // Ensure timestamp is valid
      const messageDate = typeof message.timestamp === 'number' 
        ? new Date(message.timestamp)
        : new Date(message.timestamp);
      
      if (isNaN(messageDate.getTime())) {
        return; // Skip invalid timestamps
      }
      
      const currentDate = messageDate.toDateString();

      // Add date separator if date changed
      if (currentDate !== lastDate) {
        items.push({ type: 'date', data: messageDate });
        lastDate = currentDate;
      }

      // Add message
      items.push({ type: 'message', data: message });
    });

    // Return items in chronological order: oldest at top (index 0), newest at bottom (last index)
    return items;
  }, [messages]);

  // Check if we should show avatar (last message in group from bottom up)
  const shouldShowAvatar = (index: number): boolean => {
    // Normal order: index 0 is oldest, length-1 is newest
    // Show avatar for last message in group (next message is from different sender or too far apart)
    
    const currentItem = listItems[index];
    const nextItem = listItems[index + 1]; // Next item is newer
    
    if (!nextItem) return true; // Last item (newest message) always shows avatar
    
    if (currentItem.type !== 'message' || nextItem.type !== 'message') {
      return true;
    }
    
    const currentMsg = currentItem.data;
    const nextMsg = nextItem.data;
    
    // Different sender - show avatar for current message (last in this sender's group)
    if (currentMsg.senderId !== nextMsg.senderId) {
      return true;
    }
    
    // More than 1 minute apart - show avatar
    const currentTime = typeof currentMsg.timestamp === 'number' 
      ? currentMsg.timestamp 
      : new Date(currentMsg.timestamp).getTime();
    const nextTime = typeof nextMsg.timestamp === 'number' 
      ? nextMsg.timestamp 
      : new Date(nextMsg.timestamp).getTime();
    const timeDiff = nextTime - currentTime;
    return timeDiff > 60000;
  };

  // Scroll to bottom ONCE when chat first opens and messages load
  useEffect(() => {
    if (visible && messages.length > 0 && flashListRef.current && !hasScrolledInitially.current) {
      // Scroll after a short delay to ensure FlashList is ready
      const timer = setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: false });
        hasScrolledInitially.current = true; // Mark as scrolled to prevent re-scrolling
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [visible, messages.length]); // Only scroll once when messages first load

  // Handle jump to bottom
  const handleJumpToBottom = () => {
    if (flashListRef.current) {
      flashListRef.current.scrollToEnd({ animated: true });
      setShowJumpToBottom(false);
    }
  };

  // Handle send message
  const handleSend = async (text: string) => {
    if (!user?.id || !chatId) return;
    
    setIsSending(true);
    try {
      await sendMessage(chatId, user.id, text);
      
      // Scroll to bottom after sending (newest message)
      setTimeout(() => {
        if (flashListRef.current) {
          flashListRef.current.scrollToEnd({ animated: true });
          setShowJumpToBottom(false);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle send image message
  const handleSendImage = async (imageUri: string, caption?: string) => {
    if (!user?.id || !chatId) return;
    
    setIsSending(true);
    try {
      await sendImageMessage(chatId, user.id, imageUri, caption);
      
      // Scroll to bottom after sending (newest message)
      setTimeout(() => {
        if (flashListRef.current) {
          flashListRef.current.scrollToEnd({ animated: true });
          setShowJumpToBottom(false);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to send image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle copy message to clipboard
  const handleCopyMessage = async (message: Message) => {
    try {
      const textToCopy = message.type === 'image' && message.caption 
        ? message.caption 
        : message.text;
      
      if (textToCopy) {
        await Clipboard.setStringAsync(textToCopy);
        Alert.alert('Copied', 'Message copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy message:', error);
      Alert.alert('Error', 'Failed to copy message');
    }
  };

  // Handle delete message for current user
  const handleDeleteForMe = async (message: Message) => {
    if (!user?.id || !chatId) return;
    
    Alert.alert(
      'Delete Message',
      'Delete this message for yourself? Others will still see it.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessageForMe(chatId, message.id, user.id);
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  // Handle delete message for everyone
  const handleDeleteForEveryone = async (message: Message) => {
    if (!chatId) return;
    
    Alert.alert(
      'Delete for Everyone',
      'This message will be deleted for everyone in this chat.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete for Everyone',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessageForEveryone(chatId, message.id);
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  // Handle add emoji reaction
  const handleAddReaction = (message: Message) => {
    if (!user?.id || !chatId) return;
    
    // Show alert with input for emoji
    if (Platform.OS === 'ios') {
      // On iOS, use prompt
      Alert.prompt(
        'Add Reaction',
        'Type an emoji to react with:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Add',
            onPress: async (emoji?: string) => {
              if (emoji && emoji.trim()) {
                try {
                  await addReaction(chatId, message.id, emoji.trim(), user.id);
                } catch (error) {
                  console.error('Failed to add reaction:', error);
                  Alert.alert('Error', 'Failed to add reaction');
                }
              }
            },
          },
        ],
        'plain-text'
      );
    } else {
      // On Android, show common emoji options
      Alert.alert(
        'Add Reaction',
        'Choose an emoji:',
        [
          { text: '❤️', onPress: () => addReaction(chatId, message.id, '❤️', user.id) },
          { text: '👍', onPress: () => addReaction(chatId, message.id, '👍', user.id) },
          { text: '😂', onPress: () => addReaction(chatId, message.id, '😂', user.id) },
          { text: '😮', onPress: () => addReaction(chatId, message.id, '😮', user.id) },
          { text: '😢', onPress: () => addReaction(chatId, message.id, '😢', user.id) },
          { text: '🙏', onPress: () => addReaction(chatId, message.id, '🙏', user.id) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // Handle long press (for delete, react, copy)
  const handleLongPress = (message: Message) => {
    const isDeleted = message.deletedForEveryone || (message.deletedFor || []).includes(user?.id || '');
    
    // Don't show menu for deleted messages
    if (isDeleted) return;
    
    const options = [
      {
        text: 'React',
        onPress: () => handleAddReaction(message),
      },
      {
        text: 'Copy',
        onPress: () => handleCopyMessage(message),
      },
      {
        text: 'Delete for Me',
        onPress: () => handleDeleteForMe(message),
        style: 'destructive' as const,
      },
      ...(message.senderId === user?.id ? [{
        text: 'Delete for Everyone',
        onPress: () => handleDeleteForEveryone(message),
        style: 'destructive' as const,
      }] : []),
      {
        text: 'Cancel',
        style: 'cancel' as const,
      },
    ];
    
    Alert.alert('Message Options', 'What would you like to do?', options);
  };

  // Render list item
  const renderItem: ListRenderItem<ListItem> = ({ item, index }) => {
    if (item.type === 'date') {
      return <DateSeparator date={item.data} />;
    }
    
    if (item.type === 'unread') {
      return null; // UnreadSeparator not needed for now
    }
    
    // Message
    const message = item.data;
    const showAvatar = shouldShowAvatar(index);
    const senderProfile = message.senderId !== user?.id ? getUserProfile(message.senderId) : null;
    
    return (
      <MessageBubble
        message={message}
        currentUserId={user!.id}
        senderName={senderProfile?.displayName}
        senderAvatar={senderProfile?.profilePictureUrl}
        showAvatar={showAvatar}
        showTimestamp={true}
        isGroupChat={isGroupChat}
        onLongPress={handleLongPress}
      />
    );
  };

  // Get item type for FlashList optimization
  const getItemType = (item: ListItem) => {
    return item.type;
  };

  if (!user) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: theme.colors.background }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <StatusBar 
          barStyle={theme.colors.background === '#000000' ? 'light-content' : 'dark-content'} 
          backgroundColor="transparent" 
          translucent={true} 
        />
          <View style={[styles.container, { 
            backgroundColor: theme.colors.background,
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 
          }]}>
            
            {/* Header */}
            <View style={[styles.header, { 
              backgroundColor: theme.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }]}>
              <Pressable onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </Pressable>

              <View style={styles.headerInfo}>
                {isGroupChat ? (
                  // Group Chat Header
                  <>
                    <View style={styles.avatarWithIndicator}>
                      <Avatar
                        name={currentChat?.groupName || 'Group'}
                        imageUrl={currentChat?.groupIcon}
                        size={36}
                      />
                    </View>
                    <View style={styles.headerText}>
                      <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]} numberOfLines={1}>
                        {currentChat?.groupName || 'Group Chat'}
                      </Text>
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {currentChat?.participants.length || 0} members
                      </Text>
                    </View>
                  </>
                ) : (
                  // One-on-One Chat Header
                  <>
                    <View style={styles.avatarWithIndicator}>
                      <Avatar
                        name={otherUser?.displayName || 'User'}
                        imageUrl={otherUser?.profilePictureUrl}
                        size={36}
                      />
                      {/* Green dot for online status - from centralized PresenceStore */}
                      {(() => {
                        const otherUserId = currentChat?.participants.find(id => id !== user?.id);
                        const presence = otherUserId ? presenceMap.get(otherUserId) : null;
                        return presence?.isOnline && (
                          <View style={[styles.onlineDot, { backgroundColor: theme.colors.success }]} />
                        );
                      })()}
                    </View>
                    <View style={styles.headerText}>
                      <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]} numberOfLines={1}>
                        {otherUser?.displayName || 'Chat'}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.headerActions}>
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => {
                    // Video call - placeholder for future functionality
                    console.log('Video call pressed');
                  }}
                >
                  <Ionicons name="videocam" size={24} color={theme.colors.text} />
                </Pressable>
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => {
                    // Phone call - placeholder for future functionality
                    console.log('Phone call pressed');
                  }}
                >
                  <Ionicons name="call" size={24} color={theme.colors.text} />
                </Pressable>
              </View>

            </View>

            {/* Messages List */}
            {isLoadingMessages && messages.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <FlashList
                ref={flashListRef}
                data={listItems}
                renderItem={renderItem}
                keyExtractor={(item, index) => 
                  item.type === 'message' 
                    ? item.data.id 
                    : `${item.type}-${index}`
                }
                getItemType={getItemType}
                estimatedItemSize={100}
                contentContainerStyle={styles.messagesListContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                onScroll={(event) => {
                  // Show jump to bottom button if user scrolls up
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
                  setShowJumpToBottom(!isNearBottom && listItems.length > 10);
                }}
                scrollEventThrottle={400}
              />
            )}

            {/* Jump to Bottom Button */}
            {showJumpToBottom && (
              <Pressable
                style={[styles.jumpToBottomButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleJumpToBottom}
              >
                <Ionicons name="arrow-down" size={24} color="#fff" />
              </Pressable>
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator typingUserNames={typingUsers.map(u => u.userName)} />
            )}

            {/* Message Input */}
            <MessageInput
              onSend={handleSend}
              onSendImage={handleSendImage}
              isSending={isSending}
              chatId={chatId || undefined}
              userId={user?.id}
              userName={user?.displayName}
            />
          </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 0,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8, // Minimal padding since SafeAreaView handles notch
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWithIndicator: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesListContent: {
    paddingVertical: 8,
  },
  jumpToBottomButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

