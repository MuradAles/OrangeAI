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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TranslationOptionsModal } from './TranslationOptionsModal';

interface MessageInputProps {
  onSend: (text: string, translationMetadata?: {
    originalText?: string;
    originalLanguage?: string;
    translatedTo?: string;
    sentAsTranslation?: boolean;
  }) => void;
  onSendImage?: (imageUri: string, caption?: string) => void;
  isSending?: boolean;
  placeholder?: string;
  chatId?: string;
  userId?: string;
  userName?: string;
  preferredLanguage?: string; // User's preferred language for translation preview
  showTranslationPreview?: boolean; // Enable/disable real-time translation preview
  initialText?: string; // Initial text (for smart replies)
  onTextChange?: (text: string) => void; // Text change callback
}

type TimeoutId = ReturnType<typeof setTimeout>;

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
  preferredLanguage = 'en',
  showTranslationPreview = false,
  initialText = '',
  onTextChange,
}: MessageInputProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialText);
  const [inputHeight, setInputHeight] = useState(40);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const typingTimeoutRef = useRef<TimeoutId | null>(null);
  const isTypingRef = useRef(false);
  
  // Translation options modal state
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [detectedInputLanguage, setDetectedInputLanguage] = useState<string>('en');
  
  // Language selection state
  const [chatLanguages, setChatLanguages] = useState<string[]>(['en']); // Detected languages in chat
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en'); // Target language for translation
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);

  // Load chat languages on mount - now using detectedLanguages from chat document (instant, no Cloud Function call)
  useEffect(() => {
    const loadChatLanguages = async () => {
      if (!chatId) return;
      
      setIsLoadingLanguages(true);
      try {
        // Get detected languages from chat document (much faster than Cloud Function)
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const { app } = await import('@/services/firebase/FirebaseConfig');
        const db = getFirestore(app);
        
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        const chatData = chatDoc.data();
        
        if (chatData?.detectedLanguages && chatData.detectedLanguages.length > 0) {
          setChatLanguages(chatData.detectedLanguages);
          // Set default to most common language (first in array)
          // But if user's preferred language is in the list, use that
          if (chatData.detectedLanguages.includes(preferredLanguage)) {
            setSelectedLanguage(preferredLanguage);
          } else {
            setSelectedLanguage(chatData.detectedLanguages[0]);
          }
        } else {
          // New chat or no messages yet - use only user's preferred language
          setChatLanguages([preferredLanguage]);
          setSelectedLanguage(preferredLanguage);
        }
      } catch (error) {
        // Fallback to user's preferred language only
        setChatLanguages([preferredLanguage]);
        setSelectedLanguage(preferredLanguage);
      } finally {
        setIsLoadingLanguages(false);
      }
    };
    
    loadChatLanguages();
  }, [chatId, preferredLanguage]);

  // Start typing indicator
  const startTyping = async () => {
    if (!chatId || !userId || !userName || isTypingRef.current) return;
    
    try {
      await PresenceService.startTyping(chatId, userId, userName);
      isTypingRef.current = true;
    } catch (error) {
    }
  };

  // Stop typing indicator
  const stopTyping = async () => {
    if (!chatId || !userId || !isTypingRef.current) return;
    
    try {
      await PresenceService.stopTyping(chatId, userId);
      isTypingRef.current = false;
    } catch (error) {
    }
  };

  // Quick language detection for input text
  const detectInputLanguage = async (textToDetect: string) => {
    if (!textToDetect.trim()) return;
    
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/services/firebase/FirebaseConfig');
      
      const detectFn = httpsCallable(functions, 'quickDetectLanguage');
      const result: any = await detectFn({ text: textToDetect });
      
      if (result.data.language) {
        setDetectedInputLanguage(result.data.language);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Sync with initialText changes from parent (e.g., smart replies)
  useEffect(() => {
    if (initialText !== text) {
      setText(initialText);
    }
  }, [initialText]);

  // Handle text change with typing indicator and translation preview
  const handleTextChange = (newText: string) => {
    setText(newText);
    
    // Notify parent of text change
    if (onTextChange) {
      onTextChange(newText);
    }
    
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
      
      // Detect input language for translation modal
      if (newText.trim().length > 10) {
        detectInputLanguage(newText.trim());
      }
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
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Send original message
  const handleSendOriginal = () => {
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
  
  // Open translation options modal
  const handleOpenTranslationModal = () => {
    if (!text.trim()) return;
    setShowTranslationModal(true);
  };

  // Handle selection from translation modal
  const handleSelectTranslationOption = (selectedText: string) => {
    setText(selectedText);
    setShowTranslationModal(false);
  };
  
  // Backward compatible handleSend (sends original)
  const handleSend = handleSendOriginal;

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

  // Language names map
  const languageNames: Record<string, string> = {
    en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
    it: 'Italiano', pt: 'Português', ru: 'Русский', ja: '日本語',
    ko: '한국어', zh: '中文', ar: 'العربية', hi: 'हिन्दी',
    tr: 'Türkçe', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska',
  };

  // All available languages
  const allLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr', 'nl', 'pl', 'sv'];
  
  // Separate chat languages from other languages
  const otherLanguages = allLanguages.filter(lang => !chatLanguages.includes(lang));

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      paddingBottom: Math.max(insets.bottom, 12),
    }]}>
      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageMenu(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLanguageMenu(false)}>
          <View style={[styles.languageMenuContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.languageMenuTitle, { color: theme.colors.text }]}>
              Translate to:
            </Text>
            <ScrollView style={styles.languageList}>
              {/* Chat Languages Section */}
              {chatLanguages.length > 0 && (
                <>
                  <Text style={[styles.languageSectionTitle, { color: theme.colors.textSecondary }]}>
                    Chat Languages
                  </Text>
                  {chatLanguages.map((lang) => (
                    <Pressable
                      key={lang}
                      style={[
                        styles.languageItem,
                        selectedLanguage === lang && { backgroundColor: theme.colors.primary + '15' }
                      ]}
                      onPress={() => {
                        setSelectedLanguage(lang);
                        setShowLanguageMenu(false);
                      }}
                    >
                      <Text style={[styles.languageCode, { color: theme.colors.text }]}>
                        {lang.toUpperCase()}
                      </Text>
                      <Text style={[styles.languageName, { color: theme.colors.textSecondary }]}>
                        {languageNames[lang] || lang}
                      </Text>
                      {selectedLanguage === lang && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </>
              )}

              {/* Other Languages Section */}
              {otherLanguages.length > 0 && (
                <>
                  <Text style={[styles.languageSectionTitle, { color: theme.colors.textSecondary }]}>
                    Other Languages
                  </Text>
                  {otherLanguages.map((lang) => (
                    <Pressable
                      key={lang}
                      style={[
                        styles.languageItem,
                        selectedLanguage === lang && { backgroundColor: theme.colors.primary + '15' }
                      ]}
                      onPress={() => {
                        setSelectedLanguage(lang);
                        setShowLanguageMenu(false);
                      }}
                    >
                      <Text style={[styles.languageCode, { color: theme.colors.text }]}>
                        {lang.toUpperCase()}
                      </Text>
                      <Text style={[styles.languageName, { color: theme.colors.textSecondary }]}>
                        {languageNames[lang] || lang}
                      </Text>
                      {selectedLanguage === lang && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

    
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

      {/* Input Field */}
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

        {/* Auto-Translate Button */}
        <IconButton
          icon="globe"
          size={24}
          color={text.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary}
          onPress={handleOpenTranslationModal}
          disabled={!text.trim() || isSending}
          style={styles.translateButton}
        />

        {/* Send Button */}
        <IconButton
          icon={isSending ? 'hourglass' : 'send'}
          size={24}
          color={canSend ? theme.colors.primary : theme.colors.textSecondary}
          onPress={handleSendOriginal}
          disabled={!canSend}
          style={styles.sendButton}
        />
      </View>

      {/* Translation Options Modal */}
      <TranslationOptionsModal
        visible={showTranslationModal}
        originalText={text}
        originalLanguage={detectedInputLanguage}
        chatLanguages={chatLanguages}
        onClose={() => setShowTranslationModal(false)}
        onSelectOption={handleSelectTranslationOption}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // Language Selector Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageMenuContainer: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  languageMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  languageSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  languageCode: {
    fontSize: 16,
    fontWeight: '600',
    width: 40,
  },
  languageName: {
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },
  // Language Button (Left in translation row)
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Translation Preview Center
  translationPreviewCenter: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    minHeight: 44,
  },
  // Send Translated Button (Right)
  sendTranslatedButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Translation Preview
  translationPreviewContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  // Translation preview content (inside inputContainer)
  translationPreviewContent: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  // Full width translation preview (replaces inputContainer)
  translationPreviewFullWidth: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 40,
  },
  // Clean translation preview (no headers, just text)
  translationPreviewClean: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 40,
  },
  // Right side buttons container for translation row
  translationButtonsContainer: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  },
  // Action buttons in translation row
  translationActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  // Language text in translation button
  translationLanguageText: {
    fontSize: 10,
    fontWeight: '600',
  },
  translationPreviewHeader: {
    marginBottom: 4,
  },
  translationPreviewLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  translationPreviewText: {
    fontSize: 16,
    lineHeight: 20,
  },
  translationHeader: {
    marginBottom: 6,
  },
  translationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  translationLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detectedLanguage: {
    fontSize: 10,
    marginTop: 2,
  },
  translatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Image Preview
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
  // Counter
  counterContainer: {
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  counter: {
    fontSize: 12,
  },
  // Input Row
  // Row 1: Translation Preview Row
  translationRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
    padding: 8,
    borderRadius: 12,
  },
  // Row 2: Input Field Row
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
  aiButton: {
    marginBottom: 4,
  },
  translateButton: {
    marginBottom: 4,
  },
  sendButton: {
    marginBottom: 4,
  },
  // Send Choice Buttons
  sendButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  sendChoiceButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  sendChoiceButtonPrimary: {
    flexDirection: 'row',
    gap: 4,
  },
  sendChoiceButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sendChoiceButtonTextWhite: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

