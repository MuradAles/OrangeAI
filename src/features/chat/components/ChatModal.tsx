/**
 * ChatModal - Refactored Full-screen modal for chat conversation
 * 
 * Now uses extracted hooks and components for better maintainability
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { useAuthStore, useChatStore } from '@/store';
import React, { useCallback, useMemo, useRef } from 'react';
import { Animated, Keyboard, Modal, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';

// Import our new hooks
import {
    useAutoTranslate,
    useChatKeyboard,
    useChatMessages,
    useChatModals,
    useChatPresence,
    useChatScroll
} from '../hooks';

// Import our new components
import { ChatHeader } from './ChatHeader';
import { ChatSummaryModal } from './ChatSummaryModal';
import { GroupSettingsModal } from './GroupSettingsModal';
import { MessageInput } from './MessageInput';
import { MessageOptionsSheet } from './MessageOptionsSheet';
import { MessagesList } from './MessagesList';
import { SmartReplyBar } from './SmartReplyBar';

interface ChatModalProps {
  visible: boolean;
  chatId: string | null;
  onClose: () => void;
}

export const ChatModal = ({ visible, chatId, onClose }: ChatModalProps) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { chats } = useChatStore();
  
  // Refs
  const flashListRef = useRef<any>(null);
  
  // State for input text (for smart replies to set)
  const [inputText, setInputText] = React.useState('');

  // Get current chat and other user info
  const currentChat = chats.find(chat => chat.id === chatId);
  const isGroupChat = currentChat?.type === 'group';

  // For one-on-one chats, get the other user
  const otherUser = useMemo(() => {
    if (!user || !currentChat || isGroupChat) return null;
    
    // Find the other user ID from participants
    const otherUserId = currentChat.participants.find(id => id !== user.id);
    if (!otherUserId) return null;
    
    return useChatStore.getState().getUserProfile(otherUserId);
  }, [currentChat, user, isGroupChat]);

  // Use our extracted hooks
  const chatMessages = useChatMessages({
    visible,
    chatId,
    userId: user?.id,
  });

  const chatScroll = useChatScroll({
    visible,
                chatId,
    messagesLength: chatMessages.messages.length,
    userId: user?.id,
    flashListRef,
  });

  const autoTranslate = useAutoTranslate({
    visible,
    chatId,
    userId: user?.id,
    messages: chatMessages.messages,
  });

  const chatModals = useChatModals({
    chatId,
    userId: user?.id,
    messages: chatMessages.messages,
  });

  const chatPresence = useChatPresence({
    visible,
      chatId,
    currentChat,
    userId: user?.id,
    isGroupChat,
  });

  const chatKeyboard = useChatKeyboard(visible);

  // Handle close with keyboard dismissal
  const handleClose = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    // Small delay to allow keyboard to dismiss before modal closes
    setTimeout(() => {
      onClose();
    }, 100);
  }, [onClose]);

  // Handle send message with scroll to bottom
  const handleSend = useCallback(async (text: string) => {
    await chatMessages.handleSend(text, chatScroll.debouncedScrollToBottom);
  }, [chatMessages, chatScroll]);

  // Handle send image with scroll to bottom
  const handleSendImage = useCallback(async (imageUri: string, caption?: string) => {
    await chatMessages.handleSendImage(imageUri, caption, chatScroll.debouncedScrollToBottom);
  }, [chatMessages, chatScroll]);

  // Handle AI translate with auto-translate hook
  const handleAITranslate = useCallback(async (message: any) => {
    await chatModals.handleAITranslate(message, autoTranslate.handleTranslateMessage);
  }, [chatModals, autoTranslate]);

  // Handle cultural analysis
  const handleCulturalAnalysis = useCallback(async (message: any) => {
    await chatModals.handleCulturalAnalysis(message);
  }, [chatModals]);

  // Get last received message for smart replies
  // Only show smart replies if the LAST message in the conversation is from the OTHER person
  const lastReceivedMessage = useMemo(() => {
    const lastMessage = chatMessages.messages[chatMessages.messages.length - 1];
    
    // Only return the last message if:
    // 1. It exists
    // 2. It's NOT from the current user
    // 3. It's a text message with content
    if (
      lastMessage &&
      lastMessage.senderId !== user?.id &&
      lastMessage.type === 'text' &&
      lastMessage.text
    ) {
      return lastMessage;
    }
    
    return undefined;
  }, [chatMessages.messages, user?.id]);

  // Handle smart reply selection
  const handleSelectSmartReply = useCallback((replyText: string) => {
    setInputText(replyText);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar 
        barStyle={theme.colors.background === '#000000' ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent={true} 
      />
      <Animated.View style={[styles.container, { 
        backgroundColor: theme.colors.background,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
        paddingBottom: chatKeyboard.keyboardHeight,
      }]}>
            
            {/* Header */}
        <ChatHeader
          currentChat={currentChat}
          otherUser={otherUser || undefined}
          isGroupChat={isGroupChat}
          userId={user.id}
          onClose={handleClose}
          onToggleAutoTranslate={autoTranslate.handleToggleAutoTranslate}
          onGenerateSummary={chatModals.handleGenerateSummary}
          onOpenGroupSettings={() => chatModals.setShowGroupSettings(true)}
          autoTranslateEnabled={autoTranslate.autoTranslateEnabled}
          isGeneratingSummary={chatModals.isGeneratingSummary}
          messagesCount={chatMessages.messages.length}
        />

            {/* Messages List */}
        <MessagesList
          listItems={chatMessages.listItems}
          messages={chatMessages.messages}
          chatId={chatId || ''}
          userId={user.id}
          preferredLanguage={user.preferredLanguage || 'en'}
          isGroupChat={isGroupChat}
          getUserProfile={chatMessages.getUserProfile}
          flashListRef={flashListRef}
          showJumpToBottom={chatScroll.showJumpToBottom}
          isReady={chatScroll.isReady}
          typingUsers={chatPresence.typingUsers}
          onScroll={chatScroll.handleScroll}
          onJumpToBottom={chatScroll.handleJumpToBottom}
          onMessagePress={chatMessages.handleMessagePress}
          onMessageLongPress={chatModals.handleLongPress}
          onQuickReaction={chatMessages.handleQuickReaction}
          onAITranslate={handleAITranslate}
          onAISummarize={chatModals.handleAISummarize}
          onTranslate20={autoTranslate.handleTranslatePrevious}
          onCopyMessage={chatModals.handleCopyMessage}
          onCulturalAnalysis={handleCulturalAnalysis}
        />

        {/* Smart Reply Bar (above input) */}
        {lastReceivedMessage && chatId && (
          <SmartReplyBar
            message={lastReceivedMessage}
            chatId={chatId}
            preferredLanguage={user.preferredLanguage || 'en'}
            onSelectReply={handleSelectSmartReply}
          />
        )}

            {/* Message Input */}
            <MessageInput
              onSend={handleSend}
              onSendImage={handleSendImage}
          isSending={chatMessages.isSending}
              chatId={chatId || undefined}
          userId={user.id}
          userName={user.displayName}
          preferredLanguage={user.preferredLanguage || 'en'}
          showTranslationPreview={autoTranslate.translationPreviewEnabled}
          initialText={inputText}
          onTextChange={setInputText}
            />
      </Animated.View>

      {/* Group Settings Modal */}
      {isGroupChat && (
        <GroupSettingsModal
          visible={chatModals.showGroupSettings}
          chatId={chatId}
          onClose={() => chatModals.setShowGroupSettings(false)}
          onChatDeleted={onClose}
        />
      )}

      {/* Message Options Sheet */}
      <MessageOptionsSheet
        visible={chatModals.showMessageOptions}
        message={chatModals.selectedMessage}
        options={chatModals.messageOptions()}
        onClose={() => {
          chatModals.setShowMessageOptions(false);
          chatModals.setSelectedMessage(null);
        }}
      />

      {/* Chat Summary Modal */}
      <ChatSummaryModal
        visible={chatModals.showChatSummary}
        chatSummary={chatModals.chatSummary}
        isGeneratingSummary={chatModals.isGeneratingSummary}
        onClose={() => chatModals.setShowChatSummary(false)}
      />

      {/* Copied Feedback */}
      {chatModals.showCopiedFeedback && (
        <View style={styles.copiedFeedback}>
          <Text style={styles.copiedText}>Copied</Text>
                  </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 0,
    padding: 0,
  },
  copiedFeedback: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    marginLeft: -40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  copiedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});