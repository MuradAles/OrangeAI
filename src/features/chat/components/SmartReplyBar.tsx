/**
 * SmartReplyBar Component
 * 
 * Shows 3 AI-generated smart reply suggestions with tone selector
 * User can switch between Casual, Professional, and Formal tones
 * Tone preference is saved per-chat
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ToneType = 'casual' | 'professional' | 'formal';

interface ToneOption {
  id: ToneType;
  label: string;
  emoji: string;
}

const TONES: ToneOption[] = [
  { id: 'casual', label: 'Casual', emoji: '😊' },
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'formal', label: 'Formal', emoji: '👔' },
];

interface SmartReplyBarProps {
  message: Message;
  chatId: string;
  preferredLanguage: string;
  onSelectReply: (text: string) => void;
}

interface RepliesByTone {
  casual: string[];
  professional: string[];
  formal: string[];
}

export const SmartReplyBar: React.FC<SmartReplyBarProps> = ({
  message,
  chatId,
  preferredLanguage,
  onSelectReply,
}) => {
  const theme = useTheme();
  const [repliesByTone, setRepliesByTone] = useState<RepliesByTone>({
    casual: [],
    professional: [],
    formal: [],
  });
  const [selectedTone, setSelectedTone] = useState<ToneType>('casual');
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadTonePreference = useCallback(async () => {
    try {
      const key = `smartReplyTone_${chatId}`;
      const saved = await AsyncStorage.getItem(key);
      if (saved && (saved === 'casual' || saved === 'professional' || saved === 'formal')) {
        setSelectedTone(saved as ToneType);
      }
    } catch (error) {
      console.error('Failed to load tone preference:', error);
    }
  }, [chatId]);

  const saveTonePreference = async (tone: ToneType) => {
    try {
      const key = `smartReplyTone_${chatId}`;
      await AsyncStorage.setItem(key, tone);
    } catch (error) {
      console.error('Failed to save tone preference:', error);
    }
  };

  const handleToneChange = (tone: ToneType) => {
    setSelectedTone(tone);
    saveTonePreference(tone);
    setShowToneMenu(false);
  };

  const generateReplies = useCallback(async () => {
    // Don't generate replies if message doesn't exist or doesn't have text
    if (!message || !message.id || !message.text) {
      console.log('Skipping smart replies - no valid message');
      setIsLoading(false);
      return;
    }

    // CRITICAL: Verify message belongs to current chat (prevents errors when switching chats)
    if (message.chatId && message.chatId !== chatId) {
      console.log('Skipping smart replies - message belongs to different chat', {
        messageChatId: message.chatId,
        currentChatId: chatId
      });
      setIsLoading(false);
      return;
    }

    // Check if message ID looks like a temporary local ID (not synced to Firestore yet)
    // Temporary IDs typically start with 'temp_' or are very short
    if (message.id.startsWith('temp_') || message.id.length < 10) {
      console.log('Skipping smart replies - message not synced to Firestore yet');
      // Use greeting replies for new chats
      setRepliesByTone({
        casual: ['Hi!', 'Hello!', 'Hey there!'],
        professional: ['Hello', 'Good to meet you', 'Pleasure to connect'],
        formal: ['Good day', 'Pleased to make your acquaintance', 'How do you do'],
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/services/firebase/FirebaseConfig');

      const generateFn = httpsCallable(functions, 'generateSmartReplies');
      const result: any = await generateFn({
        messageId: message.id,
        chatId: chatId,
        preferredLanguage: preferredLanguage,
      });

      if (result.data.success) {
        setRepliesByTone(result.data.replies);
      }
    } catch (error: any) {
      console.error('Failed to generate smart replies:', error);
      
      // Handle specific error cases
      if (error.code === 'functions/not-found' || error.message?.includes('Message not found')) {
        // Message not synced to Firestore yet (new chat scenario)
        console.log('Message not found in Firestore, using fallback replies for new chat');
        setRepliesByTone({
          casual: ['Hi!', 'Hello!', 'Hey there!'],
          professional: ['Hello', 'Good to meet you', 'Pleasure to connect'],
          formal: ['Good day', 'Pleased to make your acquaintance', 'How do you do'],
        });
      } else {
        // Other errors - use generic replies
        setRepliesByTone({
          casual: ['Okay', 'Sounds good', 'Thanks'],
          professional: ['Understood', 'That works', 'Thank you'],
          formal: ['Certainly', 'Very well', 'Thank you kindly'],
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [message, chatId, preferredLanguage]);

  // Reset replies when chat changes (prevents showing stale replies from previous chat)
  useEffect(() => {
    setRepliesByTone({
      casual: [],
      professional: [],
      formal: [],
    });
    setIsLoading(true);
  }, [chatId]);

  // Load saved tone preference on mount
  useEffect(() => {
    loadTonePreference();
    generateReplies();
  }, [loadTonePreference, generateReplies]);

  const currentReplies = repliesByTone[selectedTone] || [];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Generating suggestions...
        </Text>
      </View>
    );
  }

  if (currentReplies.length === 0) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        {/* Tone Selector Button (Left) - Star Icon */}
        <Pressable
          style={[styles.toneButton, {
            backgroundColor: theme.colors.backgroundInput,
            borderColor: theme.colors.border,
          }]}
          onPress={() => setShowToneMenu(true)}
        >
          <Ionicons name="star" size={18} color={theme.colors.primary} />
        </Pressable>

        {/* Reply chips (Middle) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {currentReplies.map((reply, index) => (
            <Pressable
              key={index}
              style={[styles.replyChip, {
                backgroundColor: theme.colors.backgroundInput,
                borderColor: theme.colors.border,
              }]}
              onPress={() => onSelectReply(reply)}
            >
              <Text style={[styles.replyText, { color: theme.colors.text }]} numberOfLines={2}>
                {reply}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Regenerate button (Right) */}
        <Pressable
          style={[styles.regenerateButton, {
            backgroundColor: theme.colors.backgroundInput,
            borderColor: theme.colors.border,
          }]}
          onPress={generateReplies}
        >
          <Ionicons name="refresh" size={16} color={theme.colors.primary} />
        </Pressable>
      </View>

      {/* Tone Selection Modal */}
      <Modal
        visible={showToneMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowToneMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowToneMenu(false)}
        >
          <View style={[styles.toneMenuContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.toneMenuTitle, { color: theme.colors.text }]}>
              Select Tone
            </Text>
            {TONES.map((tone) => (
              <Pressable
                key={tone.id}
                style={[
                  styles.toneOption,
                  {
                    backgroundColor: selectedTone === tone.id
                      ? theme.colors.primary + '15'
                      : 'transparent',
                  },
                ]}
                onPress={() => handleToneChange(tone.id)}
              >
                <Text style={styles.toneOptionEmoji}>{tone.emoji}</Text>
                <Text style={[styles.toneOptionLabel, { color: theme.colors.text }]}>
                  {tone.label}
                </Text>
                {selectedTone === tone.id && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  // Tone Button (Left) - Star Icon
  toneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 8,
  },
  // Replies (Middle)
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 8,
  },
  replyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
    maxHeight: 64, // Limit to ~3 lines (20px line height * 3 = 60px + 4px padding)
  },
  replyText: {
    fontSize: 14,
  },
  // Regenerate Button (Right)
  regenerateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tone Selection Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toneMenuContainer: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toneMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  toneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  toneOptionEmoji: {
    fontSize: 24,
  },
  toneOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});

