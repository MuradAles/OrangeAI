/**
 * MessageInput - Chat message input component
 * 
 * Features:
 * - Multiline text input
 * - Character counter (shows at 3,900 chars)
 * - Character limit (4,096 chars)
 * - Send button with loading state
 * - Auto-grow height
 */

import { IconButton } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface MessageInputProps {
  onSend: (text: string) => void;
  isSending?: boolean;
  placeholder?: string;
}

const MAX_LENGTH = 4096;
const SHOW_COUNTER_AT = 3900;

export const MessageInput = ({
  onSend,
  isSending = false,
  placeholder = 'Type a message...',
}: MessageInputProps) => {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);

  const handleSend = () => {
    const trimmedText = text.trim();
    if (trimmedText.length > 0 && !isSending) {
      onSend(trimmedText);
      setText('');
      setInputHeight(40);
    }
  };

  const showCounter = text.length >= SHOW_COUNTER_AT;
  const isAtLimit = text.length >= MAX_LENGTH;

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border 
    }]}>
      {/* Character Counter */}
      {showCounter && (
        <View style={styles.counterContainer}>
          <Text style={[
            styles.counter, 
            { color: isAtLimit ? theme.colors.error : theme.colors.textSecondary }
          ]}>
            {text.length}/{MAX_LENGTH}
          </Text>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* Text Input */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.backgroundInput }]}>
          <TextInput
            style={[
              styles.input,
              { 
                color: theme.colors.text,
                height: Math.max(40, Math.min(inputHeight, 120))
              },
              theme.typography.body,
            ]}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={MAX_LENGTH}
            onContentSizeChange={(e) => {
              setInputHeight(e.nativeEvent.contentSize.height);
            }}
            editable={!isSending}
          />
        </View>

        {/* Send Button */}
        <IconButton
          icon={isSending ? 'hourglass' : 'send'}
          size={24}
          color={text.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary}
          onPress={handleSend}
          disabled={text.trim().length === 0 || isSending}
          style={styles.sendButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32, // 20px + 12px = 32px total padding at bottom
  },
  counterContainer: {
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  counter: {
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  input: {
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    marginBottom: 4,
  },
});

