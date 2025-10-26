/**
 * MessagesList Component
 * 
 * FlashList component for displaying chat messages with:
 * - Message rendering
 * - Scroll handling
 * - Jump to bottom button
 * - Loading overlay
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ListItem, shouldShowAvatar } from '../utils/messageUtils';
import { DateSeparator } from './DateSeparator';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface MessagesListProps {
  // Data
  listItems: ListItem[];
  messages: Message[];
  chatId: string;
  
  // User info
  userId: string;
  preferredLanguage: string;
  isGroupChat: boolean;
  getUserProfile: (userId: string) => any;
  
  // Scroll state
  flashListRef: React.RefObject<any>;
  showJumpToBottom: boolean;
  isReady: boolean;
  
  // Typing indicators
  typingUsers: { userName: string }[];
  
  // Actions
  onScroll: (event: any) => void;
  onJumpToBottom: () => void;
  onMessagePress: (message: Message) => void;
  onMessageLongPress: (message: Message) => void;
  onQuickReaction: (message: Message, emoji: string) => void;
  onAITranslate: (message: Message) => void;
  onAISummarize: (message: Message) => void;
  onTranslate20: () => void;
  onCopyMessage: (message: Message) => void;
  onCulturalAnalysis: (message: Message) => void;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  listItems,
  messages,
  chatId,
  userId,
  preferredLanguage,
  isGroupChat,
  getUserProfile,
  flashListRef,
  showJumpToBottom,
  isReady,
  typingUsers,
  onScroll,
  onJumpToBottom,
  onMessagePress,
  onMessageLongPress,
  onQuickReaction,
  onAITranslate,
  onAISummarize,
  onTranslate20,
  onCopyMessage,
  onCulturalAnalysis,
}) => {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in when ready
  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isReady, fadeAnim]);

  // Render list item - memoized for performance
  const renderItem: ListRenderItem<ListItem> = useCallback(({ item, index }) => {
    if (item.type === 'date') {
      return <DateSeparator date={item.data} />;
    }
    
    if (item.type === 'unread') {
      return null; // UnreadSeparator not needed for now
    }
    
    // Message
    const message = item.data;
    const showAvatar = shouldShowAvatar(listItems, index);
    const senderProfile = message.senderId !== userId ? getUserProfile(message.senderId) : null;
    
    return (
      <MessageBubble
        key={message.id} // Ensure stable identity
        message={message}
        currentUserId={userId}
        chatId={chatId}
        senderName={senderProfile?.displayName}
        senderAvatar={senderProfile?.profilePictureUrl}
        showAvatar={showAvatar}
        showTimestamp={true}
        isGroupChat={isGroupChat}
        preferredLanguage={preferredLanguage}
        onPress={onMessagePress}
        onLongPress={onMessageLongPress}
        onQuickReaction={onQuickReaction}
        onAITranslate={onAITranslate}
        onAISummarize={onAISummarize}
        onTranslate20={onTranslate20}
        onCopyMessage={onCopyMessage}
        onCulturalAnalysis={onCulturalAnalysis}
      />
    );
  }, [
    chatId,
    listItems, // Required for shouldShowAvatar calculation
    userId,
    getUserProfile,
    isGroupChat,
    preferredLanguage,
    onMessagePress,
    onMessageLongPress,
    onQuickReaction,
    onAITranslate,
    onAISummarize,
    onTranslate20,
    onCopyMessage,
    onCulturalAnalysis,
  ]);

  // Get item type for FlashList optimization
  const getItemType = useCallback((item: ListItem) => {
    return item.type;
  }, []);

  return (
    <>
      {/* Messages List */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
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
          estimatedItemSize={80}
          drawDistance={800}
          estimatedListSize={{ height: 600, width: 400 }}
          contentContainerStyle={styles.messagesListContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          removeClippedSubviews={Platform.OS === 'android' ? false : true}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      </Animated.View>

      {/* Loading Overlay - Show while positioning messages */}
      {!isReady && listItems.length > 0 && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading chat...
            </Text>
          </View>
        </View>
      )}

      {/* Jump to Bottom Button */}
      {showJumpToBottom && (
        <Pressable
          style={[styles.jumpToBottomButton, { backgroundColor: theme.colors.primary }]}
          onPress={onJumpToBottom}
        >
          <Ionicons name="arrow-down" size={24} color="#fff" />
        </Pressable>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <TypingIndicator typingUserNames={typingUsers.map(u => u.userName)} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});
