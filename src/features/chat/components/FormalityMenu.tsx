/**
 * FormalityMenu Component
 * 
 * Modal for selecting message tone/formality
 * Shows suggested tone based on chat context
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface FormalityMenuProps {
  visible: boolean;
  originalMessage: string;
  chatId?: string;
  suggestedTone?: string;
  onClose: () => void;
  onApply: (adjustedMessage: string, tone: string) => void;
}

interface FormalityOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const FORMALITY_OPTIONS: FormalityOption[] = [
  { id: 'casual', label: 'Casual', icon: '😊', description: 'Relaxed, friendly tone' },
  { id: 'formal', label: 'Formal', icon: '👔', description: 'Professional, respectful tone' },
  { id: 'professional', label: 'Professional', icon: '💼', description: 'Business-appropriate tone' },
  { id: 'friendly', label: 'Friendly', icon: '🤝', description: 'Warm, approachable tone' },
  { id: 'custom', label: 'Custom', icon: '✏️', description: 'Your own instruction' },
];

export const FormalityMenu: React.FC<FormalityMenuProps> = ({
  visible,
  originalMessage,
  chatId,
  suggestedTone,
  onClose,
  onApply,
}) => {
  const theme = useTheme();
  const [selectedTone, setSelectedTone] = useState<string>(suggestedTone || 'casual');
  const [customInstruction, setCustomInstruction] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');

  // Auto-generate preview when modal opens with suggested tone
  React.useEffect(() => {
    if (visible && !preview && selectedTone && selectedTone !== 'custom') {
      generatePreview(selectedTone);
    }
    
    // Reset state when modal closes
    if (!visible) {
      setPreview('');
      setCustomInstruction('');
      setShowCustomInput(false);
      setSelectedTone(suggestedTone || 'casual');
    }
  }, [visible]);

  const handleSelectTone = async (toneId: string) => {
    setSelectedTone(toneId);

    if (toneId === 'custom') {
      setShowCustomInput(true);
      setPreview('');
      return;
    }

    setShowCustomInput(false);
    // Generate preview
    await generatePreview(toneId);
  };

  const handleCustomApply = async () => {
    if (!customInstruction.trim()) return;
    await generatePreview('custom', customInstruction);
  };

  const generatePreview = async (tone: string, instruction?: string) => {
    setIsLoading(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/services/firebase/FirebaseConfig');

      const adjustFn = httpsCallable(functions, 'adjustFormality');
      const result: any = await adjustFn({
        messageText: originalMessage,
        formalityLevel: tone,
        chatId: chatId,
        customInstruction: instruction,
      });

      if (result.data.success) {
        setPreview(result.data.adjustedMessage);
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      setPreview('Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAndClose = () => {
    if (preview) {
      onApply(preview, selectedTone);
      onClose();
      // Reset state
      setPreview('');
      setCustomInstruction('');
      setShowCustomInput(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              📝 Adjust Tone
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Suggested Tone Badge */}
          {suggestedTone && (
            <View style={[styles.suggestionBadge, { backgroundColor: theme.colors.primary + '15' }]}>
              <Ionicons name="bulb" size={16} color={theme.colors.primary} />
              <Text style={[styles.suggestionText, { color: theme.colors.primary }]}>
                Suggested: {FORMALITY_OPTIONS.find(o => o.id === suggestedTone)?.label || suggestedTone}
              </Text>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Formality Options */}
            <View style={styles.optionsContainer}>
              {FORMALITY_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: selectedTone === option.id 
                        ? theme.colors.primary + '15' 
                        : theme.colors.backgroundInput,
                      borderColor: selectedTone === option.id 
                        ? theme.colors.primary 
                        : theme.colors.border,
                    }
                  ]}
                  onPress={() => handleSelectTone(option.id)}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  {selectedTone === option.id && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Custom Instruction Input */}
            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={[styles.customInput, { 
                    backgroundColor: theme.colors.backgroundInput,
                    color: theme.colors.text,
                  }]}
                  placeholder="e.g., Make it sound like a lawyer..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={customInstruction}
                  onChangeText={setCustomInstruction}
                  multiline
                  numberOfLines={3}
                />
                <Pressable
                  style={[styles.customApplyButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleCustomApply}
                  disabled={!customInstruction.trim() || isLoading}
                >
                  <Text style={styles.customApplyButtonText}>Generate Preview</Text>
                </Pressable>
              </View>
            )}

            {/* Preview */}
            {isLoading ? (
              <View style={styles.previewContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
                  Generating preview...
                </Text>
              </View>
            ) : preview ? (
              <View style={[styles.previewContainer, { backgroundColor: theme.colors.backgroundInput }]}>
                <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
                  Preview:
                </Text>
                <Text style={[styles.previewText, { color: theme.colors.text }]}>
                  {preview}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.colors.backgroundInput }]}
              onPress={onClose}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.actionButtonPrimary, { 
                backgroundColor: theme.colors.primary,
                opacity: preview ? 1 : 0.5,
              }]}
              onPress={handleApplyAndClose}
              disabled={!preview}
            >
              <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>
                Use This Version
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  customInputContainer: {
    marginBottom: 16,
  },
  customInput: {
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  customApplyButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  customApplyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    // Primary button styles
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonTextWhite: {
    color: '#fff',
  },
});

