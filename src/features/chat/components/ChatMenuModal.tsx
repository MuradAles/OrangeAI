/**
 * ChatMenuModal Component
 * 
 * Modal for one-on-one chat options with:
 * - Language detection info
 * - Auto-translate toggle
 * - Delete chat option
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { getLanguageName } from '../utils/messageUtils';

interface ChatMenuModalProps {
  visible: boolean;
  messages: Message[];
  autoTranslateEnabled: boolean;
  chatId: string | null;
  userId: string | undefined;
  onClose: () => void;
  onToggleAutoTranslate: () => void;
  onDeleteChat: () => void;
}

export const ChatMenuModal: React.FC<ChatMenuModalProps> = ({
  visible,
  messages,
  autoTranslateEnabled,
  chatId,
  userId,
  onClose,
  onToggleAutoTranslate,
  onDeleteChat,
}) => {
  const theme = useTheme();

  // Get most recent message with detected language
  const recentMessageWithLang = messages
    .slice()
    .reverse()
    .find(m => m.detectedLanguage);
  
  const langCode = recentMessageWithLang?.detectedLanguage;
  const langName = langCode ? getLanguageName(langCode) : null;

  const handleDeleteChat = () => {
    onClose();
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This will only delete it from your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDeleteChat,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.menuOverlay}
        onPress={onClose}
      >
        <View style={[styles.menuContainer, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Chat Options</Text>
          
          {/* Language Detection Info */}
          {langName && (
            <View style={[styles.menuOption, { borderBottomColor: theme.colors.border }]}>
              <Ionicons name="language" size={22} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>
                  Detected Language
                </Text>
                <Text style={[styles.menuOptionSubtext, { color: theme.colors.textSecondary }]}>
                  {langName} ({langCode?.toUpperCase()})
                </Text>
              </View>
            </View>
          )}
          
          {/* Auto-Translate Toggle */}
          <Pressable
            style={[styles.menuOption, { borderBottomColor: theme.colors.border }]}
            onPress={onToggleAutoTranslate}
          >
            <Ionicons 
              name={autoTranslateEnabled ? "checkmark-circle" : "ellipse-outline"} 
              size={22} 
              color={autoTranslateEnabled ? theme.colors.success : theme.colors.textSecondary} 
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>
                Auto-Translate
              </Text>
              <Text style={[styles.menuOptionSubtext, { color: theme.colors.textSecondary }]}>
                {autoTranslateEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </Pressable>
          
          <Pressable
            style={[styles.menuOption, { borderBottomColor: theme.colors.border }]}
            onPress={handleDeleteChat}
          >
            <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
            <Text style={[styles.menuOptionText, { color: theme.colors.error }]}>Delete Chat</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuOptionSubtext: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
});
