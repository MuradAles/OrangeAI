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
import React, { memo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCulturalAnalysis, useMessageAnimations, useMessageTranslation } from '../hooks';
import { AICommandsMenu } from './AICommandsMenu';
import { MessageActions } from './MessageActions';
import { messageBubbleStyles } from './MessageBubble.styles';
import { MessageContent } from './MessageContent';
import { MessageModals } from './MessageModals';
import { QuickActionsPopover } from './QuickActionsPopover';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  chatId: string;
  senderName?: string;
  senderAvatar?: string | null;
  showAvatar: boolean; // Show avatar (first message in group)
  showTimestamp: boolean; // Show timestamp (last message in group or after 5 mins)
  isGroupChat?: boolean; // Is this a group chat? (show sender name on all received messages)
  preferredLanguage?: string; // User's preferred language for translations
  chatMood?: string; // Chat mood for context-aware cultural analysis
  relationship?: string; // Relationship type for context-aware cultural analysis
  onLongPress?: (message: Message) => void;
  onPress?: (message: Message) => void;
  onQuickReaction?: (message: Message, emoji: string) => void; // Handle quick emoji reactions
  onAITranslate?: (message: Message) => void; // AI translate command (single tap - one-time translation)
  onAISummarize?: (message: Message) => void; // AI summarize command (long press - chat summary)
  onTranslate20?: () => void; // Translate last 20 messages (long press - batch translation)
  onCopyMessage?: (message: Message) => void; // Copy message text (single tap)
  onCulturalAnalysis?: (message: Message) => void; // Cultural analysis command (after translation)
}

