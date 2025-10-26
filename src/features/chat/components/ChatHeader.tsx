/**
 * ChatHeader Component
 * 
 * Header component for chat modal with:
 * - Back button
 * - Avatar and name/group info
 * - Online status indicators
 * - Action buttons (auto-translate, summarize, menu)
 */

import { Avatar } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { Chat, User } from '@/shared/types';
import { usePresenceStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface ChatHeaderProps {
  // Chat info
  currentChat?: Chat;
  otherUser?: User;
  isGroupChat: boolean;
  
  // User info
  userId?: string;
  
  // Actions
  onClose: () => void;
  onToggleAutoTranslate: () => void;
  onGenerateSummary: () => void;
  onOpenGroupSettings: () => void;
  onOpenChatMenu?: () => void;
  
  // States
  autoTranslateEnabled: boolean;
  isGeneratingSummary: boolean;
  messagesCount: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentChat,
  otherUser,
  isGroupChat,
  userId,
  onClose,
  onToggleAutoTranslate,
  onGenerateSummary,
  onOpenGroupSettings,
  onOpenChatMenu,
  autoTranslateEnabled,
  isGeneratingSummary,
  messagesCount,
}) => {
  const theme = useTheme();
  const presenceMap = usePresenceStore(state => state.presenceMap);

  return (
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
                const otherUserId = currentChat?.participants.find(id => id !== userId);
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
        {/* Auto-Translate Toggle */}
        <Pressable 
          style={styles.actionButton}
          onPress={onToggleAutoTranslate}
        >
          <Ionicons 
            name={autoTranslateEnabled ? "language" : "language-outline"} 
            size={22} 
            color={autoTranslateEnabled ? theme.colors.primary : theme.colors.text} 
          />
        </Pressable>

        {/* Summarize Chat button */}
        <Pressable 
          style={styles.actionButton}
          onPress={onGenerateSummary}
          disabled={isGeneratingSummary || messagesCount === 0}
        >
          {isGeneratingSummary ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons 
              name="sparkles-outline" 
              size={22} 
              color={messagesCount === 0 ? theme.colors.textSecondary : theme.colors.primary} 
            />
          )}
        </Pressable>
        
        {/* Three-dot menu for group chats only */}
        {isGroupChat && (
          <Pressable 
            style={styles.actionButton}
            onPress={onOpenGroupSettings}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
