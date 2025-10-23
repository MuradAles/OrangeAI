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
import { PresenceService } from '@/services/firebase';
import { useTheme } from '@/shared/hooks/useTheme';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MessageInputProps {
  onSend: (text: string) => void;
  onSendImage?: (imageUri: string, caption?: string) => void;
  isSending?: boolean;
  placeholder?: string;
  chatId?: string;
  userId?: string;
  userName?: string;
}

const MAX_LENGTH = 4096;
const SHOW_COUNTER_AT = 3900;
const TYPING_TIMEOUT = 3000; // Stop typing indicator after 3 seconds

export const MessageInput = ({
  onSend,
  onSendImage,
  isSending = false,
  placeholder = 'Type a message...',
  chatId,
  userId,
  userName,
}: MessageInputProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Start typing indicator
  const startTyping = async () => {
    if (!chatId || !userId || !userName || isTypingRef.current) return;
    
    try {
      await PresenceService.startTyping(chatId, userId, userName);
      isTypingRef.current = true;
    } catch (error) {
      console.error('Failed to start typing indicator:', error);
    }
  };

  // Stop typing indicator
  const stopTyping = async () => {
    if (!chatId || !userId || !isTypingRef.current) return;
    
    try {
      await PresenceService.stopTyping(chatId, userId);
      isTypingRef.current = false;
    } catch (error) {
      console.error('Failed to stop typing indicator:', error);
    }
  };

  // Handle text change with typing indicator
  const handleTextChange = (newText: string) => {
    setText(newText);
    
    // Only send typing indicator if user is actually typing
    if (newText.length > 0) {
      // Start typing indicator if not already typing
      if (!isTypingRef.current) {
        startTyping();
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, TYPING_TIMEOUT);
    } else {
      // Empty input - stop typing immediately
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    }
  };

  // Handle image picker
  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to send images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1, // We'll compress it later
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Handle send message (text or image with caption)
  const handleSend = () => {
    if (isSending) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping();

    if (selectedImage && onSendImage) {
      // Send image with optional caption
      const caption = text.trim();
      onSendImage(selectedImage, caption || undefined);
      setSelectedImage(null);
      setText('');
      setInputHeight(40);
    } else if (text.trim().length > 0) {
      // Send text message
      onSend(text.trim());
      setText('');
      setInputHeight(40);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && chatId && userId) {
        PresenceService.stopTyping(chatId, userId).catch(console.error);
      }
    };
  }, [chatId, userId]);

  const showCounter = text.length >= SHOW_COUNTER_AT;
  const isAtLimit = text.length >= MAX_LENGTH;
  const canSend = (text.trim().length > 0 || selectedImage) && !isSending;

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      paddingBottom: Math.max(insets.bottom, 12), // Use safe area insets for proper keyboard handling
    }]}>
      {/* Selected Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <Pressable
            style={[styles.removeImageButton, { backgroundColor: theme.colors.error }]}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.removeImageText}>✕</Text>
          </Pressable>
        </View>
      )}

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
        {/* Image Picker Button */}
        <IconButton
          icon="image"
          size={24}
          color={theme.colors.primary}
          onPress={handlePickImage}
          disabled={isSending}
          style={styles.imageButton}
        />

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
            onChangeText={handleTextChange}
            placeholder={selectedImage ? 'Add a caption (optional)...' : placeholder}
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
          color={canSend ? theme.colors.primary : theme.colors.textSecondary}
          onPress={handleSend}
          disabled={!canSend}
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
    // paddingBottom now handled dynamically with useSafeAreaInsets in the component
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  imageButton: {
    marginBottom: 4,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    minHeight: 40,
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