export const MessageBubble = memo(({
  message,
  currentUserId,
  chatId,
  senderName,
  senderAvatar,
  showAvatar,
  showTimestamp,
  isGroupChat = false,
  preferredLanguage = 'en', // Default to English
  chatMood,
  relationship,
  onLongPress,
  onPress,
  onQuickReaction,
  onAITranslate,
  onAISummarize,
  onTranslate20,
  onCopyMessage,
  onCulturalAnalysis,
}: MessageBubbleProps) => {
  const theme = useTheme();
  const isSent = message.senderId === currentUserId;
  const isDeleted = message.deletedForEveryone || (message.deletedFor || []).includes(currentUserId);
  
  // Image state
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Quick actions state
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAICommands, setShowAICommands] = useState(false);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const bubbleRef = useRef<View>(null);

  // Cultural context modal state
  const [showCulturalContextModal, setShowCulturalContextModal] = useState(false);

  // Use custom hooks
  const {
    showTranslation,
    showTranslatedText,
    isTranslating,
    translationData,
    translatedText,
    handleTranslationSwap,
    setShowTranslation,
  } = useMessageTranslation({
    message,
    preferredLanguage,
    onAITranslate,
  });

  const {
    culturalAnalysis,
    showCulturalPopup,
    selectedPhrase,
    isAnalyzing,
    handleCulturalAnalysis: originalHandleCulturalAnalysis,
    setShowCulturalPopup,
    setSelectedPhrase,
  } = useCulturalAnalysis({
    message,
    chatId,
    preferredLanguage,
    translatedText: translatedText || undefined,
  });

  // Wrapper to open comprehensive modal and trigger analysis
  const handleCulturalAnalysisWithModal = async () => {
    // Open modal immediately
    setShowCulturalContextModal(true);
    // Then run analysis (will use cache if available or fetch new)
    await originalHandleCulturalAnalysis();
  };

  const {
    pulseAnim,
    sparkle1Anim,
    sparkle2Anim,
    sparkle3Anim,
    translatePulseAnim,
    translateSparkle1Anim,
    translateSparkle2Anim,
    translateSparkle3Anim,
  } = useMessageAnimations(isAnalyzing, isTranslating);

  // Handle tap to show quick actions
  const handlePress = () => {
    // Skip for deleted or failed messages
    if (isDeleted || message.status === 'failed') {
      onPress?.(message);
      return;
    }

    // Measure bubble position on screen
    bubbleRef.current?.measureInWindow((x, y, width, height) => {
      setMessagePosition({ x, y, width, height });
      setShowQuickActions(true);
    });
  };

  // Handle long press to show AI commands
  const handleLongPress = () => {
    // Skip for deleted or failed messages
    if (isDeleted || message.status === 'failed') {
      onLongPress?.(message);
      return;
    }

    // Measure bubble position on screen
    bubbleRef.current?.measureInWindow((x, y, width, height) => {
      setMessagePosition({ x, y, width, height });
      setShowAICommands(true);
    });
  };

  const handleAISummarize = () => {
    onAISummarize?.(message);
  };

  const handleReaction = (emoji: string) => {
    // Quick reaction - trigger parent handler
    onQuickReaction?.(message, emoji);
  };

  // Handle copy message
  const handleCopyMessage = () => {
    onCopyMessage?.(message);
  };

  // No highlights - just plain text
  const renderTranslatedTextWithHighlights = (text: string) => {
    return text;
  };

  return (
    <View style={[messageBubbleStyles.container, isSent ? messageBubbleStyles.sentContainer : messageBubbleStyles.receivedContainer]}>
      {/* Avatar (for received messages, first in group) */}
      {!isSent && (
        <View style={messageBubbleStyles.avatarContainer}>
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
        ref={bubbleRef}
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={[
          messageBubbleStyles.bubble,
          isSent 
            ? { backgroundColor: theme.colors.messageSent } 
            : { backgroundColor: theme.colors.messageReceived },
          isDeleted && messageBubbleStyles.deletedBubble,
        ]}
      >
        {/* Message Actions (sender name, translation buttons, status) */}
        <MessageActions
          message={message}
          isSent={isSent}
          isGroupChat={isGroupChat}
          showAvatar={showAvatar}
          senderName={senderName}
          translatedText={translatedText}
          showTranslatedText={showTranslatedText}
          isTranslating={isTranslating}
          onTranslationSwap={handleTranslationSwap}
          isAnalyzing={isAnalyzing}
          onCulturalAnalysis={handleCulturalAnalysisWithModal}
          translatePulseAnim={translatePulseAnim}
          translateSparkle1Anim={translateSparkle1Anim}
          translateSparkle2Anim={translateSparkle2Anim}
          translateSparkle3Anim={translateSparkle3Anim}
          pulseAnim={pulseAnim}
          sparkle1Anim={sparkle1Anim}
          sparkle2Anim={sparkle2Anim}
          sparkle3Anim={sparkle3Anim}
        />

        {/* Message Content (text, images, translations) */}
        <MessageContent
          message={message}
          isSent={isSent}
          isDeleted={isDeleted}
          showTranslation={showTranslation}
          translatedText={translatedText}
          translationData={translationData}
          showTranslatedText={showTranslatedText}
          isTranslating={isTranslating}
          onSetShowTranslation={setShowTranslation}
          renderTranslatedTextWithHighlights={renderTranslatedTextWithHighlights}
          showFullImage={showFullImage}
          imageLoading={imageLoading}
          imageDimensions={imageDimensions}
          onSetShowFullImage={setShowFullImage}
          onSetImageLoading={setImageLoading}
          onSetImageDimensions={setImageDimensions}
        />

        {/* Failed Message Actions */}
        {isSent && message.status === 'failed' && (
          <View style={messageBubbleStyles.failedActions}>
            <Text style={[messageBubbleStyles.failedText, { color: theme.colors.error }]}>
              ❌ Failed to send
            </Text>
            <View style={messageBubbleStyles.failedButtons}>
              <Pressable
                style={[messageBubbleStyles.retryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => onPress?.(message)}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" />
                <Text style={[messageBubbleStyles.retryButtonText, { color: '#FFFFFF' }]}>
                  Retry
                </Text>
              </Pressable>
              <Pressable
                style={[messageBubbleStyles.deleteButton, { borderColor: theme.colors.error }]}
                onPress={() => onLongPress?.(message)}
              >
                <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                <Text style={[messageBubbleStyles.deleteButtonText, { color: theme.colors.error }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <View style={messageBubbleStyles.reactions}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              users.length > 0 && (
                <View 
                  key={emoji} 
                  style={[messageBubbleStyles.reaction, { backgroundColor: theme.colors.background }]}
                >
                  <Text style={messageBubbleStyles.reactionEmoji}>{emoji}</Text>
                  {users.length > 1 && (
                    <Text style={[messageBubbleStyles.reactionCount, { color: theme.colors.text }]}>
                      {users.length}
                    </Text>
                  )}
                </View>
              )
            ))}
          </View>
        )}
      </Pressable>

      {/* Modals */}
      <MessageModals
        message={message}
        showFullImage={showFullImage}
        onCloseImage={() => setShowFullImage(false)}
        showCulturalPopup={showCulturalPopup}
        selectedPhrase={selectedPhrase}
        onCloseCulturalPopup={() => {
          setShowCulturalPopup(false);
          setSelectedPhrase(null);
        }}
        showCulturalContext={showCulturalContextModal}
        culturalAnalysis={culturalAnalysis}
        translatedText={translatedText}
        isAnalyzing={isAnalyzing}
        onCloseCulturalContext={() => setShowCulturalContextModal(false)}
      />

      {/* Quick Actions Popover - Single Tap Menu */}
      <QuickActionsPopover
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        message={message}
        messagePosition={messagePosition}
        onReaction={handleReaction}
        onCopy={handleCopyMessage}
      />

      {/* AI Commands Menu - Long Press Menu */}
      <AICommandsMenu
        visible={showAICommands}
        onClose={() => setShowAICommands(false)}
        message={message}
        messagePosition={messagePosition}
        onSummarize={handleAISummarize}
        onTranslate20={() => onTranslate20?.()}
      />
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
    JSON.stringify(prevProps.message.deletedFor || []) === JSON.stringify(nextProps.message.deletedFor || []) &&
    JSON.stringify(prevProps.message.translations || {}) === JSON.stringify(nextProps.message.translations || {})
  );
});

MessageBubble.displayName = 'MessageBubble';