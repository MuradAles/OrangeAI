/**
 * ChatModal - Full-screen modal for chat conversation
 * Opens over the chat list, similar to WhatsApp
 */

import { Avatar } from '@/components/common';
import { DateSeparator, MessageBubble, MessageInput } from '@/features/chat/components';
import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { useAuthStore, useChatStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';

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
    getUserProfile,
    markChatAsRead,
  } = useChatStore();

  const [isSending, setIsSending] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const flashListRef = useRef<any>(null);
  const hasScrolledInitially = useRef(false);

  // Load messages when modal opens
  useEffect(() => {
    if (visible && chatId && user?.id) {
      // Reset scroll flag when opening chat
      hasScrolledInitially.current = false;
      
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
    }
    // Note: Don't clear messages on cleanup - keep them for quick reopening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, chatId, user?.id]);

  // Get current chat and other user info
  const { chats } = useChatStore();
  
  const currentChat = useMemo(() => {
    return chats.find(chat => chat.id === chatId);
  }, [chats, chatId]);

  const otherUser = useMemo(() => {
    if (!user || !currentChat) return null;
    
    // Find the other user ID from participants
    const otherUserId = currentChat.participants.find(id => id !== user.id);
    if (!otherUserId) return null;
    
    return getUserProfile(otherUserId);
  }, [currentChat, user, getUserProfile]);

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

  // Handle long press (for delete, react, copy)
  const handleLongPress = (message: Message) => {
    Alert.alert(
      'Message Options',
      'What would you like to do?',
      [
        {
          text: 'Copy',
          onPress: () => {
            // TODO: Copy to clipboard
            console.log('Copy message:', message.text);
          },
        },
        {
          text: 'Delete for Me',
          onPress: () => {
            // TODO: Delete message for current user
            console.log('Delete for me:', message.id);
          },
          style: 'destructive',
        },
        ...(message.senderId === user?.id ? [{
          text: 'Delete for Everyone',
          onPress: () => {
            // TODO: Delete message for everyone
            console.log('Delete for everyone:', message.id);
          },
          style: 'destructive' as const,
        }] : []),
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
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
        keyboardVerticalOffset={0}
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
                <Avatar
                  name={otherUser?.displayName || 'User'}
                  imageUrl={otherUser?.profilePictureUrl}
                  size={36}
                />
                <View style={styles.headerText}>
                  <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]} numberOfLines={1}>
                    {otherUser?.displayName || 'Chat'}
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    {otherUser?.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
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
                contentContainerStyle={styles.messagesList}
                keyboardShouldPersistTaps="handled"
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

            {/* Message Input */}
            <MessageInput
              onSend={handleSend}
              isSending={isSending}
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
  headerText: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
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

